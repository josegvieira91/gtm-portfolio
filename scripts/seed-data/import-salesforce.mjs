#!/usr/bin/env node
// scripts/seed-data/import-salesforce.mjs
//
// Loads the synthetic seed dataset (scripts/seed-data/output/{companies,contacts}.csv) into
// the Salesforce Developer Edition lab org as Accounts and Contacts, via the Salesforce CLI's
// Bulk API 2.0 commands (`sf data import bulk`). Prints Setup > Storage Usage (DataStorageMB)
// before and after the import.
//
// Deliberately does NOT touch usage-events.csv — see README.md.
//
// Prerequisite (one-time, human step — see the plan checkpoint):
//   npm install -g @salesforce/cli   (or: brew install sf)
//   sf org login web --alias gtm-lab --set-default
// After that, this script needs no credentials of its own; it drives the already-authenticated
// `sf` CLI session. Override the target org with `--org <alias>` or SF_TARGET_ORG if you didn't
// log in with --set-default.
//
//   npm run import:salesforce
//   npm run import:salesforce -- --org gtm-lab
//
// Idempotency note: the standard Account/Contact objects have no built-in "external ID" field
// pointed at Website/Email (Salesforce's upsert commands require a custom field marked as an
// External ID, which means a Setup/metadata change — out of scope for a portfolio lab seed
// script), so `sf data upsert bulk` isn't usable out of the box the way HubSpot's batch/upsert
// is. Idempotency is instead handled at the script level: before importing, it queries existing
// Accounts/Contacts scoped to *.example.com and skips any row whose domain/email already
// exists, so re-running after a re-seed only inserts the delta.
//
// Verified live against developer.salesforce.com's Salesforce CLI Command Reference on
// 2026-07-24: `sf data import bulk`, `sf data bulk results`, `sf data query`, and
// `sf org list limits` (wraps the REST Limits resource — /services/data/vXX.X/limits —
// DataStorageMB is one of the entries it returns) all exist in the current CLI and take the
// flags used below.
//
// KNOWN RISK (cannot be verified without a live org — see the plan checkpoint): the exact JSON
// key names `sf data bulk results --json` uses for the success/failed result file paths were
// not confirmed against live output. findCsvPath() below searches the result object for any
// string value ending in .csv under a key containing "success"/"fail" rather than hard-coding
// one key name, so a naming difference degrades gracefully into a clear console dump instead of
// a silent wrong answer — but if it doesn't find them, check `--json` output by hand.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, isAbsolute } from 'node:path';
import { parseCsv, writeCsv } from './lib/csv.mjs';
import { INDUSTRY_TO_SALESFORCE, mapIndustry } from './lib/industry-map.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');

const orgArgIndex = process.argv.indexOf('--org');
const TARGET_ORG = orgArgIndex !== -1 ? process.argv[orgArgIndex + 1] : process.env.SF_TARGET_ORG || null;

function fail(message) {
  console.error(`\nERROR: ${message}\n`);
  process.exit(1);
}

function sfArgs(args) {
  return TARGET_ORG ? [...args, '--target-org', TARGET_ORG] : args;
}

function sfJson(args, execOptions = {}) {
  const out = execFileSync('sf', [...sfArgs(args), '--json'], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    ...execOptions,
  });
  return JSON.parse(out);
}

function checkSfInstalled() {
  try {
    execFileSync('sf', ['--version'], { encoding: 'utf8' });
  } catch {
    fail(
      'The Salesforce CLI ("sf") is not installed or not on PATH.\n' +
        '  Install it: npm install -g @salesforce/cli   (or: brew install sf)\n' +
        '  Then log in: sf org login web --alias gtm-lab --set-default\n' +
        '  Then re-run: npm run import:salesforce'
    );
  }
}

function checkOrgAuthenticated() {
  try {
    sfJson(['org', 'display']);
  } catch (err) {
    fail(
      'No authenticated Salesforce org found' +
        (TARGET_ORG ? ` for alias "${TARGET_ORG}"` : '') +
        '.\n' +
        '  Log in: sf org login web --alias gtm-lab --set-default\n' +
        '  Then re-run: npm run import:salesforce\n' +
        `  (${err.message?.split('\n')[0] || err})`
    );
  }
}

function readCsvOrFail(filename) {
  const path = join(OUTPUT_DIR, filename);
  if (!existsSync(path)) {
    fail(`${path} is missing. Run "npm run seed:generate" first.`);
  }
  return parseCsv(readFileSync(path, 'utf8'));
}

function printStorage(label) {
  let limits;
  try {
    limits = sfJson(['org', 'list', 'limits']);
  } catch (err) {
    console.log(`  (could not fetch limits: ${err.message?.split('\n')[0] || err})`);
    return null;
  }
  const rows = Array.isArray(limits.result) ? limits.result : [];
  const storage = rows.find((r) => String(r.name || r.Name || '').toLowerCase() === 'datastoragemb');
  if (storage) {
    const remaining = storage.remaining ?? storage.Remaining;
    const max = storage.max ?? storage.Max;
    console.log(`  ${label} storage: ${remaining} MB remaining of ${max} MB (DataStorageMB)`);
  } else {
    console.log(`  ${label} storage: DataStorageMB not found in "sf org list limits" output; raw result:`);
    console.log(`  ${JSON.stringify(rows).slice(0, 500)}`);
  }
  return storage;
}

