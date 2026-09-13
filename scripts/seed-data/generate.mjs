// scripts/seed-data/generate.mjs
//
// Deterministic synthetic dataset generator for the GTM Engineering Portfolio lab accounts
// (HubSpot "Vieira GTM Lab" portal, Salesforce Developer Edition org). Produces three CSVs
// in scripts/seed-data/output/ (gitignored; regenerate with `npm run seed:generate`, never
// a source of truth):
//   - companies.csv    40 rows, one per synthetic account
//   - contacts.csv     80 rows, two per company
//   - usage-events.csv ~600 rows, feeds the reporting and health-score cases
//
// Every company domain is a slug under the RFC 2606 reserved `example.com` domain, so a
// generated record can never collide with a real business or reach a real mailbox. See
// scripts/seed-data/README.md for the full rationale.

import { faker } from '@faker-js/faker';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Fixed seed: every run must produce byte-identical output, because every case built in
// every later phase references these exact records (company names in recordings, contact
// emails in CRM screenshots, event IDs in reporting queries).
//
// CHANGING THIS NUMBER INVALIDATES EVERY CASE ALREADY RECORDED AGAINST THIS DATA. Do not
// change it without a project-wide reason, and if it does change, every prior case recording
// that shows a company/contact name needs to be re-checked.
faker.seed(20260724);

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');

// Fixed reference date (not wall-clock "now") so relative date ranges ("last 2 years", "last
// 90 days") are also deterministic regardless of which real-world day the script runs on.
const REFERENCE_DATE = new Date('2026-07-24T00:00:00Z');

const COMPANY_COUNT = 40; // tens, not hundreds: Salesforce Dev Edition has ~5 MB of storage
const CONTACTS_PER_COMPANY = 2;
const USAGE_EVENT_COUNT = 600;

const COUNTRIES = ['Canada', 'United States'];

const INDUSTRIES = [
  'Software',
  'Professional Services',
  'E-commerce',
  'Financial Services',
  'Healthcare Technology',
  'Manufacturing',
  'Logistics',
  'Marketing Services',
  'Education Technology',
  'Real Estate Technology',
];

// Matches HubSpot's own internal lifecycle stage values so a CSV import maps cleanly.
const LIFECYCLE_STAGES = [
  'subscriber',
  'lead',
  'marketingqualifiedlead',
  'salesqualifiedlead',
  'opportunity',
  'customer',
];

// Fixed vocabulary, not random strings, because Cases 9 and 10 compute a health score from these
// types and need them stable and believable across every regeneration.
const EVENT_TYPES = ['login', 'feature_used', 'report_exported', 'invite_sent', 'api_call'];

// --- helpers -----------------------------------------------------------------------------

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics (combining marks left behind by NFKD)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// RFC 4180 quoting: wrap in double quotes and escape internal quotes if the field contains a
// comma, a double quote, or a newline.
function csvField(value) {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers, rows) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvField(row[h])).join(','));
  }
  return lines.join('\n') + '\n';
}

function isoDateInPastYears(years) {
  const past = new Date(REFERENCE_DATE);
  past.setFullYear(past.getFullYear() - years);
  return faker.date.between({ from: past, to: REFERENCE_DATE }).toISOString().slice(0, 10);
}

function isoTimestampInPastDays(days) {
  const past = new Date(REFERENCE_DATE);
  past.setDate(past.getDate() - days);
  return faker.date.between({ from: past, to: REFERENCE_DATE }).toISOString();
}

// --- generators ---------------------------------------------------------------------------

function generateCompanies() {
  const companies = [];
  const usedDomains = new Set();
  const usedNames = new Set();

  while (companies.length < COMPANY_COUNT) {
    const name = faker.company.name();
    if (usedNames.has(name)) continue;

    const slug = slugify(name);
    if (!slug) continue;

    let domain = `${slug}.example.com`;
    let suffix = 2;
    while (usedDomains.has(domain)) {
      domain = `${slug}-${suffix}.example.com`;
      suffix += 1;
    }

    usedNames.add(name);
    usedDomains.add(domain);

    companies.push({
      name,
      domain,
      industry: faker.helpers.arrayElement(INDUSTRIES),
      employee_count: faker.number.int({ min: 5, max: 500 }),
      country: faker.helpers.arrayElement(COUNTRIES),
      created_date: isoDateInPastYears(2),
    });
  }

  return companies;
}

