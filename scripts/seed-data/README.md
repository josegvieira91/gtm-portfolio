# Seed Data

Deterministic synthetic dataset shared across all 10 portfolio cases. One dataset shared
across every case is what makes them read as one connected system instead of ten disconnected
demos, and generating it deterministically means a case rebuilt a year later still references
the same companies it did the first time.

## Regenerate

```bash
npm run seed:generate
```

Runs `scripts/seed-data/generate.mjs`, which writes three CSVs into `scripts/seed-data/output/`.
That directory is gitignored. It is a build artifact, regeneratable at any time from this
script, never a source of truth. Nothing in the repo depends on files already being present in
`output/`; the command must be run at least once locally (or in CI) before anything imports
from it.

Two consecutive runs produce byte-identical output.

## Fixed seed

`faker.seed(20260724)` is the first statement after imports in `generate.mjs`. Every value in
every file is a deterministic function of that seed and the generation order.

**Do not change this number.** Every case built in Phases 2-5 references specific company
names, contact emails, and event IDs from this exact dataset: in recordings, in CRM
screenshots, in the reporting cases. Changing the seed regenerates a completely different
dataset and invalidates every case already recorded against the current one.

## Dataset shape

### `companies.csv`, 40 rows

| Column | Description |
|---|---|
| `name` | Faker-generated company name |
| `domain` | `<slug-of-name>.example.com`, lowercase, hyphenated, ASCII-only, unique |
| `industry` | One of a fixed 10-value vocabulary (Software, Professional Services, E-commerce, Financial Services, Healthcare Technology, Manufacturing, Logistics, Marketing Services, Education Technology, Real Estate Technology) |
| `employee_count` | Integer, 5-500 |
| `country` | Canada or United States |
| `created_date` | ISO `YYYY-MM-DD`, within the last 2 years of the generator's fixed reference date |

### `contacts.csv`, 80 rows, exactly 2 per company

| Column | Description |
|---|---|
| `first_name`, `last_name` | Faker-generated |
| `email` | `<first>.<last>@<company-domain>`, unique across the file |
| `job_title` | Faker-generated |
| `company_name`, `company_domain` | Match the parent company's row in `companies.csv` |
| `lifecycle_stage` | One of `subscriber`, `lead`, `marketingqualifiedlead`, `salesqualifiedlead`, `opportunity`, `customer`. These are HubSpot's own internal lifecycle stage values, so a CSV import maps cleanly |
| `created_date` | ISO `YYYY-MM-DD`, within the last year |

### `usage-events.csv`, 600 rows

| Column | Description |
|---|---|
| `event_id` | `evt-000001` through `evt-000600` |
| `contact_email` | Exists in `contacts.csv` |
| `company_domain` | The `contact_email` owner's own company domain |
| `event_type` | One of a fixed 5-value vocabulary: `login`, `feature_used`, `report_exported`, `invite_sent`, `api_call`, fixed rather than random so Cases 9 and 10's health-score computation gets stable, believable event types across every regeneration |
| `event_timestamp` | ISO 8601, within the last 90 days, rows sorted ascending |
| `event_value` | Integer, 1-50, a generic numeric weight per event |

## Case 5 prospect list

```bash
npm run seed:prospects
```

Runs `scripts/seed-data/generate-prospects.mjs`, which writes `scripts/seed-data/output/prospects.csv`
(same gitignored directory, same "artifact, never a source of truth" rule). It is a separate
script with its own fixed seed (`faker.seed(20261010)`), so it never shifts the shared dataset
above.

The file stands in for an Apollo saved-search export. Case 5 first ran on a real export, which
sent real names, titles and companies through OpenAI and a sequencer; this file replaced it so
every case runs on synthetic data. It uses Apollo's own header strings, so the n8n flow reads it
through the same column map it used for the real export:

| Column | Description |
|---|---|
| `First Name`, `Last Name` | Faker-generated |
| `Title` | One of eight revenue-side titles (VP of Sales, Head of Revenue Operations, and so on) |
| `Company Name` | Faker-generated, unique |
| `Email` | `<first>.<last>@<slug-of-company>.example.com` |
| `Website` | `https://<slug-of-company>.example.com` |
| `Industry` | Same 10-value vocabulary as `companies.csv` |
| `# Employees` | Integer, 25-500 |
| `City`, `State`, `Country` | One of ten Canada/US locations |
| `Short Description` | One templated sentence per industry, filled with the company name |
| `Apollo Contact Id` | `synthetic-001` through `synthetic-020` |

