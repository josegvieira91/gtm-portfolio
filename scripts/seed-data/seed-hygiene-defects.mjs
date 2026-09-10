#!/usr/bin/env node
/**
 * scripts/seed-data/seed-hygiene-defects.mjs
 *
 * Case 4 (CRM Hygiene Engine) needs a dirty CRM to sweep, and the seed dataset in
 * scripts/seed-data/ is clean by construction: 40 companies with canonical domains and
 * countries, 80 contacts each associated with exactly one company, no duplicates.
 * A hygiene sweep against that portal has nothing to do, so every number the case page
 * publishes would be zero.
 *
 * This script introduces a known, counted set of defects so the sweep has real work and
 * every published number has a stated denominator. It is deliberately committed: a
 * reviewer reading the case page can see exactly what was broken on purpose and compare
 * it against what the sweep reported.
 *
 * Usage:
 *   node scripts/seed-data/seed-hygiene-defects.mjs --report
 *   node scripts/seed-data/seed-hygiene-defects.mjs --seed
 *
 * --report prints the current defect census (what the sweep would find right now).
 * --seed introduces any missing defect from the table below; it is safe to re-run.
 *
 * Requires HUBSPOT_PRIVATE_APP_TOKEN in the repo's gitignored .env. Touches only records
 * whose domain or email is under example.com, so HubSpot's own demo records are never
 * modified.
 *
 * Defect table (the denominators):
 *   3 companies with a non-canonical country  ("USA", "U.S.A.", "canada")
 *   2 companies with a www. prefixed domain
 *   4 duplicate company records sharing an existing company's domain
 *     (the fourth carries a www. prefix, so it only collides once the domain is normalized)
 *   5 contacts with an abbreviated or whitespace-damaged job title
 *   3 contacts with their company association removed  (orphan contacts)
 *   2 new companies with no contacts                   (orphan companies)
 *   3 contacts with no email address, associated to a real company, whose names shadow an
 *     existing contact  (review queue: HubSpot enforces email uniqueness, so an exact
 *     duplicate contact cannot exist, and a nameless-key record cannot be merged by rule)
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');
const ENV_PATH = path.join(REPO_ROOT, '.env');

function loadToken() {
  if (process.env.HUBSPOT_PRIVATE_APP_TOKEN) return process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!fs.existsSync(ENV_PATH)) {
    console.error('No HUBSPOT_PRIVATE_APP_TOKEN in the environment and no .env file found.');
    process.exit(2);
  }
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const m = line.match(/^HUBSPOT_PRIVATE_APP_TOKEN=(.*)$/);
    if (m) return m[1].replace(/^["']|["']$/g, '').trim();
  }
  console.error('HUBSPOT_PRIVATE_APP_TOKEN not found in .env.');
  process.exit(2);
}

const TOKEN = loadToken();
const BASE = 'https://api.hubapi.com';

// HubSpot private apps allow 100 requests per 10 seconds. Everything below runs
// sequentially with a small pause, which keeps this an order of magnitude under the cap.
const PAUSE_MS = 120;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function hs(method, urlPath, body) {
  await sleep(PAUSE_MS);
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* empty body on 204 */
  }
  if (!res.ok) {
    throw new Error(`${method} ${urlPath} -> ${res.status} ${text.slice(0, 400)}`);
  }
  return json;
}

const LAB_COMPANY_SCOPE = { propertyName: 'domain', operator: 'CONTAINS_TOKEN', value: '*example.com' };
const LAB_CONTACT_SCOPE = { propertyName: 'email', operator: 'CONTAINS_TOKEN', value: '*example.com' };

const CANONICAL_COUNTRIES = ['Canada', 'United States'];
// HubSpot's CRM search compares strings case-insensitively, so a value that differs from a
// canonical one only by case ("canada" against "Canada") is invisible to a NOT_IN filter, and a
// search-driven scan can never find it. Every variant below differs by more than case.
const DIRTY_COUNTRIES = ['USA', 'U.S.A.', 'CAN'];
const DIRTY_TITLES = [
  'VP  of Revenue Operations',
  'Sr. Sales Engineer',
  'Sales Ops Mgr.',
  'Dir. of Demand Generation',
  '  VP   Marketing  ',
];
const ORPHAN_COMPANIES = [
  { name: 'Orphan Holdings', domain: 'orphan-holdings.example.com', country: 'Canada' },
  { name: 'Orphan Ventures', domain: 'orphan-ventures.example.com', country: 'United States' },
];
const DUPLICATE_SUFFIXES = [' Inc.', ' Ltd', ' Group', ' Holdings'];

async function listAll(object, properties, extra = '') {
  const out = [];
  let after;
  do {
    const qs = new URLSearchParams({ limit: '100', properties: properties.join(','), archived: 'false' });
    if (after) qs.set('after', after);
    const page = await hs('GET', `/crm/v3/objects/${object}?${qs}${extra}`);
    out.push(...page.results);
    after = page.paging?.next?.after;
  } while (after);
  return out;
}

