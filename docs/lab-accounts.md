# Lab Accounts

This file is public. It carries provisioning procedure and free-tier limits only. No email addresses, no usernames, no account numbers, no login secrets of any kind. Identifiers that must stay private live in `lab-accounts.local.md`, which is gitignored and never committed.

Fixed parameters for every account below: language English, timezone America/Edmonton, naming "Vieira GTM Lab" wherever a name is requested, and the lab Gmail address (referred to here as "the lab Gmail address," never written out). Refuse every paid trial offer during onboarding unless a section below says otherwise.

## Section 1: Provisioning Checklist

### HubSpot

Create a NEW portal under the existing HubSpot login. Never reuse a portal that holds real or client data.

1. Primary route: go to app.hubspot.com, open the account menu at the top right, and choose add/switch account, then create a new portal.
2. Fallback route: go to `app.hubspot.com/signup-hubspot/crm?step=existing_user` and choose "Create Account with New User."
3. Final fallback: open HubSpot support chat and ask for a new portal to be created under the existing login.

Community reports say the URL route in step 2 has been unreliable since January 2025, so needing the fallback chain is expected, not a sign something went wrong.

Signup asks for a company name and a website. Use "Vieira GTM Lab" and `josevieira.dev`.

Acceptance for this step: the new portal opens showing zero contacts, zero companies, zero deals. If it shows existing data, that is an old portal, not the new one; back out and try the next fallback route.

### Salesforce Developer Edition

1. Sign up at `developer.salesforce.com/signup`.
2. The username must be globally unique across all of Salesforce and must be formatted like an email address, but it does not need to be a deliverable mailbox. The contact email is the lab Gmail address.
3. Developer Edition is a permanent org, not a trial with an expiration date. The reminder step below is part of org creation, not a later cleanup task.
4. Immediately after the org opens, create a recurring monthly calendar event in the calendar you actually read, titled "Salesforce Dev Edition login (GTM portfolio lab)," with the first occurrence no more than 45 days out. See the constraints table below for why this step cannot be skipped.

### Cal.com

Create a separate personal account, distinct from the existing Axera account, so lab scheduling never mixes with client scheduling.

1. Sign up at `cal.com/signup`.
2. Preferred username `josevieira`. If it is taken, pick a clean variant and record it in the local file.
3. Set timezone to Edmonton.
4. Create one 30-minute event type named "Intro call." Case 8 and the Phase 2 contact page both point at this same event type, so it has to exist as a real, reachable slug before either is built.

### Slack

1. Go to `slack.com/create`.
2. Create a NEW workspace named "Vieira GTM Lab."
3. Channels are created per case in Phase 3. Do not create any channels now.

### Mailtrap

Verify before creating. An account for the lab Gmail address may already exist, left over from an earlier sandbox project.

1. Attempt sign-in at `mailtrap.io/signin` using the lab Gmail address.
2. Use the account-recovery flow (the "forgot your sign-in?" link) to determine whether an account already exists. If the recovery flow finds an account, that account is the one to use; do not create a second one.
3. Only register a new account at `mailtrap.io/register` if the recovery flow finds nothing.
4. Record which of the two happened.

### Clay

Created 2026-09-09 on the **free plan**, workspace "Vieira GTM Lab", with Google Sheets connected
the same day. **No Pro trial was ever activated (D-19).** Nothing was purchased and no card was
given. Clay applied an automatic no-card trial badge that lapses on 2026-09-23; Case 3 is designed
to keep working after it lapses, so the extra credits until then are slack, never a dependency.

Case 3 is built entirely inside the free plan's limits. Read off Clay's own pricing page on
2026-09-11, the free plan gives **100 data credits a month, 500 actions a month, 200 rows per table,
multi-provider waterfalls and Claygent**, with no rollover. The 500-actions figure is new here: the
earlier sizing only tracked credits. A three-leg waterfall plus six formula columns is nine column
runs a row, so 40 rows is about 360 actions, inside the 500 but not by much.

