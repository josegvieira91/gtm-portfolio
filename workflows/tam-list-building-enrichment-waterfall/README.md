# TAM List Building & Enrichment Waterfall (Clay + n8n)

Two files, and they are not the same kind of record.

| File | What it is |
|---|---|
| `clay-tam-enrichment-table.json` | A **transcription**, not an export. Clay's free plan has no table export and no API, so this is the configuration of the table that ran on 2026-09-11, written out column by column from the workspace. Every column name, action, provider, price and formula is the literal value in the built table. Workspace, workbook, table and spreadsheet ids are left out. The file's own `$comment` says the same. |
| `crm-loader.n8n.json` | A real n8n export of the workflow that read the waterfall's output sheet and wrote the accounts to HubSpot, produced by `scripts/export-n8n-workflow.mjs` and passed through `scripts/sanitize-check.sh`. The workflow was deleted from the lab after the run, so the webhook path and id are placeholders. |

## The waterfall (Clay)

The source list comes in from Google Sheets and is deduplicated on domain. Three legs run in order:
Clay's own company enrichment, LeadMagic, then a lookup against an internal registry sheet. Each
leg after the first reads a formula column that holds the domain only when the leg before it came
back empty, so a leg with no key does not run. A merge column takes the first non-empty answer, and
an `icp_fit` column applies the rule: 25 to 500 employees, Canada or the United States, and one of
seven target industries. The result is written to an output tab.

## The loader (n8n)

Eleven nodes: a header-auth webhook, a read of the output tab, a gate that keeps rows that are
enriched and inside the ICP rule, a HubSpot search by domain, then an update when the company exists
and a create when it does not, and a summary returned to the caller. In the published run
(execution #115) all sixteen companies already existed, so the create branch did not run.

## Setup after import

Import `crm-loader.n8n.json` into n8n and fill the placeholder credentials it names (HubSpot,
Google Sheets read, webhook header auth). The Clay table has to be rebuilt by hand from the
transcription.