20 rows, the flow's row limit. The script refuses to write the file if any email or website is
off `*.example.com`.

## Why `.example.com`

Company domains are `<slug>.example.com`, the RFC 2606 reserved domain, rather than faker's
default random domain generator. Faker's `internet.domainName()` can emit a string that
belongs to a real business, which would put a real company's domain into a public portfolio
repo and into a Mailtrap send. A reserved subdomain makes that collision structurally
impossible, and it makes the "this data is synthetic" fact visible on screen during recordings
instead of buried in a caption. See the Verification section below for the check that proves
every email holds to this rule.

## Salesforce storage headroom

Salesforce Developer Edition carries roughly 5 MB of data storage, and building a case reloads
this data during debugging passes. The dataset is sized deliberately small (40 companies, 80
contacts, 600 events) to stay well under 1 MB combined. See the generator's own printed
summary for the exact byte counts on the last run.

## Synthetic-metric framing rule

Every number generated here is synthetic. Any metric shown on a case page must be framed as a
system property ("processes an event in under 8 seconds end-to-end") rather than a business
outcome ("increased conversion by 40%"), because there is no real company behind these numbers
to have achieved a business outcome.

## Verification

The following checks were run against the generated output and all passed on **2026-07-24**:

- Every email in `contacts.csv` ends in a `.example.com` domain, with no exceptions.
- Zero emails on real mailbox providers (`gmail.com`, `hotmail.com`, `outlook.com`, `yahoo.com`,
  `icloud.com`, `proton.me`).
- Zero occurrences of the operator's own name or of any real company or project he has worked
  with, checked against a private denylist that is not part of this repository.
- Every `company_domain` in `contacts.csv` and `usage-events.csv` exists in `companies.csv`
  (`REFERENTIAL_OK`).
- Every `contact_email` in `usage-events.csv` exists in `contacts.csv`, and no email repeats
  across `contacts.csv`.
- No IPv4 literal and no phone-number-shaped string anywhere in the output.
- Combined output size: 94,180 bytes (92.0 KB), well under the 1 MB gate and under 2% of
  Salesforce Developer Edition's roughly 5 MB storage ceiling.

Re-run these checks any time the generator changes. `scripts/seed-data/generate.mjs` carries
the companion gate.

## Loading the dataset into the CRM lab accounts

**Method note:** the original plan called for the vendors' own CSV import wizards. José asked
for the API path instead, so the two CRM imports run through small scripts
(`import-hubspot.mjs`, `import-salesforce.mjs`) rather than a browser wizard. The goal is the same, both
lab accounts end up holding the dataset, by a different route. Both scripts are idempotent (or
safely re-runnable): re-running after a re-seed updates/skips existing records instead of
creating duplicates.

`usage-events.csv` is never imported into either CRM. It feeds the Postgres-backed reporting
and health-score cases, not a CRM object, so importing it here would put the data in the wrong
place.

### One-time setup (per machine)

1. **HubSpot private app.** In the "Vieira GTM Lab" portal: Settings (gear icon, top right) →
   Integrations → Private Apps → Create a private app. On the Scopes tab, grant Read + Write on:
   `crm.objects.contacts`, `crm.objects.companies`. Copy the generated token once, because HubSpot only
   shows it at creation time.
2. Copy `.env.example` to `.env` at the project root, `chmod 600 .env`, and paste the token into
   `HUBSPOT_PRIVATE_APP_TOKEN=`. Never paste the token into chat or a shell rc file. See the
   project's global secrets rule.
3. **Salesforce CLI.** Install it if not already present: `npm install -g @salesforce/cli` (or
   `brew install sf`). Then authenticate once: `sf org login web --alias gtm-lab --set-default`
   That opens a browser to log into the Dev Edition org and stores the session under the
   `gtm-lab` alias as the CLI's default org. No token or `.env` entry needed for Salesforce; the
   import script drives the already-authenticated `sf` session.

### Running the import