function queryExisting(soql, keyField) {
  let result;
  try {
    result = sfJson(['data', 'query', '--query', soql]);
  } catch (err) {
    fail(`SOQL query failed: ${soql}\n  ${err.message}`);
  }
  const records = result.result?.records || [];
  const map = new Map();
  for (const rec of records) {
    if (rec[keyField]) map.set(rec[keyField], rec.Id);
  }
  return map;
}

// Defensive lookup for the success/failed result CSV paths in `sf data bulk results --json`
// output — see the KNOWN RISK note at the top of this file.
function findCsvPath(obj, patterns) {
  if (!obj || typeof obj !== 'object') return null;
  for (const [key, value] of Object.entries(obj)) {
    if (
      typeof value === 'string' &&
      value.endsWith('.csv') &&
      patterns.some((p) => key.toLowerCase().includes(p))
    ) {
      return value;
    }
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') {
      const found = findCsvPath(value, patterns);
      if (found) return found;
    }
  }
  return null;
}

function runBulkImport(sobject, rows, headers) {
  if (rows.length === 0) {
    return { successIds: new Map(), errors: [] };
  }
  const dir = mkdtempSync(join(tmpdir(), 'gtm-sf-import-'));
  const filePath = join(dir, `${sobject}.csv`);
  writeFileSync(filePath, writeCsv(headers, rows), 'utf8');

  let importResult;
  try {
    importResult = sfJson([
      'data',
      'import',
      'bulk',
      '--sobject',
      sobject,
      '--file',
      filePath,
      '--wait',
      '10',
    ]);
  } catch (err) {
    console.error(`  ${sobject} bulk import failed to start/complete: ${err.message}`);
    rmSync(dir, { recursive: true, force: true });
    return { successIds: new Map(), errors: rows };
  }

  const jobId = importResult.result?.jobId || importResult.result?.id;
  if (!jobId) {
    console.error(`  Could not determine job ID from import result: ${JSON.stringify(importResult.result)}`);
    rmSync(dir, { recursive: true, force: true });
    return { successIds: new Map(), errors: rows };
  }

  let resultsInfo;
  try {
    // `sf data bulk results` has no --output-dir flag — it always writes its success/failed
    // record CSVs into the process's current working directory. Discovered during the live
    // import run on 2026-07-25: without this `cwd` override, that meant the project root, which
    // left untracked "<jobId>-success-records.csv" files sitting in the repo. Running it with
    // cwd set to our own tmpdir (already cleaned up via rmSync below) keeps the repo clean.
    resultsInfo = sfJson(['data', 'bulk', 'results', '--job-id', jobId], { cwd: dir });
  } catch (err) {
    console.error(`  Could not fetch bulk results for job ${jobId}: ${err.message}`);
    rmSync(dir, { recursive: true, force: true });
    return { successIds: new Map(), errors: rows };
  }

  // `sf data bulk results --json` returns the result file paths as filenames RELATIVE to the
  // subprocess's cwd (confirmed live 2026-07-25 — the field is `successFilePath` /
  // `failedFilePath`, holding e.g. "<jobId>-success-records.csv", not an absolute path). Since
  // that subprocess ran with cwd: dir (see above), resolve against `dir` here too — using the
  // raw string as-is would resolve against this parent process's own cwd instead and silently
  // fail the existsSync check.
  const resolveResultPath = (p) => (p && !isAbsolute(p) ? join(dir, p) : p);
  const successFile = resolveResultPath(findCsvPath(resultsInfo.result, ['success']));
  const failedFile = resolveResultPath(findCsvPath(resultsInfo.result, ['fail']));

  const successIds = new Map(); // matchKey (Website or Email) -> Salesforce Id
  let successCount = 0;
  if (successFile && existsSync(successFile)) {
    const successRows = parseCsv(readFileSync(successFile, 'utf8'));
    for (const row of successRows) {
      const matchKey = row.Website || row.Email;
      if (matchKey && row.sf__Id) successIds.set(matchKey, row.sf__Id);
      successCount += 1;
    }
  } else {
    console.log(`  Could not locate a success result file in job ${jobId} output — raw result:`);
    console.log(`  ${JSON.stringify(resultsInfo.result).slice(0, 500)}`);
  }

  let errorRows = [];
  if (failedFile && existsSync(failedFile)) {
    errorRows = parseCsv(readFileSync(failedFile, 'utf8'));
  }

  console.log(`  ${sobject}: ${successCount} succeeded, ${errorRows.length} failed (job ${jobId})`);
  if (errorRows.length) {
    console.log(`  First error: ${JSON.stringify(errorRows[0]).slice(0, 300)}`);
  }

  rmSync(dir, { recursive: true, force: true });
  return { successIds, errors: errorRows };
}