| Cost per enriched row | Rows the 100 monthly credits buy | Which limit binds |
|---|---|---|
| 2 credits (Clay's own pre-run estimate for this waterfall) | 50 | credits, by 4x |
| 1 credit (structural maximum, see below) | 100 | credits, by 2x |
| 0 credits (measured on this list) | unlimited by credits | the 200-row table cap, then the seed set |

**Measured 2026-09-11: 0 credits per enriched row, 0 credits for the whole 40-row run.** Clay bills
on a successful enrichment, not on an attempt, and every lookup against a reserved `example.com`
domain misses, so both vendor legs cost nothing and the internal-registry leg is a Google Sheets
lookup that costs nothing by construction. Clay's own confirmation dialog priced a 10-row re-run of
the same waterfall at "~20 credits total"; the counter moved by zero.

That gives two numbers, and the case page needs both. On this synthetic list the honest ceiling is
bounded by the 200-row table cap and then by the 40-company seed set, so **40 rows**. On a list of
real domains the structural maximum is **1 credit per enriched row**, because the cascade gate closes
the second leg whenever the first one succeeds and a miss is free either way, so the 100 monthly
credits buy about 100 enriched rows, still under the 200-row cap. Clay's estimator does not know the
gate will close, so it quotes 2 credits a row, which would be 50.

The build discipline that follows from it:

1. Design the whole waterfall before spending a credit. Credits refill monthly, so an overspend
   costs weeks, not minutes.
2. Dry-run three rows in two stages, reading the credit counter after the first row, so the per-row
   cost is a measured number before the rest of the budget is committed.
3. Auto-run stays on with "Keep existing results" checked, so only errored, empty or new cells run,
   and each cascade leg only receives a key when the leg before it came back empty. Re-running
   already-enriched rows spends nothing.
4. Use no feature that is Pro-only. The test is what still works after the trial badge lapses, not
   what the account can do today.
5. Capture the evidence still the same day the final clean run completes (video retired per D-15,
   2026-08-25 -- see `docs/recording-sop.md`).

### What the 2026-09-11 run measured

The table was driven through the automation browser over its debugging port with Playwright. The
free plan hands out no API key (workspace settings has no API-keys page at all), so there was no
API route to take.

| Question | Answer |
|---|---|
| Route that drove the table | Automation browser over CDP. No free-plan API key exists |
| Credits spent, whole workbook | **0 of 100**, confirmed on the workbook usage page |
| Measured cost per enriched row | **0** on this list; 1 is the structural maximum on real domains |
| Honest row ceiling | **40**, set by the seed set, since credits do not bind at 0 |
| Source rows / enriched / not found | 40 / 20 / 20 |
| Coverage after all three legs | 50% |
| Accounts that passed the ICP rule | 16 |
| Every leg fired | Yes: leg 1 on 40 rows, leg 2 on 40, leg 3 on 40 |
| Cascades | Two, on every row: leg 1 miss opens leg 2, leg 2 miss opens leg 3 |
| Re-run cost | **0.** A forced re-run Clay priced at ~20 credits moved the counter by zero |
| Pro-only features used | None. Pro items carry an explicit "Upgrade" badge; nothing used carries one |
| Throughput | 10 rows through all three legs in 5.46s and 5.48s on two runs, so 0.55s an account |
| CRM write-back | 16 companies updated, 0 created, in 13.8s, on English standard properties |

Three findings changed the build, and all three are in the case rather than hidden:

1. **Apollo could not run at all.** Clay's Apollo.io actions are bring-your-own-account, and Apollo's
   free plan issues no prospecting API key (recorded here on 2026-09-08). So the first leg became
   Clay's own "Enrich company" at 1 credit a row, and Apollo leaves Case 3's stack rather than
   appearing on a page it never touched.
2. **Clay's per-column run condition would not persist.** Set three times across two columns, the
   checkbox and its formula reverted on reload. The cascade is therefore expressed as input gates:
   a formula column emits the domain only when the previous leg came back empty, and the next leg
   reads that column as its required input. Formula columns persist, and the gate is visible in the
   table as a filled or blank cell.
3. **Clay's HubSpot connector wanted a fresh OAuth sign-in** that resolved to a personal HubSpot
   login rather than the lab portal, so it was abandoned rather than risk the wrong account. The
   write-back ran the documented fallback instead: Clay writes the enriched rows to a sheet tab and a
   lab n8n workflow reads that tab, applies the CRM gate and upserts HubSpot by domain. `n8n` joins
   Case 3's stack for that reason.

The four provenance properties (`enrichment_source`, `enrichment_status`, `enriched_at`, `icp_fit`)
are still not created in HubSpot: the lab Service Key carries read on the company schema but not
`crm.schemas.companies.write`, which returned 403. The write-back runs on standard properties only,
and the provenance stays in the Clay table and the sheet tab.

### Make.com

Unconditional lab account, not part of the D-12 decision — needed for Case 4 (CRM Hygiene
Engine orchestration).

1. Sign up at `make.com` with the lab Gmail address, English, Edmonton timezone, organization
   named "Vieira GTM Lab."
2. Free plan observed limits (2026-08-05): 1,000 operations per month (dashboard verbatim:
   "Credits left 1,000 / 1,000," usage resets monthly), 2 active scenarios allowed (dashboard
   verbatim: "Active scenarios 0 / 2"). Both match the researched estimate exactly.
3. Minimum scheduling interval was not shown anywhere on the dashboard's plan/usage page. Make's
   own documentation states 15 minutes on the Free plan; treat that as the working assumption
   until a scenario is actually scheduled and the interval picker in the scenario editor is
   checked directly.
4. Whether multi-module scenarios are allowed on Free was likewise not shown on the usage page.
   The research expectation is that they are allowed — confirm empirically during the Case 4
   build, before assuming a multi-step scenario will run on this plan.

### Apollo.io

Unconditional lab account, not part of the D-12 decision — needed for Cases 3 and 5. This is
the account whose real credit figure governs both cases' publishable metrics; see the `TBD`
placeholders left in `case-03.mdx` and `case-05.mdx` until the recorded runs fill them in.

1. Sign up at `apollo.io` with the lab Gmail address, English, Edmonton timezone, workspace
   named "Vieira GTM Lab."
2. Free plan observed limit (2026-08-05): 75 email credits per month (dashboard verbatim:
   "Available credits 75 / 75," "Credits will renew on Sep 5, 2026"). This is lower than the
   researched ~100/month estimate — the real, binding number for Cases 3 and 5 is 75, not the
   research guess.
3. Monthly export allowance and daily sending cap were not visible on the credit-usage screen
   at signup. Recorded as not-yet-observed; read the real figures off the dashboard the first
   time an export or a send actually happens.
4. Accounts-enrichable-per-pass estimate (agreed with José, 2026-08-05): roughly 50 accounts in
   a single pass, leaving margin inside the 75-credit monthly budget for retries and for Case
   5's separate share of the same credit pool.

**Finding, 2026-09-08: the Free plan has no prospecting API.** The API-key dialog lists the
people-search and enrichment endpoints as not included in Free and not reachable even with a
master key. No API key was created. The consequence is a real design change, not a workaround
to hide: prospect sourcing runs on a saved search built in the Apollo UI, exported as CSV, and
read by the automation. Both cases that use Apollo say "Apollo saved-search export" rather than
"Apollo API", in prose and in the diagram. Credit arithmetic on the export path: one email
credit per exported contact that carries an email address, out of the 75 per month, so a
20-row export is about 20 credits and leaves room for the second case.

### D-12 paid-exception decision (Case 5: OpenAI + Instantly)

Case 5's locked stack (`Apollo`, `OpenAI`, `Instantly`, `n8n`) includes two tools with no
usable free tier. D-12 required this decision to surface at Batch A planning, before build
starts, with no pre-approved spending ceiling.

**Decision (2026-08-05): option-a — approve both, timed and capped.**

- **OpenAI:** approved at zero incremental cost. The lab already holds an existing prepaid
  credit of US$5 on the OpenAI account from prior use (corrected here from an initial
  ~US$10 estimate recorded before the account balance was actually checked), so no new
  purchase happens. That existing credit covers lab-scale usage for Cases 5 and 6 (a few
  dozen drafts/classifications), which is cents, not dollars. No new spend is authorized
  here; if actual usage would exhaust the existing credit and require a top-up, that is a
  new decision, not covered by this approval.
- **Instantly:** approved as the 14-day no-card trial, same timed-window discipline already
  locked for Clay — design the flow first, dry-run what can be dry-run, and activate the
  trial only when the clean run and the recording can happen inside the window. The trial is
  NOT activated by this decision; activation belongs to the Case 5 build plan.
- Locked stack is unchanged by this decision (option-a keeps Apollo/OpenAI/Instantly/n8n as
  already recorded in `case-05.mdx` frontmatter), so no downstream file changes to case
  frontmatter, diagrams, or tool-icon usage are needed.
- The portfolio's "only fixed cost is the domain" line survives intact: no new money changes
  hands for Case 5's stack.
- OpenRouter credit on the lab operator's account was considered and not used here — the
  locked stack specifies OpenAI as the draft writer, not a swappable provider.

### OpenAI API

Approved under the D-12 decision above (option-a), funded entirely from an existing prepaid
credit balance, with no new purchase for this decision. The API key lives in the gitignored `.env`
and in n8n's credential store, never in this repository. Auto-recharge stays off so the existing
balance is a hard ceiling, not a recurring charge.

Verified 2026-09-08: prepaid balance **US$4.29** (revised down from the earlier US$5 figure),
auto-recharge confirmed off. The n8n credential for it was created over the n8n API on
2026-09-09 and proved by real drafting calls.

Model choice, recorded because it is a cost decision and not a quality one: `gpt-4o-mini`, which
is cheaper than `gpt-4.1-mini` (US$0.15 / US$0.60 per million tokens against US$0.40 / US$1.60).
Measured on the first case that uses it: **about US$0.00008 per drafted email**, roughly 313
tokens. Twenty drafts is under a fifth of a cent. The prepaid balance is not the constraint at
this scale; an unbounded retry loop would be, which is why the retry and redraft caps exist.

### Instantly.ai

Approved under the D-12 decision above (option-a) as a no-card trial. Created 2026-09-09, on
Case 5 build day, after the flow was already designed and dry-run, so the trial window is spent
on the real run rather than on debugging.

What exists, as created:

1. One sending mailbox, the lab Google address, connected over a Gmail app password. Status
   active, sending cap 30 emails per day, warmup off.
2. One campaign, `GTM Lab Outbound`, with a single step whose subject and body are the
   `{{subject}}` and `{{body}}` variables the flow supplies per lead, and the lab mailbox
   selected under Accounts To Use.
3. `INSTANTLY_API_KEY` and `INSTANTLY_CAMPAIGN_ID` in the repo's gitignored `.env`, per D-17.
   The matching n8n credential is `PLACEHOLDER_INSTANTLY` (HTTP Header Auth, `Authorization:
   Bearer <key>`), created over the n8n API.

**The campaign stays in Draft and is never launched.** The flow's job is to push approved
drafts into it, and the API accepting a lead is the whole proof. Launching it would start real
sending, which no part of this project needs. API v2 authenticates with
`Authorization: Bearer <key>`, not the v1 query-string key.

### Google (lab account)

Create a dedicated Google account for this lab, separate from any personal or Axera account. This inbox holds synthetic mail only — never forward or import real mail into it. This account backs Gmail (Case 6), Google Calendar (Case 8), and Google Sheets (Case 3).

1. Create the account at `accounts.google.com`. Locale English, timezone America/Edmonton.
2. Sign in to Google Cloud Console with that account and create a project named "Vieira GTM Lab."
3. Go to APIs & Services → OAuth consent screen. User type: External.
4. Enable three APIs in the project: Gmail API, Google Calendar API, Google Sheets API.
5. Move the publishing status from "Testing" to "In production" immediately, before any case depends on it. This step is not optional: while the app sits in Testing, Google force-expires every refresh token 7 days after consent, and n8n's Gmail/Calendar/Sheets credentials fail mid-batch with `invalid_grant`.
6. Create an OAuth 2.0 Client ID (type: Web application). The client ID and secret go into n8n's credential store only, never into this repo.

Observed outcome: the app flipped to "In production" immediately, with no app-verification review requested and no stated turnaround. The consent screen may still show an "unverified app" warning at consent time for the sensitive Gmail scopes, since the app itself is unverified — watch for this during the Case 6 recording and account for it in the shot list if it appears.

### Status

| Account | Status | Date |
|---|---|---|
| HubSpot | Created | 2026-07-24 |
| Salesforce Developer Edition | Created | 2026-07-24 |
| Cal.com | Created | 2026-07-24 |
| Slack | Created | 2026-07-24 |
| Mailtrap | Created | 2026-07-24 |
| Google (lab account) | Disabled by Google on creation day (appeal filed 2026-08-28) | 2026-08-05 |
| Clay | Created (free plan); no Pro trial activated (D-19). Waterfall built and run end to end 2026-09-11: 40 rows, 3 legs, 0 of 100 credits spent | 2026-09-09 |
| Make.com | Created; login restored 2026-09-08 after the lab Google account was reinstated | 2026-08-05 |
| Apollo.io | Created; login restored 2026-09-08. Prospecting API not available on Free, so sourcing runs on saved-search CSV exports | 2026-08-05 |
| OpenAI API | Created; key and n8n credential verified 2026-09-09 | 2026-08-05 |
| Instantly.ai | Created; mailbox connected, campaign `GTM Lab Outbound` in Draft, key and n8n credential verified 2026-09-09 | 2026-09-09 |

## Section 2: Free-Tier Constraints

| Account | Free-tier limits | The trap | Where it bites |
|---|---|---|---|
| HubSpot free | 1,000 contacts, 2 seats, no custom objects. **This tier has no native workflows** — single-step "simple automation" and sequences are Starter+ and up. Private-app API limit: 100 requests per 10 seconds. | HubSpot is an API-only data store on the free tier. n8n owns every trigger and every branch; there is no HubSpot-native automation to reach for mid-build. | Cases 1, 4, 7 |
| Salesforce Developer Edition | Permanent org, roughly 5 MB data storage and 20 MB file storage (verify in Setup → Storage Usage before loading data — this figure is carried forward from older docs). Inactive-user freezing after 60 days without login, and the feature cannot be disabled. | The org quietly freezes right when Case 7 stops getting regular traffic, after its recording is done and published. | Case 7, and any post-launch re-recording |
| Clay | Free plan: 100 data credits and 500 actions per month, 200-row table cap, no rollover. The Pro trial is never activated (D-19), so the free figures are the only ones that apply. | Clay bills on a successful enrichment, not on an attempt, so the measured cost of the whole 40-row run was 0 credits. On real domains the structural maximum is 1 credit per enriched row, or about 100 rows a month. The 500 actions are the tighter limit at nine column runs a row. | Case 3 |
| Cal.com | Free: unlimited event types and bookings for one user. | No trap. Free is sufficient for Case 8. | — |
| Slack | Free: 90-day rolling message history, hidden rather than deleted. | A case built early and revisited late loses searchable history once it rolls past 90 days. | Case 10's digest |
| Mailtrap | Free: 150 emails per day, 4,000 per month, 3-day log retention. | A live demo or a burst of testing silently exhausts the daily quota, and the logs are gone before anyone diagnoses it. | Case 5, and Phase 4's live demo |
| Google (lab account) | OAuth apps in "Testing" status force-expire refresh tokens 7 days after consent. Lifetime authorized-user cap of 100, irrelevant for a 1-user lab. | Leaving the app in Testing would silently break the Gmail/Calendar/Sheets credentials mid-batch with `invalid_grant`. Moved to "In production" at creation time to avoid this by construction rather than by discovering it mid-recording. | Cases 3, 6, 8 |
| Make.com | Free: 1,000 operations/month, 2 active scenarios. Minimum scheduling interval and multi-module-scenario support were not shown in the dashboard (research expects 15 min and "yes," respectively; unconfirmed). | A nightly Case 4 scenario that fans out into many operations per execution can burn the monthly operation budget well before a clean recording happens. | Case 4 |
| Apollo.io | Free: 75 email credits/month (verbatim from dashboard, renews Sep 5, 2026). **No prospecting API on Free** (verified 2026-09-08): people-search and enrichment endpoints are denied even with a master key. Monthly export allowance and daily sending cap not yet observed. | Two traps, not one. The credit allowance is lower than the researched ~100 estimate and is the hard ceiling on what Cases 3 and 5 may publish. And the API being closed means anything planned as "call Apollo" has to become "export a saved search and read the file": a design change, discovered late, that both cases now state plainly instead of implying an API integration they do not have. | Cases 3, 5 |
| OpenAI API | Existing prepaid credit: US$4.29 (verified 2026-09-08; earlier notes said US$5). Auto-recharge confirmed OFF. Measured cost on `gpt-4o-mini`: about US$0.00008 per drafted email. | A runaway loop or retry storm could exhaust the prepaid balance mid-run with no auto-recharge fallback. Per-call cost is negligible, so the risk is loop count, not token price: the retry cap (3 attempts) and the redraft cap (2 rewrites) are what bound it. | Cases 5, 6 |
| Instantly.ai | No-card trial, started 2026-09-09. One connected mailbox, 30 emails/day sending cap, warmup off. Leads are upserted by (campaign, email): the API returns 200 for every push, and pushes that repeat an address already in the campaign update that one lead instead of adding another. | Two traps. The trial clock is the deadline for anything that still needs the account, and the dedupe rule means a run that forces every recipient to one lab address leaves exactly one lead record in the campaign however many drafts were pushed. Measured, not assumed: 17 pushes, 17 HTTP 200s, the same lead id in all 17 responses. Per-prospect proof therefore lives in the outbox table, not in the campaign. | Case 5 |

## Section 3: Credential Handling

Credentials for these accounts live only in the user's dedicated credential vault and in the n8n credential store. They never live in this repository, in any file, or in any commit message. See `docs/sanitization-checklist.md` for how workflow exports built on top of these accounts get cleaned before they enter the public repo.
