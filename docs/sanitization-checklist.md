# Sanitization Checklist

Procedure for taking one n8n workflow export from "just built" to "safe to commit." Run this
per export, every time. It is not a one-time setup note, it is a per-export gate.

## Export path convention

Sanitized exports live at:

```
workflows/<case-slug>/<workflow-name>.json
```

One directory per case, slug matching the case page slug (e.g. `workflows/inbound-speed-to-lead/`).
This is the only path sanitized workflow JSON ever lands at in this repo.

Raw, unsanitized exports never enter the repo at any path, not even temporarily. A file that
gets committed and later deleted still exists in git history. Deleting it does not remove
the leak, it only hides it from a casual `ls`. Sanitize before the file ever touches a tracked
directory, not after.

## The leak surface

Six things to check on every export, in order. Each names what to look for and what to
replace it with.

### 1. Instance URL

Appears in node metadata, error-handling nodes, and any node that builds an "open in n8n"
link back to the instance. Replace every occurrence with
`https://your-n8n-instance.example.com`.

### 2. Webhook paths

A webhook node's `path` value, combined with a known base URL, reconstructs a live callable
endpoint. Replace the path segment with `PLACEHOLDER` and keep the surrounding shape intact
so the export still reads as documentation, not a redacted mess.

### 3. Credential references

n8n exports credential `id` and `name`, never the credential value itself. But a descriptive
credential name is its own disclosure if it references real infrastructure or a project.
Rename every credential to `PLACEHOLDER_<TYPE>`, for example `PLACEHOLDER_POSTGRES` or
`PLACEHOLDER_HUBSPOT`. The preferred approach is renaming the credential inside n8n before
export, so the sanitized name is what actually gets exported. Post-processing the exported
JSON afterward is the fallback, not the default.

### 4. Embedded auth headers

HTTP Request nodes built by pasting a cURL command carry `Authorization` or `X-Api-Key`
header values in plain text inside the export. Every such header value must end up either
`PLACEHOLDER` or be removed entirely. Never a real token.

### 5. Third-party hosts

Legitimate API hosts for the tools this project actually uses (HubSpot, Salesforce,
Anthropic, Cal.com, Slack, Mailtrap, and similar) are expected to appear and stay as-is;
they live in `.sanitize-allowlist`. Anything not on that list must become an `example.com`
placeholder host instead.

### 6. Real data in pinned node output

n8n saves pinned or sample execution data directly inside the workflow JSON. Confirm any
pinned data comes from the synthetic seed dataset, never a real record captured during
debugging.

## Run order

1. Rename credentials in n8n (item 3 above) before exporting.
2. Export the workflow from n8n.
3. Move the export to `workflows/<case-slug>/<workflow-name>.json`.
4. Run `scripts/sanitize-check.sh` against the target directory.
5. Review the diff against the previous commit of the same file. A re-export silently
   reintroduces everything that was cleaned the first time, and the diff is the only way to
   catch it.
6. Commit only after the script exits 0. A nonzero exit means something on the leak surface
   above is still present; fix it and rerun from step 4.

## Final sweep before publish

The same script runs across every export again before the site goes public. A clean run per
case at build time does not replace that final sweep. It catches the case where a later
change to a shared workflow reintroduces something a per-case check already passed once.
