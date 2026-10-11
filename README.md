# GTM Engineering Portfolio

Source for [josevieira.dev](https://josevieira.dev), my portfolio of go-to-market
automation systems. Every case on the site is a system I built and ran in my own
lab accounts, documented with a diagram of the flow, an engineering writeup, and
the evidence from the run that produced the numbers.

## Status

Four of the ten planned cases are published:

| Case | Engine |
|------|--------|
| [Inbound Speed-to-Lead Engine](https://josevieira.dev/cases/inbound-speed-to-lead/) | n8n |
| [TAM List Building & Enrichment Waterfall](https://josevieira.dev/cases/tam-list-building-enrichment-waterfall/) | Clay, n8n |
| [CRM Hygiene Engine](https://josevieira.dev/cases/crm-hygiene-engine/) | Make |
| [AI-Personalized Outbound](https://josevieira.dev/cases/ai-personalized-outbound/) | n8n, OpenAI |

The other six are in build. Their pages are not part of the build output yet, and
they go live one at a time as each run finishes.

The site currently ships `noindex, nofollow` and a `Disallow: /` robots file. That
is deliberate while the catalog fills in. Both get flipped when the full set is
published.

## Running it

```
npm install
npm run dev      # local dev server
npm run build    # static build into dist/
npm run check    # astro check, types and content schemas
```

Node 22.12 or newer.

## Stack

- [Astro](https://astro.build), static output
- [Tailwind CSS](https://tailwindcss.com) v4
- [GSAP](https://gsap.com) for the scroll-driven diagrams
- Docker image serving the static build behind a reverse proxy

## Repo layout

- `src/`: pages, components, styles, and the case content collection
- `public/`: static assets served as-is
- `scripts/seed-data/`: generators for the synthetic CRM dataset
- `scripts/export-n8n-workflow.mjs`: pulls a workflow out of n8n and sanitizes it
- `workflows/`: sanitized exports of the automations behind each case
- `docs/sanitization-checklist.md`: the procedure every export goes through

## About the data

The systems ran for real. The records they ran on did not.

Every company, contact and prospect in the four published cases is synthetic. The
CRM dataset and Case 5's prospect list (20 rows in Apollo's export shape) come from
the generators in `scripts/seed-data/`; the test leads Case 1 posts to its form
were written for each run. Every email address and domain lands on `.example.com`.
Enrichment and lookup calls therefore run against domains that do not resolve to
real businesses, which is why both vendor legs in Case 3 miss every row. Each page
says what its run does and does not prove. No client data, and no real third-party
personal data, is anywhere in this repo.

## Workflow exports

`workflows/` holds the export of each automation, one folder per case, taken
straight out of the tool that ran it and then sanitized. The one exception is
Case 3's Clay table: Clay's free plan has no export, so that file is a
column-by-column transcription of the table that ran, and it says so in the
file. Instance URLs, webhook paths, credential references and auth headers are
replaced with placeholders before anything is committed. `workflows/README.md` covers the folder naming, the
per-engine export formats, and how to import one into your own instance.

The gate is a script, not a habit. You can run it yourself:

```
scripts/sanitize-check.sh workflows/
```

Exit 0 means the structural JSON checks and the regex passes came back clean.

## License

Code in this repository is MIT licensed, see [LICENSE](LICENSE).

Case texts, diagrams, screenshots and the written content under
`src/content/` are not covered by that license. Those are all rights reserved,
copyright 2026 José Vieira.