function main() {
  checkSfInstalled();
  checkOrgAuthenticated();

  const companies = readCsvOrFail('companies.csv');
  const contacts = readCsvOrFail('contacts.csv');

  console.log(
    `Importing ${companies.length} companies and ${contacts.length} contacts into the Salesforce Dev Edition lab org.`
  );
  console.log(
    'Skipping usage-events.csv by design — it belongs to the Phase 3 reporting cases, not a CRM object.\n'
  );

  console.log('Storage before import:');
  const before = printStorage('Before');

  console.log('\nChecking for already-imported records (idempotency, scoped to *.example.com)...');
  const existingAccounts = queryExisting(
    "SELECT Id, Website FROM Account WHERE Website LIKE '%.example.com'",
    'Website'
  );
  const existingContacts = queryExisting(
    "SELECT Id, Email FROM Contact WHERE Email LIKE '%.example.com'",
    'Email'
  );
  console.log(
    `  ${existingAccounts.size} accounts and ${existingContacts.size} contacts already present — will be skipped.`
  );

  const newCompanies = companies.filter((c) => !existingAccounts.has(c.domain));
  console.log(
    `\nImporting ${newCompanies.length} new Accounts (${companies.length - newCompanies.length} skipped as already present)...`
  );
  const accountRows = newCompanies.map((c) => ({
    Name: c.name,
    Website: c.domain,
    // Account.Industry is a standard Salesforce picklist. It's unrestricted (confirmed via
    // `sf sobject describe --sobject Account`), so arbitrary text would be silently accepted
    // rather than rejected — but the generator's free-text vocabulary ("Healthcare Technology")
    // doesn't match any of the org's real picklist values, which would look wrong in the UI on
    // camera. Mapped to the closest real value the same way import-hubspot.mjs maps to its own
    // enum, since HubSpot's field IS restricted and caught this during the live import run.
    Industry: mapIndustry(INDUSTRY_TO_SALESFORCE, c.industry, 'Salesforce'),
    NumberOfEmployees: c.employee_count,
    BillingCountry: c.country,
  }));
  const accountImport = runBulkImport('Account', accountRows, [
    'Name',
    'Website',
    'Industry',
    'NumberOfEmployees',
    'BillingCountry',
  ]);

  // Merge pre-existing + newly created so contacts can resolve an AccountId regardless of
  // whether their company was already in the org before this run.
  const accountIdByDomain = new Map([...existingAccounts, ...accountImport.successIds]);

  const newContacts = contacts.filter((c) => !existingContacts.has(c.email));
  console.log(
    `\nImporting ${newContacts.length} new Contacts (${contacts.length - newContacts.length} skipped as already present)...`
  );
  const skippedNoAccount = [];
  const contactRows = [];
  for (const c of newContacts) {
    const accountId = accountIdByDomain.get(c.company_domain);
    if (!accountId) {
      skippedNoAccount.push(c.email);
      continue;
    }
    contactRows.push({
      FirstName: c.first_name,
      LastName: c.last_name,
      Email: c.email,
      Title: c.job_title,
      AccountId: accountId,
    });
  }
  if (skippedNoAccount.length) {
    console.log(
      `  ${skippedNoAccount.length} contacts skipped — their company's Account could not be resolved: ${skippedNoAccount
        .slice(0, 5)
        .join(', ')}${skippedNoAccount.length > 5 ? ', ...' : ''}`
    );
  }
  const contactImport = runBulkImport('Contact', contactRows, [
    'FirstName',
    'LastName',
    'Email',
    'Title',
    'AccountId',
  ]);

  console.log('\nStorage after import:');
  const after = printStorage('After');
  if (before && after) {
    const maxMb = Number(before.max ?? before.Max);
    const remainingAfter = Number(after.remaining ?? after.Remaining);
    if (maxMb > 0) {
      const usedPct = ((maxMb - remainingAfter) / maxMb) * 100;
      console.log(`  Used: ${usedPct.toFixed(1)}% of ${maxMb} MB`);
      if (usedPct > 40) {
        console.log(
          '  FLAG: storage usage exceeds 40% of the org limit — treat as a Case 7 dataset-size constraint per the plan.'
        );
      }
    }
  }

  console.log('\nSummary:');
  console.log(
    `  Accounts: ${accountImport.successIds.size} created, ${existingAccounts.size} pre-existing (skipped), ${accountImport.errors.length} errors`
  );
  console.log(
    `  Contacts: ${contactImport.successIds.size} created, ${existingContacts.size} pre-existing (skipped), ${contactImport.errors.length} errors, ${skippedNoAccount.length} skipped (no account)`
  );

  const hadErrors = accountImport.errors.length || contactImport.errors.length || skippedNoAccount.length;
  if (hadErrors) {
    console.error('\nCompleted with errors — see output above.');
    process.exit(1);
  }
  console.log('\nSalesforce import complete. Run "npm run verify:imports" to confirm.');
}

main();
