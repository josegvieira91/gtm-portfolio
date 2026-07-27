# Workflows

This directory holds the sanitized export of every automation shown on the site, one folder
per case, so a reviewer can read the actual node graph behind a case page rather than take the
recording on faith. What's in here is real: the workflow JSON is exported directly from the
orchestration engine that ran the case, then sanitized and committed. There is no synthetic or
hand-written version.

## Folder naming

Each folder name equals the case's `slug` frontmatter value, not its case number. `case-01`
pairs with the folder `inbound-speed-to-lead`, not `case-01`. The ten planned folders, in case
order:

| Case | Folder |
|------|--------|
| 1 | `inbound-speed-to-lead` |
| 2 | `whatsapp-ai-lead-qualification` |
| 3 | `tam-list-building-enrichment-waterfall` |
| 4 | `crm-hygiene-engine` |
| 5 | `ai-personalized-outbound` |
| 6 | `ai-reply-triage` |
| 7 | `hubspot-to-salesforce-bidirectional-sync` |
| 8 | `meeting-lifecycle-automation` |
| 9 | `funnel-sla-reporting-pipeline` |
| 10 | `product-usage-health-score-churn-signals` |

A folder is empty (holding only a `.gitkeep`) until the corresponding case's automation is
built, recorded, and its export has passed the sanitize gate below.

## Engines

Three different orchestration engines appear across the catalog, and export format differs per
engine:

- **n8n** runs Cases 1, 2, 3 (partial), 5, 6, 7, 9, 10. Files are named for the n8n workflow they
  came from, exported as n8n's native workflow JSON format.
- **Make** runs Case 4. Files are named for the Make scenario they came from, exported as Make's
  own blueprint JSON format.
- **Zapier** runs Case 8. Files are named for the Zap they came from, exported as Zapier's own
  Zap-export JSON format.

Each engine's export shape is different (n8n exports a full node graph with connections; Make
exports a scenario blueprint; Zapier exports a linear step list) — this is expected, not an
inconsistency to fix.

## Importing an export

To load an n8n export into your own instance: open n8n, go to Workflows, and use "Import from
File," pointing at the case's `.json` file. Make and Zapier exports are read as reference (the
node graph and configuration are legible directly in the JSON); re-importing into a live Make
scenario or Zap follows each platform's own import flow.

Every credential reference in every export has been renamed to a generic placeholder
(`PLACEHOLDER_<TYPE>`, e.g. `PLACEHOLDER_HUBSPOT`) before export. Importing any of these files
will prompt you for your own credentials rather than silently reusing anything from the lab
account that built it.

## How this was sanitized

Every export in this directory passed `scripts/sanitize-check.sh` before being committed, per
the locked run order in `docs/sanitization-checklist.md`: rename credentials in the tool before
export, export, move the file into `workflows/<slug>/`, run the script, review the diff, commit
only on exit 0. The script must exit 0 for a directory to be considered clean.

You can re-run the same gate yourself:

```
scripts/sanitize-check.sh workflows/
```

An exit code of 0 means the structural JSON checks (instance URL, webhook path, credential
names, embedded auth headers, third-party host allowlist, pinned node output) and the regex
passes all came back clean.

## What's not here

Recordings are not in this repo. They're large binaries served directly from the site, not
tracked in git. Poster images (the static preview frame shown before a recording plays) live
under `public/posters/` instead, since those are small webp files, not video.
