# Galoras — working notes for anyone editing this repo

Galoras is an executive coaching marketplace. Coaches apply or are invited, an
admin approves them, and they appear in a searchable directory where coachees
are matched to them and can book and pay.

This file exists because several of the ways this project goes wrong are
**silent**. Nothing breaks on the day you get it wrong. It breaks weeks later,
for someone with no way to know why. Read the four rules before you change
anything.

---

## The four rules

### 1. Test the live system first. Read code second, to explain what the test showed.

Reasoning from this repo to what production does is wrong often enough to be
dangerous. In one week it cost two hours in one direction (inferring a bug from
repo code that production did not have) and a false alarm in the other
(declaring a live data-loss bug that had already been fixed in the deployed
function).

If you can click it, query it, or curl it — do that first.

### 2. Edge functions: deploy to Supabase, then commit the same bytes to GitHub, in the same session.

`src/` is accurate by definition — Netlify builds the site from `main`, so what
is in the repo is what is live.

`supabase/functions/` is not. Edge functions are pasted by hand into the
Supabase dashboard and have historically never been committed back. For months
the repo held broken versions of functions that had been fixed in production,
and four functions that exist only in Supabase and in no file anywhere.

If you deploy a function and do not commit it, you have created a landmine for
whoever restores from this repo.

### 3. `supabase/migrations/` is a record of intent, not of this database.

At least two migrations in that folder were never applied:

- `20260223155523` — the `onboarding_links` table and `onboarding_short_id`
- `20260408000003` — `coach_tag_map` and `product_tag_map`

Worse, the tag seed in the second one describes an **80-tag vocabulary that was
deliberately abandoned**. Production runs a different, curated 60-tag set. The
two overlap on seven keys. Running that seed would insert 73 rows and show
coaches "Career Transition" next to "Career Transitions".

**Verify a table exists before you rely on it.** A missing table fails as a
PostgREST 404 that the app often swallows.

### 4. Anything that must be byte-exact goes in by human clipboard paste, file upload, or CLI. Never by an agent typing into a web editor.

A real clipboard paste is a single input event and editors leave it alone.
Synthesized keystrokes trigger GitHub's auto-indent, which compounds down the
file and produces something that compiles, reviews clean, and is no longer the
bytes you verified. Line count stays identical; only the byte count moves.

Prefer **upload** over paste where the platform allows it. It removes the
editor from the path entirely.

---

## Where things run

| Thing | Where |
|---|---|
| Site | `galoras.com` — Netlify project `galoras-prod`, repo `Galoras1-dev/galoras-dev`, branch `main`, `npm run build` → `dist` |
| Database and functions | Supabase project `qbjuomsmnrclsjhdsjcz` (display name "UAT-Galoras") |
| Payments | Stripe, Galoras Operations LLC `acct_1SpSJtPgXmGigJFe` — **currently TEST mode** |

The committed `.env` points at a **stale** Supabase project. It is ignored:
`src/integrations/supabase/client.ts` hardcodes the correct one and wins.

### There is a second live front-end, and it is not ours

**`uat-galoras.site`** serves an older build of this application and points at the
**same production Supabase project**. It is not a branch deploy and not a domain
alias of `galoras-prod` — Netlify domain management on this account lists only
`galoras-prod.netlify.app`, `galoras.com` and `www.galoras.com`, and branch
deploys are limited to production. Its response headers are Netlify's, so it is a
Netlify site **on an account this team cannot see**. `GALORAS_BUILD_LOG.md` names
it as the deploy target, which suggests it predates `galoras.com`.

It is not a harmless mirror. It is a second front door onto live data, running
code we have since fixed. Anyone with it bookmarked reads and writes real records
through stale logic, and any bug they report may already be fixed here.

It also ships a **live-mode Stripe publishable key**, where production ships
test-only. Nothing is leaked by that — publishable keys are public by design —
and today a live-mode client hitting test-mode server keys simply fails. But the
moment the Stripe server keys are switched to live, that site becomes a working
checkout against this database, controlled by an account nobody here can reach.
**Resolve this before going live on Stripe, not after.**

Until it is repointed or taken down: **check which URL you are on before
believing anything you see**, and make sure every link you send — to a coach, to
Stephen, to anyone — says `galoras.com`.

Open question, and it needs answering before coach invitations go out: **whose
Netlify account is it?** Barnes is the obvious place to start.

## Commands that actually exist

```bash
npm run dev      # vite dev server
npm run build    # production build — run this before shipping a frontend change
npm run lint     # eslint
npm run preview  # serve the built output
```

**There are no tests.** No test script, no test runner, no test files. `npm run
build` succeeding is the only automated check this project has. Treat a clean
build as the minimum bar, not as verification that anything works.

## Known hazards in this repo

- **Stray duplicate files from the macOS download trap.** `src/App_1.tsx`,
  `src/pages/Apply_1.tsx`, `src/CoachOnboarding (1).tsx`. Three files are named
  `CoachOnboarding`; only `src/pages/coaching/CoachOnboarding.tsx` is routed.
  Check `App.tsx` for what is actually wired before editing anything.
- **`send-signup-otp`, `verify-signup-otp`, `complete-signup`,
  `send-password-reset`** are deployed in Supabase and exist in no file here.
  Pull them from the dashboard before touching anything near auth.
- **`auto-tag-coach` speaks the abandoned vocabulary.** 44 keyword rules, of
  which about 6 match a tag that exists. It also deletes every tag a coach has
  before writing its own back, despite its call site describing it as filling
  gaps. Its invocation has been removed from `approve-coach`. Do not re-enable
  it without remapping the rules and scoping the delete.

## Conventions

- Files for pasting into the Supabase SQL editor or function editor are
  delivered as `.txt` so they open in TextEdit as plain text, not RTF.
- Production SQL is run by hand, read-only diagnostics first.
- Watch every Netlify deploy go green before believing a change is live.
  "Committed" is not "deployed"; a deploy preview is not production.
- Verify the whole page or flow after a change, not only the thing you changed.
