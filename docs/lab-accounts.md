# Lab Accounts

This file is public. It carries provisioning procedure and free-tier limits only. No email addresses, no usernames, no portal IDs, no login secrets of any kind. Identifiers that must stay private live in `lab-accounts.local.md`, which is gitignored and never committed.

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
4. Record the video the same day the final clean run completes.

## Section 2: Free-Tier Constraints

| Account | Free-tier limits | The trap | Where it bites |
|---|---|---|---|
| HubSpot free | 1,000 contacts, 2 seats, no custom objects. **This tier has no native workflows** — single-step "simple automation" and sequences are Starter+ and up. Private-app API limit: 100 requests per 10 seconds. | HubSpot is an API-only data store on the free tier. n8n owns every trigger and every branch; there is no HubSpot-native automation to reach for mid-build. | Cases 1, 4, 7 |
| Salesforce Developer Edition | Permanent org, roughly 5 MB data storage and 20 MB file storage (verify in Setup → Storage Usage before loading data — this figure is carried forward from older docs). Inactive-user freezing after 60 days without login, and the feature cannot be disabled. | The org quietly freezes right when Case 7 stops getting regular traffic, after its recording is done and published. | Case 7, and any post-launch re-recording |
| Clay | Free plan: 100 credits per month, 200-row table cap. Pro trial: 14 days, 1,000 credits, 50-row table cap. A multi-provider waterfall costs roughly 10 to 25 credits per row. Credits do not roll over. One trial per account. | A single 50-row waterfall pass can burn 500 to 1,250 credits, so debugging inside the trial window kills the case before a clean recording happens. | Case 3 |
| Cal.com | Free: unlimited event types and bookings for one user. | No trap. Free is sufficient for Case 8. | — |
| Slack | Free: 90-day rolling message history, hidden rather than deleted. | A case built early and revisited late loses searchable history once it rolls past 90 days. | Case 10's digest |
| Mailtrap | Free: 150 emails per day, 4,000 per month, 3-day log retention. | A live demo or a burst of testing silently exhausts the daily quota, and the logs are gone before anyone diagnoses it. | Case 5, and Phase 4's live demo |

## Section 3: Credential Handling

Credentials for these accounts live only in the user's dedicated credential vault and in the n8n credential store. They never live in this repository, in any file, or in any commit message. See `docs/sanitization-checklist.md` for how workflow exports built on top of these accounts get cleaned before they enter the public repo.
