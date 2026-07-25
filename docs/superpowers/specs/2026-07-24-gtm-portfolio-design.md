# GTM Engineering Portfolio — Design Spec

**Date:** 2026-07-24
**Status:** Approved (pending final review)
**Owner:** José Vieira

## Goal

A dedicated personal portfolio site that positions José Vieira as a GTM engineer (also titled "GTM automation specialist") for roles in Canada and the US. The site showcases ten automation systems built for real in live tool accounts, each documented with an animated diagram, an engineering explanation, and a recording of the flow running. Launch happens only when the full catalog is ready.

## Audience

Hiring managers and recruiters for GTM engineer / GTM automation / RevOps roles. Secondary: technical interviewers who will open the public repo and inspect exported workflows.

## Core decisions

| Decision | Choice | Why |
|---|---|---|
| Identity | Dedicated personal site, own domain, English only | A hiring manager should land on a candidate, not an agency |
| Case depth | "Living museum": every flow genuinely built and recorded; 1–2 cases also interactive live | Proof of real construction with low maintenance risk; a broken live demo is the worst first impression, so live surface stays small |
| Launch strategy | Full catalog before publishing | Strong debut over early iteration (owner's call) |
| Visual direction | Blueprint / schematic mono: technical grid, monospace type, cyanotype accent | Distinctive and memorable; matches the "engineer who draws and ships systems" positioning |
| Motion | GSAP only (ScrollTrigger + DrawSVG). No second animation library | One engine covers everything; the blueprint concept is "the site draws itself" |
| Budget | Free-first: free tiers, dev editions, timed trials. Only fixed cost is the domain (~US$12/yr) | Paid upgrades only if a specific case requires one, decided case by case |
| Data | 100% synthetic dataset (companies, contacts, events). No real PII, no client names anywhere | Cases describe generic B2B SaaS scenarios |
| Repo | Public GitHub repo with site code and sanitized workflow JSON exports | Extra proof layer for technical reviewers; feeds future n8n Creator templates |

## Site architecture

- **Home** — hero with self-drawing schematic + "the machine wall": grid of 10 case cards, hover draws each mini-schematic, filter by tool (n8n, Clay, HubSpot, Salesforce, AI).
- **/cases/[slug]** — one page per case (anatomy below).
- **/about** — short background, certifications (HubSpot RevOps earned; Clay University and others as completed), one line about running automation projects for real clients through his own consultancy.
- **Contact** — email, LinkedIn, Cal.com scheduling. The scheduling flow IS case #8 (dogfooding as proof).
- **Future track (not built now):** a `/lab` section for general-purpose automation cases (Upwork-facing). The case content collection includes a `track` field (default `"gtm"`) from day one so the second track needs no refactor.

### Case page anatomy

1. Problem — the generic B2B SaaS pain, 2–3 paragraphs.
2. The machine — large SVG diagram of the flow, scroll-scrubbed: a data packet travels the pipeline, nodes light up as it arrives, engineering callouts appear alongside (why idempotency here, why a ledger there).
3. How it works — the engineering decisions explained in plain language.
4. Stack — tool badges.
5. Recording — short video of the real flow running.
6. Metrics — scroll-triggered counters.
7. CTA.

## Case catalog (10)

| # | Case | Category | Tools | Notes |
|---|---|---|---|---|
| 1 | Inbound Speed-to-Lead Engine | Inbound & routing | n8n, HubSpot, Slack, Postgres | Rebuilds an existing project in English; **live interactive demo**: visitor submits the form and watches the pipeline fire |
| 2 | WhatsApp AI Lead Qualification | Inbound & routing | n8n, WhatsApp API, Claude, CRM | Conversational qualification, deal created with AI summary |
| 3 | TAM List Building & Enrichment Waterfall | Enrichment & data | Clay, CRM | ICP → sourcing → multi-provider waterfall → normalize → push |
| 4 | CRM Hygiene Engine | Enrichment & data | n8n, HubSpot, Postgres | Nightly fuzzy dedupe, normalization, orphan reassignment, audit log |
| 5 | AI-Personalized Outbound | Outbound | n8n, Claude, Mailtrap | Research → icebreaker → sequence → outbox ledger; **live demo candidate**: visitor enters their company URL, gets a generated icebreaker |
| 6 | AI Reply Triage | Outbound | n8n, Claude, CRM | Classify replies (interested/OOO/objection/unsub), update CRM, draft response for human approval |
| 7 | HubSpot ↔ Salesforce Bidirectional Sync | Integration & sync | n8n, HubSpot, Salesforce Dev Edition | Field mapping, conflict rules, dead-letter queue |
| 8 | Meeting Lifecycle Automation | Integration & sync | Cal.com, n8n, CRM | Booking → CRM → reminders → no-show recovery; doubles as the site's real booking flow |
| 9 | Funnel & SLA Reporting Pipeline | Reporting & lifecycle | n8n, Postgres, dashboard | Stage-change events → conversion, velocity, SLA breaches |
| 10 | Product Usage Health Score & Churn Signals | Reporting & lifecycle | n8n, Postgres, Slack | Simulated usage events → health score → CS tasks + weekly digest |

Every flow is built in real accounts with English names throughout (workflow names, CRM properties, Slack channels) because recordings show the actual screens.

## Tech stack

- **Astro 7 + Tailwind v4** (corrected 2026-07-24 from "Astro 6" after version research: Astro 7.x is current and required by the MDX integration), cases as MDX content collections (zod-validated frontmatter: title, slug, track, category, heroMetric, stack, metrics, video, featured, draft).
- **GSAP** via npm, hydrated only in `client:visible` islands; static parts ship zero JS.
- `prefers-reduced-motion`: all animation disabled, final states shown; counters keep the final value in static HTML.
- Performance budget: Lighthouse mobile > 95, transform/opacity animations only (no CLS), lazy-loaded media.
- Deploy: self-hosted (Docker + reverse proxy) on existing infrastructure.
- Live demo endpoints (cases 1 and 5) point at a self-hosted n8n instance dedicated to portfolio work; public webhooks get rate limiting and input validation.

## Writing rules

- English only, plain and direct; no AI-tells (no em-dashes for emphasis, no "delve/leverage/seamless" vocabulary, varied sentence length).
- No client names, ever. Scenarios are "a B2B SaaS company".
- Each case explains what it does, when to use it, and how it works, at a depth a hiring manager can skim and a technical interviewer can dig into.

## Out of scope (this phase)

- Analytics beyond a simple counter (Plausible/GA later if wanted).
- i18n — English only.
- Aggressive SEO (clean titles/meta and sitemap only).
- Own transactional email infrastructure (Mailtrap covers outbound cases).
- The `/lab` Upwork track (schema is ready for it; content comes later).

## Sequencing

1. **Foundation** — domain (check candidates: josevieira.dev, josegvieira.com, josevieira.io), accounts, repo, synthetic seed dataset.
2. **Site** — blueprint design system, motion system, case template with placeholder data.
3. **Cases in batches** — start with the two that rebuild existing material (1, 5), then enrichment/CRM (3, 4), AI (2, 6), sync/meetings (7, 8), reporting (9, 10). Each case = build flow → record video → write MDX.
4. **Live demos** — wire cases 1 and 5 interactive paths with rate limiting.
5. **Launch** — final review, deploy, publish.

## Success criteria

- Site live on its own domain, all 10 cases published, each with a recording of the real flow running.
- 2 interactive live demos working with abuse protection.
- Lighthouse mobile > 95; reduced-motion fallback verified.
- Public repo with sanitized workflow exports; zero client references, zero real PII (verified by sweep before launch).

## Risks

- **Free tier limits** (Clay credits, trial windows): mitigated by timing trials to build weeks; recordings survive tier expiry by design.
- **Live demo abuse**: rate limiting + validation; failure mode degrades to the recorded video.
- **Scope creep across 10 cases**: each case is deliberately shallow in breadth (one clear problem) and deep in engineering explanation.
