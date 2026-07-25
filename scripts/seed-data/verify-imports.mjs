#!/usr/bin/env node
// scripts/seed-data/verify-imports.mjs
//
// Fetches record counts and one sample contact from each CRM lab account and asserts the
// dataset invariant that matters most for a public recording: every contact email reads as
// @<slug>.example.com. Run after both import-hubspot.mjs and import-salesforce.mjs have
// completed.
//
//   npm run verify:imports
//
// HubSpot auth comes from HUBSPOT_PRIVATE_APP_TOKEN (via node --env-file-if-exists=.env — see
// import-hubspot.mjs). Salesforce auth comes from the already-authenticated `sf` CLI session
// (see import-salesforce.mjs); override the org with `--org <alias>` or SF_TARGET_ORG.

import { execFileSync } from 'node:child_process';

const EXAMPLE_EMAIL_RE = /@[a-z0-9-]+\.example\.com$/i;

const API_BASE = 'https://api.hubapi.com';
const API_VERSION = '2026-03';
const TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

const orgArgIndex = process.argv.indexOf('--org');
const TARGET_ORG = orgArgIndex !== -1 ? process.argv[orgArgIndex + 1] : process.env.SF_TARGET_ORG || null;

let failures = 0;

function reportPass(label) {
  console.log(`  PASS: ${label}`);
}
function reportFail(label, detail) {
  failures += 1;
  console.error(`  FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
}

async function hubspotSearch(objectType, properties) {
  const res = await fetch(`${API_BASE}/crm/objects/${API_VERSION}/${objectType}/search`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit: 1, properties }),
  });
  if (!res.ok) {
    throw new Error(`HubSpot ${objectType} search failed: HTTP ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function verifyHubSpot() {
  console.log('\nHubSpot ("Vieira GTM Lab"):');
  if (!TOKEN) {
    reportFail('HubSpot verification', 'HUBSPOT_PRIVATE_APP_TOKEN not set — run via npm run verify:imports');
    return;
  }
  try {
    const companies = await hubspotSearch('companies', ['domain', 'name']);
    console.log(`  Companies: ${companies.total} total`);
    if (companies.total >= 40) reportPass('company count >= 40');
    else reportFail('company count >= 40', `got ${companies.total}`);

    const contacts = await hubspotSearch('contacts', ['email', 'firstname', 'lastname']);
    console.log(`  Contacts: ${contacts.total} total`);
    if (contacts.total >= 80) reportPass('contact count >= 80');
    else reportFail('contact count >= 80', `got ${contacts.total}`);

    const sampleEmail = contacts.results?.[0]?.properties?.email;
    console.log(`  Sample contact email: ${sampleEmail}`);
    if (sampleEmail && EXAMPLE_EMAIL_RE.test(sampleEmail)) {
      reportPass('sample contact email is @*.example.com');
    } else {
      reportFail('sample contact email is @*.example.com', `got ${sampleEmail}`);
    }
  } catch (err) {
    reportFail('HubSpot verification', err.message);
  }
}

function sfJson(args) {
  const fullArgs = TARGET_ORG ? [...args, '--target-org', TARGET_ORG] : args;
  const out = execFileSync('sf', [...fullArgs, '--json'], { encoding: 'utf8' });
  return JSON.parse(out);
}

function verifySalesforce() {
  console.log('\nSalesforce (Dev Edition lab org):');
  try {
    const accountCount = sfJson([
      'data',
      'query',
      '--query',
      "SELECT COUNT(Id) total FROM Account WHERE Website LIKE '%.example.com'",
    ]);
    const accTotal = accountCount.result?.records?.[0]?.total ?? 0;
    console.log(`  Accounts: ${accTotal} total (scoped to *.example.com)`);
    if (accTotal >= 40) reportPass('account count >= 40');
    else reportFail('account count >= 40', `got ${accTotal}`);

    const contactCount = sfJson([
      'data',
      'query',
      '--query',
      "SELECT COUNT(Id) total FROM Contact WHERE Email LIKE '%.example.com'",
    ]);
    const conTotal = contactCount.result?.records?.[0]?.total ?? 0;
    console.log(`  Contacts: ${conTotal} total (scoped to *.example.com)`);
    if (conTotal >= 80) reportPass('contact count >= 80');
    else reportFail('contact count >= 80', `got ${conTotal}`);

    const sample = sfJson([
      'data',
      'query',
      '--query',
      "SELECT Email FROM Contact WHERE Email LIKE '%.example.com' LIMIT 1",
    ]);
    const sampleEmail = sample.result?.records?.[0]?.Email;
    console.log(`  Sample contact email: ${sampleEmail}`);
    if (sampleEmail && EXAMPLE_EMAIL_RE.test(sampleEmail)) {
      reportPass('sample contact email is @*.example.com');
    } else {
      reportFail('sample contact email is @*.example.com', `got ${sampleEmail}`);
    }
  } catch (err) {
    reportFail('Salesforce verification', err.message);
  }
}

async function main() {
  await verifyHubSpot();
  verifySalesforce();

  console.log(`\n${failures === 0 ? 'VERIFY_OK' : 'VERIFY_FAILED'} (${failures} failure${failures === 1 ? '' : 's'})`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