function generateContacts(companies) {
  const contacts = [];
  const usedEmails = new Set();

  for (const company of companies) {
    for (let i = 0; i < CONTACTS_PER_COMPANY; i++) {
      const firstName = faker.person.firstName();
      let lastName = faker.person.lastName();

      // Pass the company's own example.com domain explicitly as faker's provider, since faker's
      // default emits gmail.com and similar real mailbox domains, which is exactly the
      // collision this dataset must never produce.
      let email = faker.internet.email({ firstName, lastName, provider: company.domain }).toLowerCase();
      let attempt = 2;
      while (usedEmails.has(email)) {
        // Duplicate email would break HubSpot's unique-identifier import rule, so disambiguate
        // deterministically rather than re-rolling faker's RNG, which would shift every
        // subsequent value in the sequence.
        email = faker.internet
          .email({ firstName, lastName: `${lastName}${attempt}`, provider: company.domain })
          .toLowerCase();
        attempt += 1;
      }
      usedEmails.add(email);

      contacts.push({
        first_name: firstName,
        last_name: lastName,
        email,
        job_title: faker.person.jobTitle(),
        company_name: company.name,
        company_domain: company.domain,
        lifecycle_stage: faker.helpers.arrayElement(LIFECYCLE_STAGES),
        created_date: isoDateInPastYears(1),
      });
    }
  }

  return contacts;
}

function generateUsageEvents(contacts) {
  const events = [];

  for (let i = 1; i <= USAGE_EVENT_COUNT; i++) {
    const contact = faker.helpers.arrayElement(contacts);
    events.push({
      event_id: `evt-${String(i).padStart(6, '0')}`,
      contact_email: contact.email,
      company_domain: contact.company_domain,
      event_type: faker.helpers.arrayElement(EVENT_TYPES),
      event_timestamp: isoTimestampInPastDays(90),
      event_value: faker.number.int({ min: 1, max: 50 }),
    });
  }

  // Timestamps are drawn independently per row (not sorted at source), so sort ascending so the
  // CSV reads as a believable event stream when opened directly.
  events.sort((a, b) => a.event_timestamp.localeCompare(b.event_timestamp));

  return events;
}

// --- main --------------------------------------------------------------------------------

function main() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const companies = generateCompanies();
  const contacts = generateContacts(companies);
  const usageEvents = generateUsageEvents(contacts);

  const files = [
    {
      name: 'companies.csv',
      content: toCsv(['name', 'domain', 'industry', 'employee_count', 'country', 'created_date'], companies),
      rows: companies.length,
    },
    {
      name: 'contacts.csv',
      content: toCsv(
        [
          'first_name',
          'last_name',
          'email',
          'job_title',
          'company_name',
          'company_domain',
          'lifecycle_stage',
          'created_date',
        ],
        contacts
      ),
      rows: contacts.length,
    },
    {
      name: 'usage-events.csv',
      content: toCsv(
        ['event_id', 'contact_email', 'company_domain', 'event_type', 'event_timestamp', 'event_value'],
        usageEvents
      ),
      rows: usageEvents.length,
    },
  ];

  console.log('Seed data generated (seed 20260724):');
  let totalBytes = 0;
  for (const file of files) {
    const path = join(OUTPUT_DIR, file.name);
    writeFileSync(path, file.content, 'utf8');
    const bytes = Buffer.byteLength(file.content, 'utf8');
    totalBytes += bytes;
    console.log(`  ${file.name}: ${file.rows} rows, ${bytes.toLocaleString()} bytes`);
  }
  console.log(`  total: ${totalBytes.toLocaleString()} bytes (${(totalBytes / 1024).toFixed(1)} KB)`);
  console.log(`  Salesforce Developer Edition headroom: ~5 MB ceiling, this dataset is ${((totalBytes / (5 * 1024 * 1024)) * 100).toFixed(2)}% of that.`);
}

main();
