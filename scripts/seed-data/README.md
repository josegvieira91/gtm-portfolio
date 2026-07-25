# Seed Data

Deterministic synthetic dataset shared across all 10 portfolio cases. One dataset shared
across every case is what makes them read as one connected system instead of ten disconnected
demos, and generating it deterministically means a case rebuilt in Phase 5 still references the
same companies it did in Phase 3.

## Regenerate

```bash
npm run seed:generate
```

Runs `scripts/seed-data/generate.mjs`, which writes three CSVs into `scripts/seed-data/output/`.
That directory is gitignored — it is a build artifact, regeneratable at any time from this
script, never a source of truth. Nothing in the repo depends on files already being present in
`output/`; the command must be run at least once locally (or in CI) before anything imports
from it.

Two consecutive runs produce byte-identical output.

## Fixed seed

`faker.seed(20260724)` is the first statement after imports in `generate.mjs`. Every value in
every file is a deterministic function of that seed and the generation order.

**Do not change this number.** Every case built in Phases 2-5 references specific company
names, contact emails, and event IDs from this exact dataset — in recordings, in CRM
screenshots, in the reporting cases. Changing the seed regenerates a completely different
dataset and invalidates every case already recorded against the current one.

## Dataset shape

### `companies.csv` — 40 rows

| Column | Description |
|---|---|
| `name` | Faker-generated company name |
| `domain` | `<slug-of-name>.example.com`, lowercase, hyphenated, ASCII-only, unique |
| `industry` | One of a fixed 10-value vocabulary (Software, Professional Services, E-commerce, Financial Services, Healthcare Technology, Manufacturing, Logistics, Marketing Services, Education Technology, Real Estate Technology) |
| `employee_count` | Integer, 5-500 |
| `country` | Canada or United States |
| `created_date` | ISO `YYYY-MM-DD`, within the last 2 years of the generator's fixed reference date |

### `contacts.csv` — 80 rows, exactly 2 per company

| Column | Description |
|---|---|
| `first_name`, `last_name` | Faker-generated |
| `email` | `<first>.<last>@<company-domain>`, unique across the file |
| `job_title` | Faker-generated |
| `company_name`, `company_domain` | Match the parent company's row in `companies.csv` |
| `lifecycle_stage` | One of `subscriber`, `lead`, `marketingqualifiedlead`, `salesqualifiedlead`, `opportunity`, `customer` — HubSpot's own internal lifecycle stage values, so a CSV import maps cleanly |
| `created_date` | ISO `YYYY-MM-DD`, within the last year |

### `usage-events.csv` — 600 rows

| Column | Description |
|---|---|
| `event_id` | `evt-000001` through `evt-000600` |
| `contact_email` | Exists in `contacts.csv` |
| `company_domain` | The `contact_email` owner's own company domain |
| `event_type` | One of a fixed 5-value vocabulary: `login`, `feature_used`, `report_exported`, `invite_sent`, `api_call` — fixed rather than random so Cases 9 and 10's health-score computation gets stable, believable event types across every regeneration |
| `event_timestamp` | ISO 8601, within the last 90 days, rows sorted ascending |
| `event_value` | Integer, 1-50, a generic numeric weight per event |

## Why `.example.com`

Company domains are `<slug>.example.com`, the RFC 2606 reserved domain, rather than faker's
default random domain generator. Faker's `internet.domainName()` can emit a string that
belongs to a real business, which would put a real company's domain into a public portfolio
repo and into a Mailtrap send. A reserved subdomain makes that collision structurally
impossible, and it makes the "this data is synthetic" fact visible on screen during recordings
instead of buried in a caption — see the Verification section below for the check that proves
every email holds to this rule.

## Salesforce storage headroom

Salesforce Developer Edition carries roughly 5 MB of data storage, and Phase 3 reloads this
data during debugging passes. The dataset is sized deliberately small (40 companies, 80
contacts, 600 events) to stay well under 1 MB combined — see the generator's own printed
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
- Zero occurrences of the operator's own identifiers or real project names (`josegvieira`,
  `jose.vieira`, `vieira`, `axera`, `zaweep`, `nexus`, `cleuza`) across all three files.
- Every `company_domain` in `contacts.csv` and `usage-events.csv` exists in `companies.csv`.
- Every `contact_email` in `usage-events.csv` exists in `contacts.csv`.
- No IPv4 literal and no phone-number-shaped string anywhere in the output.
- Combined output size under 1 MB.

Re-run these checks any time the generator changes — see `scripts/seed-data/generate.mjs`'s
companion gate, run as part of this plan's Task 2.