```bash
npm run seed:generate      # if scripts/seed-data/output/ is empty or stale
npm run import:hubspot     # HubSpot: upserts companies then contacts, associates by domain
npm run import:salesforce  # Salesforce: bulk-imports Accounts then Contacts, prints storage before/after
npm run verify:imports     # fetches counts + one sample contact from each CRM, asserts the email
                            #   reads as @<slug>.example.com
```

Each import script prints per-object created/updated/error counts as it runs. The Salesforce
script additionally prints Setup → Storage Usage (`DataStorageMB`) before and after the import,
and flags in its own output if usage exceeds 40% of the org's limit, which would become a
dataset-size constraint for Case 7.

### How the scripts work

- **HubSpot** (`scripts/seed-data/import-hubspot.mjs`) calls the HubSpot CRM Objects API, dated version
  `2026-03`. Contacts use batch/upsert with `idProperty=email` (email is unique by default on
  every portal). Companies do NOT use batch/upsert, **corrected during the live import run on
  2026-07-25**: the "Vieira GTM Lab" portal's default `domain` property on Companies isn't
  flagged `hasUniqueValue: true`, so `batch/upsert` with `idProperty=domain` fails with HTTP 400
  `VALIDATION_ERROR` ("Unable to perform update/upsert by non-unique property domain"). Fixing
  that flag needs the `crm.schemas.companies.write` scope, broader than this private app was
  granted. Companies are instead searched by domain (`crm.objects.companies.read`) and routed to
  `batch/create` or `batch/update`. Same idempotent end state, no schema change, no new scope.
  Also corrected live: HubSpot's `industry` property on Companies is a fixed enum that rejected
  the generator's free-text values (e.g. "Healthcare Technology"); `lib/industry-map.mjs`
  translates the generator's vocabulary to a valid enum value at the import boundary, without
  touching the already-gated `companies.csv`. Finally, bulk-associates each contact to its
  company (unlabeled default association) using the domain/company IDs resolved above. Chunked
  at 100 records per batch, HubSpot's per-request limit.
- **Salesforce** (`scripts/seed-data/import-salesforce.mjs`) drives the Salesforce CLI's Bulk
  API 2.0 commands (`sf data import bulk`). Standard Account/Contact objects have no built-in
  External ID field on Website/Email (that needs a custom field + Setup change), so
  `sf data upsert bulk` isn't usable out of the box the way HubSpot's upsert is. Idempotency is
  instead handled at the script level: before importing, it queries existing Accounts/Contacts
  scoped to `*.example.com` and skips rows that already exist, so a re-run after a re-seed only
  inserts the delta. Contacts are matched to Accounts via the Account IDs returned by the
  Account import job (or the pre-existing-record query, on a re-run), so no lookup-by-name step
  needed. `Industry` is also translated via `lib/industry-map.mjs`, because Salesforce's
  `Account.Industry` picklist is unrestricted (confirmed via `sf sobject describe`), so it would
  silently accept the generator's raw vocabulary, but that wouldn't match any real picklist value
  in the UI. Also corrected live: `sf data bulk results` always writes its success/failed record
  CSVs into the process's current working directory with no way to redirect via flag, which was
  leaving untracked `<jobId>-success-records.csv` files at the repo root; the script now runs
  that specific command with `cwd` set to its own tmpdir (cleaned up after) and resolves the
  relative path the CLI returns against that same tmpdir before reading it.
- **Verify** (`scripts/seed-data/verify-imports.mjs`) queries both CRMs for record counts and
  one sample contact each, asserting the sample's email matches `@<slug>.example.com`. Exits
  non-zero (`VERIFY_FAILED`) if any check fails. **Corrected during the live run:** the HubSpot
  search was unscoped, so it counted and could sample the portal's own default demo company
  (`hubspot.com`) and demo contacts that ship with every new HubSpot portal, now scoped to
  `*.example.com` the same way the Salesforce SOQL queries already were.

### API surface note

HubSpot's CRM API has moved to a dated version path (`/crm/objects/2026-03/...`,
`/crm/associations/2026-03/...`) that supersedes the older `/crm/v3/objects/...` paths, which
HubSpot's own docs site now files under a separate "legacy" section. The batch/upsert endpoint
for companies isn't spelled out in HubSpot's narrative "Companies" guide page (only batch/read
is documented there), so it was confirmed live instead of assumed: an unauthenticated POST
returns 401 (route exists, auth required) rather than 404 (route doesn't exist), verified
2026-07-24 against `api.hubapi.com`.
