// scripts/seed-data/lib/industry-map.mjs
//
// The generator's `industry` column (scripts/seed-data/generate.mjs INDUSTRIES) is free-text,
// chosen to read well as a GTM-relevant vertical label on camera ("Healthcare Technology",
// "Education Technology", etc). Both CRMs' Industry fields are fixed enums/picklists that do
// NOT accept arbitrary strings. HubSpot's `industry` property on Companies rejected "Healthcare
// Technology" outright with INVALID_OPTION during the live import run on 2026-07-25 (confirmed
// via the batch/update 400 response), and Salesforce's Account.Industry is a standard picklist
// with its own fixed value set.
//
// Discovered during the live import run: fixing this at the generator level would change
// companies.csv's content and invalidate the already-executed, already-committed PII gate
// (Task 2, README.md "Verification" section, dated 2026-07-24) and the byte-identical
// determinism check. So the translation lives here, at the CRM import boundary, not in the
// generator. companies.csv keeps its original free-text industry column as the source of truth;
// each import script maps it to its own CRM's valid enum value.

export const INDUSTRY_TO_HUBSPOT = {
  Software: 'COMPUTER_SOFTWARE',
  'Professional Services': 'MANAGEMENT_CONSULTING',
  'E-commerce': 'RETAIL',
  'Financial Services': 'FINANCIAL_SERVICES',
  'Healthcare Technology': 'HOSPITAL_HEALTH_CARE',
  Manufacturing: 'INDUSTRIAL_AUTOMATION',
  Logistics: 'LOGISTICS_AND_SUPPLY_CHAIN',
  'Marketing Services': 'MARKETING_AND_ADVERTISING',
  'Education Technology': 'E_LEARNING',
  'Real Estate Technology': 'REAL_ESTATE',
};

// Salesforce's default Account.Industry picklist (standard, unrestricted in a fresh Dev Edition
// org; see the live-run note in import-salesforce.mjs for whether that held true here).
export const INDUSTRY_TO_SALESFORCE = {
  Software: 'Technology',
  'Professional Services': 'Consulting',
  'E-commerce': 'Retail',
  'Financial Services': 'Finance',
  'Healthcare Technology': 'Healthcare',
  Manufacturing: 'Manufacturing',
  Logistics: 'Transportation',
  'Marketing Services': 'Media',
  'Education Technology': 'Education',
  'Real Estate Technology': 'Other',
};

export function mapIndustry(map, sourceValue, label) {
  const mapped = map[sourceValue];
  if (!mapped) {
    console.error(`  WARNING: no ${label} industry mapping for "${sourceValue}", sending as-is.`);
    return sourceValue;
  }
  return mapped;
}
