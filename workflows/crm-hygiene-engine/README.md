# CRM Hygiene Engine (Make scenario)

`crm-hygiene-engine.json` is a Make blueprint, not an n8n workflow. Import it with
**Create a new scenario -> ... -> Import Blueprint** and paste the file.

The scenario runs nightly at 02:00, reads the HubSpot portal, repairs what it can decide
deterministically, and reports what it cannot. Twenty modules across five stages.

## What it does

| Stage | Modules | Job |
|---|---|---|
| Dupe Scan | 1 to 6 | Six read calls: three defect scans, the orphan scan, the review-queue scan, and a full company list used as the pre-sweep baseline |
| Merge Rules | router route 1 to 3 | One repair leg per field, each gated so the leg is skipped entirely when its scan came back empty |
| Auto-Merge | router route 4 | Re-reads companies on their canonical domains and merges exact-domain duplicates into the earliest record |
| Review Queue + Audit | router route 5 | Writes one audit record per run into a Make data store, whether or not anything changed |
| Slack Digest | router route 5, last module | Posts the run summary to an English-named channel |

## Setup after import

Every third-party call is an HTTP module with an **API Key Auth** keychain item, so the blueprint
carries a numeric keychain reference and no credential value. Create two keychain items under
**Keys** and reattach them to the modules whose `parameters.auth` points at them:

| Keychain item | Type | Key value | Placement | Parameter name |
|---|---|---|---|---|
| `PLACEHOLDER_HUBSPOT` | API Key Auth | `Bearer <your HubSpot private app token>` | header | `Authorization` |
| `PLACEHOLDER_SLACK` | API Key Auth | `Bearer <your Slack bot token>` | header | `Authorization` |

The HubSpot private app needs `crm.objects.companies.read`, `crm.objects.companies.write`,
`crm.objects.contacts.read` and `crm.objects.contacts.write`. The merge endpoint works with those
four; no schema scope is required, because the scenario writes no custom property.

Then create a data store from the structure below and point the **Write Audit Record** module at
it (`parameters.datastore`):

| Field | Type |
|---|---|
| `run_id`, `run_started` | text, required |
| `companies_merged`, `fields_normalized`, `records_normalized`, `orphans_flagged`, `review_queued` | number |
| `actions`, `review_items`, `digest` | text |

Finally, change the Slack channel in the last module and the `*example.com` scope filters in the
read modules to match your own data. The scope filter is what keeps the sweep off records it does
not own.

## Two things worth reading before you trust it

**The scan is server-side, the decision is client-side.** Each defect scan is a HubSpot search
that returns only candidate records, and the module that writes carries its own filter comparing
the stored value against its canonical form. The search keeps the operation count down; the filter
is what makes the sweep idempotent, because a candidate that is already canonical never reaches a
write. HubSpot's search also compares strings case-insensitively, so a value that differs from
canonical only by case cannot be found by a search at all. The scan finds values outside the
canonical set, which is a narrower promise than "finds every casing mistake", and it is stated that
way on purpose.

**Merges and rollups do not settle instantly.** A HubSpot company merge produces a new record whose
associated-contact count is recomputed asynchronously, so reading that property straight after the
merge pass reports every merge winner as a company with no contacts. The scenario avoids that by
intersecting the contactless set from the pre-sweep read with the record ids that still exist after
the sweep, which drops the merged duplicates out by itself. Make has no array-difference function,
so the intersection size is computed from `|A| + |B| - |A u B|`.

## Sanitization

Passed `scripts/sanitize-check.sh workflows/crm-hygiene-engine/` at export time (0 findings). No
account address, portal identifier, token or credential value is in the file. The numeric keychain
and data-store ids are account-local references, the same shape as the credential ids kept in the
n8n exports elsewhere in this directory.
