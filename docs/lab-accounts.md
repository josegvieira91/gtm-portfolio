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

Do NOT create this account in this phase.

Signing up for Clay tends to auto-start the 14-day Pro trial. That trial clock has to start in Case 3 build week (Phase 3, Batch B), after the waterfall enrichment design is already validated on free-tier credits, not now. Creating the account early would burn trial days against nothing.

Creation checklist for later use, in Case 3 build week:

1. Sign up at Clay's signup page with the lab Gmail address, English, Edmonton timezone, workspace named "Vieira GTM Lab."
2. Do not start the Pro trial until the enrichment table structure, formulas, and provider waterfall order are already validated on free-tier credits (100/month).
3. Size the first trial run to roughly 30 to 40 rows, not the full 50-row cap, to leave headroom for at least one rerun.
4. Capture the evidence pack screenshots the same day the final clean run completes (video
   retired per D-15, 2026-08-25 -- see `docs/recording-sop.md`).

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
credit balance — no new purchase for this decision. Account and API key creation happen in
Task 2 of this plan; the key goes into n8n's credential store only, never into this repository.
Auto-recharge must stay off so the existing balance is a hard ceiling, not a recurring charge.

### Instantly.ai

Approved under the D-12 decision above (option-a) as a 14-day no-card trial. Do NOT sign up
now. The trial clock starts only at Case 5 build day, once the flow is designed and dry-run
work is done, so the clean run and its recording can happen inside the 14-day window. Signup
for this account belongs to the Case 5 build plan, not this one.

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
| Google (lab account) | Created | 2026-08-05 |
| Clay | Deferred (Phase 3 Batch B) | — |
| Make.com | Created | 2026-08-05 |
| Apollo.io | Created | 2026-08-05 |
| OpenAI API | Created | 2026-08-05 |
| Instantly.ai | Deferred (Case 5 build day — 14-day trial clock) | — |

## Section 2: Free-Tier Constraints

| Account | Free-tier limits | The trap | Where it bites |
|---|---|---|---|
| HubSpot free | 1,000 contacts, 2 seats, no custom objects. **This tier has no native workflows** — single-step "simple automation" and sequences are Starter+ and up. Private-app API limit: 100 requests per 10 seconds. | HubSpot is an API-only data store on the free tier. n8n owns every trigger and every branch; there is no HubSpot-native automation to reach for mid-build. | Cases 1, 4, 7 |
| Salesforce Developer Edition | Permanent org, roughly 5 MB data storage and 20 MB file storage (verify in Setup → Storage Usage before loading data — this figure is carried forward from older docs). Inactive-user freezing after 60 days without login, and the feature cannot be disabled. | The org quietly freezes right when Case 7 stops getting regular traffic, after its recording is done and published. | Case 7, and any post-launch re-recording |
| Clay | Free plan: 100 credits per month, 200-row table cap. Pro trial: 14 days, 1,000 credits, 50-row table cap. A multi-provider waterfall costs roughly 10 to 25 credits per row. Credits do not roll over. One trial per account. | A single 50-row waterfall pass can burn 500 to 1,250 credits, so debugging inside the trial window kills the case before a clean recording happens. | Case 3 |
| Cal.com | Free: unlimited event types and bookings for one user. | No trap. Free is sufficient for Case 8. | — |
| Slack | Free: 90-day rolling message history, hidden rather than deleted. | A case built early and revisited late loses searchable history once it rolls past 90 days. | Case 10's digest |
| Mailtrap | Free: 150 emails per day, 4,000 per month, 3-day log retention. | A live demo or a burst of testing silently exhausts the daily quota, and the logs are gone before anyone diagnoses it. | Case 5, and Phase 4's live demo |
| Google (lab account) | OAuth apps in "Testing" status force-expire refresh tokens 7 days after consent. Lifetime authorized-user cap of 100, irrelevant for a 1-user lab. | Leaving the app in Testing would silently break the Gmail/Calendar/Sheets credentials mid-batch with `invalid_grant`. Moved to "In production" at creation time to avoid this by construction rather than by discovering it mid-recording. | Cases 3, 6, 8 |
| Make.com | Free: 1,000 operations/month, 2 active scenarios. Minimum scheduling interval and multi-module-scenario support were not shown in the dashboard (research expects 15 min and "yes," respectively; unconfirmed). | A nightly Case 4 scenario that fans out into many operations per execution can burn the monthly operation budget well before a clean recording happens. | Case 4 |
| Apollo.io | Free: 75 email credits/month (verbatim from dashboard, renews Sep 5, 2026). Monthly export allowance and daily sending cap not yet observed. | The real allowance is lower than the researched ~100 estimate and is the hard ceiling on what Cases 3 and 5 may publish — burning credits on a bad test pass before the real run leaves nothing for the recording. | Cases 3, 5 |
| OpenAI API | Existing prepaid credit: US$5 (corrected from an initial ~US$10 estimate). Auto-recharge confirmed OFF. | A runaway loop or retry storm during a lab run could exhaust the prepaid balance mid-run with no auto-recharge fallback, silently truncating the recording. | Cases 5, 6 |
| Instantly.ai | 14-day no-card trial, not yet started. | Once started, the trial clock is the hard deadline for finishing the Case 5 flow, dry-running it, and completing the recording — starting it before the flow is ready burns days against nothing. | Case 5 |

## Section 3: Credential Handling

Credentials for these accounts live only in the user's dedicated credential vault and in the n8n credential store. They never live in this repository, in any file, or in any commit message. See `docs/sanitization-checklist.md` for how workflow exports built on top of these accounts get cleaned before they enter the public repo.
