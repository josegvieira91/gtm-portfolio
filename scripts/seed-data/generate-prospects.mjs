// scripts/seed-data/generate-prospects.mjs
//
// Deterministic synthetic prospect list for Case 5 (AI-Personalized Outbound). Writes one CSV,
// scripts/seed-data/output/prospects.csv (gitignored; regenerate with `npm run seed:prospects`),
// shaped like an Apollo saved-search export: Apollo's own header strings, one row per person.
//
// Why this exists: Case 5 first ran on a real Apollo export, which put real names, titles and
// companies through OpenAI and a sequencer. The rest of the portfolio is synthetic, so this file
// is the stand-in. The n8n flow reads it through the same column map it used for the real export,
// so nothing in the flow knows the difference.
//
// Every company domain is a slug under the RFC 2606 reserved `example.com` domain, same rule as
// generate.mjs: a generated record can never collide with a real business or reach a real inbox.

import { faker } from '@faker-js/faker';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Own fixed seed, separate from generate.mjs's 20260724, so adding this file can never shift the
// shared companies/contacts dataset. Changing it changes every prospect Case 5 was recorded with.
faker.seed(20261010);

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'output');
const OUTPUT_FILE = join(OUTPUT_DIR, 'prospects.csv');

const PROSPECT_COUNT = 20; // Case 5's row limit; every row costs three OpenAI calls at most

// Same vocabulary as generate.mjs (duplicated because importing that file runs it).
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

// Revenue-side titles: the people an outbound sequence is aimed at.
const TITLES = [
  'VP of Sales',
  'Head of Revenue Operations',
  'Director of Sales Development',
  'Sales Operations Manager',
  'Chief Revenue Officer',
  'Head of Growth',
  'Director of Demand Generation',
  'Revenue Operations Lead',
];

const LOCATIONS = [
  ['Calgary', 'Alberta', 'Canada'],
  ['Toronto', 'Ontario', 'Canada'],
  ['Vancouver', 'British Columbia', 'Canada'],
  ['Montreal', 'Quebec', 'Canada'],
  ['Austin', 'Texas', 'United States'],
  ['Denver', 'Colorado', 'United States'],
  ['Chicago', 'Illinois', 'United States'],
  ['Seattle', 'Washington', 'United States'],
  ['Boston', 'Massachusetts', 'United States'],
  ['Atlanta', 'Georgia', 'United States'],
];

// One sentence per industry, filled with the company name. Templates rather than lorem ipsum so
// the model gets something a real saved search would carry, and nothing a real company wrote.
const DESCRIPTIONS = {
  Software: (n) => `${n} sells workflow software to mid-size operations teams.`,
  'Professional Services': (n) => `${n} is a consulting firm that runs finance and compliance projects for growing companies.`,
  'E-commerce': (n) => `${n} runs an online store for home and outdoor goods with its own fulfilment.`,
  'Financial Services': (n) => `${n} offers lending and treasury services to small and mid-size businesses.`,
  'Healthcare Technology': (n) => `${n} builds scheduling and intake software for outpatient clinics.`,
  Manufacturing: (n) => `${n} manufactures industrial components and sells through regional distributors.`,
  Logistics: (n) => `${n} provides freight brokerage and last-mile delivery for retailers.`,
  'Marketing Services': (n) => `${n} is an agency that runs paid acquisition for subscription brands.`,
  'Education Technology': (n) => `${n} makes a learning platform for corporate training teams.`,
  'Real Estate Technology': (n) => `${n} builds property management software for residential landlords.`,
};

// Apollo's export header strings, exactly as Load Run Config's apollo_column_map lists them.
const HEADERS = [
  'First Name',
  'Last Name',
  'Title',
  'Company Name',
  'Email',
  'Website',
  'Industry',
  '# Employees',
  'City',
  'State',
  'Country',
  'Short Description',
  'Apollo Contact Id',
];

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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

function generateProspects() {
  const rows = [];
  const usedSlugs = new Set();

  while (rows.length < PROSPECT_COUNT) {
    const company = faker.company.name();
    const slug = slugify(company);
    if (!slug || usedSlugs.has(slug)) continue;
    usedSlugs.add(slug);

    const first = faker.person.firstName();
    const last = faker.person.lastName();
    const local = `${slugify(first)}.${slugify(last)}`.replace(/-/g, '');
    const industry = faker.helpers.arrayElement(INDUSTRIES);
    const [city, state, country] = faker.helpers.arrayElement(LOCATIONS);

    rows.push({
      'First Name': first,
      'Last Name': last,
      Title: faker.helpers.arrayElement(TITLES),
      'Company Name': company,
      Email: `${local}@${slug}.example.com`,
      Website: `https://${slug}.example.com`,
      Industry: industry,
      '# Employees': faker.number.int({ min: 25, max: 500 }),
      City: city,
      State: state,
      Country: country,
      'Short Description': DESCRIPTIONS[industry](company),
      'Apollo Contact Id': `synthetic-${String(rows.length + 1).padStart(3, '0')}`,
    });
  }
  return rows;
}

const rows = generateProspects();

// Companion gate: refuse to write a file that could reach a real domain.
for (const row of rows) {
  if (!/@[a-z0-9-]+\.example\.com$/.test(row.Email)) throw new Error(`non-example email: ${row.Email}`);
  if (!/^https:\/\/[a-z0-9-]+\.example\.com$/.test(row.Website)) throw new Error(`non-example website: ${row.Website}`);
}

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
const csv = toCsv(HEADERS, rows);
writeFileSync(OUTPUT_FILE, csv, 'utf8');
console.log(`wrote ${OUTPUT_FILE}: ${rows.length} rows, ${Buffer.byteLength(csv)} bytes`);