async function search(object, filterGroups, properties, limit = 100) {
  return hs('POST', `/crm/v3/objects/${object}/search`, { limit, properties, filterGroups });
}

async function census() {
  const labCompanies = await search('companies', [{ filters: [LAB_COMPANY_SCOPE] }], ['name', 'domain', 'country']);
  const badCountry = await search(
    'companies',
    [{ filters: [LAB_COMPANY_SCOPE, { propertyName: 'country', operator: 'HAS_PROPERTY' }, { propertyName: 'country', operator: 'NOT_IN', values: CANONICAL_COUNTRIES }] }],
    ['name', 'domain', 'country']
  );
  const prefixedDomain = await search(
    'companies',
    [{ filters: [LAB_COMPANY_SCOPE, { propertyName: 'domain', operator: 'CONTAINS_TOKEN', value: 'www*' }] }],
    ['name', 'domain']
  );
  const titleFilters = ['vp', 'sr', 'mgr', 'dir'].map((tok) => ({
    filters: [{ propertyName: 'jobtitle', operator: 'CONTAINS_TOKEN', value: tok }],
  }));
  const badTitles = await search('contacts', titleFilters, ['email', 'jobtitle']);
  const orphanContacts = await search(
    'contacts',
    [{ filters: [LAB_CONTACT_SCOPE, { propertyName: 'associatedcompanyid', operator: 'NOT_HAS_PROPERTY' }] }],
    ['email', 'firstname', 'lastname']
  );
  const orphanCompanies = await search(
    'companies',
    [{ filters: [LAB_COMPANY_SCOPE, { propertyName: 'num_associated_contacts', operator: 'EQ', value: '0' }] }],
    ['name', 'domain']
  );
  const noEmail = await search(
    'contacts',
    [{ filters: [{ propertyName: 'email', operator: 'NOT_HAS_PROPERTY' }] }],
    ['firstname', 'lastname', 'jobtitle']
  );

  // Duplicate companies: exact match on the canonical domain (lowercased, www. stripped).
  const canonical = (d) => {
    const lower = String(d || '').toLowerCase();
    return lower.startsWith('www.') ? lower.slice(4) : lower;
  };
  const groups = new Map();
  for (const c of labCompanies.results) {
    const key = canonical(c.properties.domain);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  const dupGroups = [...groups.entries()].filter(([, v]) => v.length > 1);
  const dupLosers = dupGroups.reduce((n, [, v]) => n + v.length - 1, 0);

  return {
    labCompanies: labCompanies.total,
    badCountry: { total: badCountry.total, values: badCountry.results.map((r) => r.properties.country) },
    prefixedDomain: { total: prefixedDomain.total, values: prefixedDomain.results.map((r) => r.properties.domain) },
    badTitles: { total: badTitles.total, values: badTitles.results.map((r) => r.properties.jobtitle) },
    orphanContacts: orphanContacts.total,
    orphanCompanies: { total: orphanCompanies.total, values: orphanCompanies.results.map((r) => r.properties.domain) },
    noEmail: { total: noEmail.total, values: noEmail.results.map((r) => `${r.properties.firstname} ${r.properties.lastname}`) },
    duplicateGroups: dupGroups.length,
    duplicateLosers: dupLosers,
    duplicateDomains: dupGroups.map(([k, v]) => `${k} x${v.length}`),
  };
}

function printCensus(c) {
  console.log('--- Defect census (what the sweep would find right now) ---');
  console.log(`lab companies in scope        : ${c.labCompanies}`);
  console.log(`non-canonical country         : ${c.badCountry.total}  ${JSON.stringify(c.badCountry.values)}`);
  console.log(`www. prefixed domain          : ${c.prefixedDomain.total}  ${JSON.stringify(c.prefixedDomain.values)}`);
  console.log(`abbreviated job title         : ${c.badTitles.total}  ${JSON.stringify(c.badTitles.values)}`);
  console.log(`duplicate company groups      : ${c.duplicateGroups} (${c.duplicateLosers} records to merge)  ${JSON.stringify(c.duplicateDomains)}`);
  console.log(`orphan contacts (no company)  : ${c.orphanContacts}`);
  console.log(`orphan companies (no contact) : ${c.orphanCompanies.total}  ${JSON.stringify(c.orphanCompanies.values)}`);
  console.log(`review queue (no email)       : ${c.noEmail.total}  ${JSON.stringify(c.noEmail.values)}`);
}

async function seed() {
  const before = await census();
  printCensus(before);
  console.log('\n--- Seeding ---');

  const companies = (await search('companies', [{ filters: [LAB_COMPANY_SCOPE] }], ['name', 'domain', 'country', 'createdate'])).results
    .filter((c) => !String(c.properties.domain || '').startsWith('www.'))
    .sort((a, b) => String(a.properties.domain).localeCompare(String(b.properties.domain)));
  const contacts = (await search('contacts', [{ filters: [LAB_CONTACT_SCOPE] }], ['email', 'firstname', 'lastname', 'jobtitle', 'associatedcompanyid'])).results
    .sort((a, b) => String(a.properties.email).localeCompare(String(b.properties.email)));

  if (companies.length < 9 || contacts.length < 11) {
    console.error(`Not enough seed records to work with (${companies.length} companies, ${contacts.length} contacts). Run npm run import:hubspot first.`);
    process.exit(1);
  }

  // 1. three non-canonical countries
  if (before.badCountry.total < 3) {
    for (let i = 0; i < 3; i += 1) {
      const target = companies[i];
      await hs('PATCH', `/crm/v3/objects/companies/${target.id}`, { properties: { country: DIRTY_COUNTRIES[i] } });
      console.log(`country  ${target.properties.domain} -> "${DIRTY_COUNTRIES[i]}"`);
    }
  } else console.log('country defects already present, skipping');

  // 2. two www. prefixed domains on existing companies
  if (before.prefixedDomain.total < 3) {
    for (let i = 3; i < 5; i += 1) {
      const target = companies[i];
      await hs('PATCH', `/crm/v3/objects/companies/${target.id}`, { properties: { domain: `www.${target.properties.domain}` } });
      console.log(`domain   ${target.properties.domain} -> "www.${target.properties.domain}"`);
    }
  } else console.log('domain defects already present, skipping');

  // 3. four duplicate company records; the fourth only collides after normalization
  if (before.duplicateLosers < 4) {
    for (let i = 0; i < 4; i += 1) {
      const source = companies[5 + i];
      const domain = i === 3 ? `www.${source.properties.domain}` : source.properties.domain;
      const created = await hs('POST', '/crm/v3/objects/companies', {
        properties: {
          name: `${source.properties.name}${DUPLICATE_SUFFIXES[i]}`,
          domain,
          country: source.properties.country || 'Canada',
        },
      });
      console.log(`dup      ${created.id} "${source.properties.name}${DUPLICATE_SUFFIXES[i]}" domain=${domain} (shadows ${source.id})`);
    }
  } else console.log('duplicate companies already present, skipping');

  // 4. five abbreviated / whitespace-damaged job titles
  if (before.badTitles.total < 5) {
    for (let i = 0; i < 5; i += 1) {
      const target = contacts[i];
      await hs('PATCH', `/crm/v3/objects/contacts/${target.id}`, { properties: { jobtitle: DIRTY_TITLES[i] } });
      console.log(`title    ${target.properties.email} -> "${DIRTY_TITLES[i]}"`);
    }
  } else console.log('job title defects already present, skipping');

  // 5. three orphan contacts: remove the company association
  if (before.orphanContacts < 3) {
    for (let i = 5; i < 8; i += 1) {
      const target = contacts[i];
      const assoc = await hs('GET', `/crm/v4/objects/contacts/${target.id}/associations/companies`);
      for (const a of assoc.results || []) {
        await hs('DELETE', `/crm/v4/objects/contacts/${target.id}/associations/companies/${a.toObjectId}`);
      }
      console.log(`orphan   ${target.properties.email} detached from ${(assoc.results || []).length} company association(s)`);
    }
  } else console.log('orphan contacts already present, skipping');

  // 6. two companies with no contacts
  if (before.orphanCompanies.total < 2) {
    for (const spec of ORPHAN_COMPANIES) {
      const existing = await search('companies', [{ filters: [{ propertyName: 'domain', operator: 'EQ', value: spec.domain }] }], ['domain']);
      if (existing.total > 0) {
        console.log(`orphanco ${spec.domain} already exists, skipping`);
        continue;
      }
      const created = await hs('POST', '/crm/v3/objects/companies', { properties: spec });
      console.log(`orphanco ${created.id} ${spec.domain} created with no contacts`);
    }
  } else console.log('orphan companies already present, skipping');

  // 7. three emailless shadow contacts, attached to the same company as the contact they shadow
  if (before.noEmail.total < 3) {
    for (let i = 8; i < 11; i += 1) {
      const source = contacts[i];
      const companyId = source.properties.associatedcompanyid;
      const created = await hs('POST', '/crm/v3/objects/contacts', {
        properties: {
          firstname: source.properties.firstname,
          lastname: source.properties.lastname,
          jobtitle: source.properties.jobtitle || '',
        },
      });
      if (companyId) {
        await hs('PUT', `/crm/v4/objects/contacts/${created.id}/associations/default/companies/${companyId}`, undefined);
      }
      console.log(`shadow   ${created.id} "${source.properties.firstname} ${source.properties.lastname}" no email, company=${companyId || 'none'}`);
    }
  } else console.log('review queue records already present, skipping');

  console.log('\n--- Census after seeding ---');
  printCensus(await census());
}

const mode = process.argv[2];
if (mode === '--report') {
  printCensus(await census());
} else if (mode === '--seed') {
  await seed();
} else {
  console.error('Usage: node scripts/seed-data/seed-hygiene-defects.mjs [--report|--seed]');
  process.exit(2);
}
