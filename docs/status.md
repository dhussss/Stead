# Build status

Updated 5 October 2026 (Phase 1, steps 2-4 done; step 5 partly done). Read this after CLAUDE.md to
pick up where the last session left off.

## How work flows

Dan and Claude make decisions in the Second Brain Project chat ("directors") and write them here.
Claude Code ("dev team") reads this file at the start of each session, builds, and updates the
Done list at the end. Reviews happen in the director chat against the constitution and the design,
and by Dan using the preview deployment on his phone.

## Done

- Phase 0: constitution (`docs/constitution.md`), item format (`docs/item-format.md`), headless
  core with tests (`packages/core`), Next.js skeleton (`apps/web`), sample vault.
- Supabase project "Stead" (ref `lbwxmmsdyhneeijpjlib`, Sydney). All three migrations in
  `supabase/migrations` are applied. Security advisor is clean (the one INFO notice on
  `passcode_attempts` having RLS with no policies is by design: only the service role touches it).
- Public config in `apps/web/.env.example`. Secrets live only in `.env.local` and (from here on)
  Vercel.
- **Phase 1 step 2: Supabase adapters**, `apps/web/src/lib/supabase/`. `SupabaseFileStore`
  (`file-store.ts`) reads and writes the private `vault` bucket under the fixed owner's folder.
  `SupabaseItemIndex` (`item-index.ts`) keeps `public.items` and `public.links` in sync, recomputing
  an item's outgoing links on every upsert. `openVault()` (`apps/web/src/lib/vault.ts`) uses them once
  `SUPABASE_SECRET_KEY` and `STEAD_OWNER_ID` are set, and reads the persistent index as-is rather
  than rebuilding it on every request (rebuild is a maintenance operation, not a page load). Falls
  back to the sample vault otherwise, so local dev is unchanged. Verified live end to end
  (create, read back, index, close) before removing the test scaffolding.
- The one fixed owner: a Supabase Auth user exists purely so `owner` columns have something to
  reference (`id`, in `.env.local` as `STEAD_OWNER_ID`). Created via the admin API, tied to Dan's
  email, no password ever used and no login screen involved — nobody signs in with it. This keeps
  the multi-user foundation intact for when real sign-in arrives, per the Decisions below.
- **Phase 1 step 3: the passcode gate.** `supabase/migrations/20261005000200_passcode_attempts.sql`
  adds `public.passcode_attempts` (RLS on, no policies — service role only). `apps/web/src/middleware.ts`
  blocks every route on the Edge, checking an httpOnly cookie against `HMAC(STEAD_PASSCODE)`
  (`apps/web/src/lib/gate.ts`) with no database call, so changing the passcode invalidates every
  cookie for free. `apps/web/src/app/gate/page.tsx` is the number-pad screen; `apps/web/src/app/api/gate/route.ts`
  checks the lockout table, delays scaled to recent failures, and locks out for 15 minutes after 5
  wrong tries. Verified live: redirect when logged out, wrong code rejected, lockout after 5 tries,
  correct code sets the cookie and unlocks the app.

## Decisions (5 October 2026)

- **No sign-in system until later.** Dan's call: last build lost weeks to auth. Stead runs as a
  single user. The server talks to Supabase with the secret key and writes every row with one
  fixed owner id (`STEAD_OWNER_ID`), so the multi-user foundations stay intact and real sign-in
  can be added later without a migration. Do not build login screens, sessions or passkeys.
- **Claude spend: US$50 a month is the absolute limit.** Enforce it in the app from
  `claude_usage` (refuse in-app Claude calls once the month's total reaches $50; show a warning at
  $25), and Dan also sets a $50 monthly limit on the Anthropic Console workspace as a backstop.
- **Calendars: read every iCloud calendar except "Monkey Notes"** (shared with Chloe). Never read
  or write that one. Which calendar Stead writes new events into is asked the first time it
  needs to; until then, writing events is off.
- **Top-level areas:** Uni, Career, Faith, Health, Personal, People.
  - Uni holds each semester's units and UWAYE.
  - Career holds gyprocking (DHUSS Pty Ltd, K MAC E work) and INPEX.
  - Health holds training, exercise, diet and sleep.
  - People holds every person page.
  - Sub-areas sit under these via `parent`. New top-level areas still need Dan's say-so.
- **Access gate: a single 6-digit passcode.** Next.js middleware blocks every route (pages, API,
  server actions) until the code is entered. The code lives in `STEAD_PASSCODE` (Vercel secret).
  On success, set an httpOnly, Secure, SameSite=Lax cookie holding an HMAC of the code, valid 90
  days, so changing the code logs every device out. A 6-digit code is only safe with attempt
  limits: lock out after 5 wrong tries for 15 minutes, tracked server-side (a small table with
  owner and RLS, per the rules), plus a short delay on every failure. One number pad screen, no
  accounts, no username. Build it before any real secret goes into Vercel.
- **Family is a sub-area under People** and carries the Family weekly commitment, so its ring stays.
- **Daily driving starts when Stead works as a near-complete product**, not after Phase 1. In
  practice that means Phases 1 to 3 done (capture and today, closing the loop with Tend and
  Hearth, the Claude connector and the first migration pass). Learn (Phase 4) isn't required,
  since studying stays in the old Second Brain for now. Until then Dan tests through preview links.

## Next: Phase 1, capture and today

In order:

1. ~~Vercel project~~ Done 5 Oct: linked to this repo, root `apps/web`, functions pinned to `syd1`
   by `apps/web/vercel.json`. Only the two public Supabase variables are set.
2. ~~Supabase adapters~~ Done 5 Oct: `SupabaseFileStore` and `SupabaseItemIndex` in
   `apps/web/src/lib/supabase/`, wired into `openVault()`. Tested live against the real project.
   **Still local-only**: `SUPABASE_SECRET_KEY` and `STEAD_OWNER_ID` are in `.env.local` but not yet
   in Vercel (held back deliberately, see step 3).
3. ~~The passcode gate~~ Done 5 Oct: middleware, `/gate`, `/api/gate`, `passcode_attempts` table.
   Tested live (redirect, wrong code, lockout, correct code). **Not yet deployed**: `STEAD_PASSCODE`
   isn't in Vercel either. Next session (or Dan, directly): add `SUPABASE_SECRET_KEY`,
   `STEAD_OWNER_ID` and `STEAD_PASSCODE` to Vercel's production env, then the live site is gated
   and reads the real (currently empty) vault instead of the sample one.
4. ~~Seed the six top-level areas~~ Done 5 Oct: `apps/web/src/lib/seed-areas.ts` defines Uni,
   Career, Faith, Health, Personal, People, plus the known sub-areas (UWAYE under Uni; INPEX and
   Gyprocking under Career; Training, Exercise, Diet, Sleep under Health; Family under People).
   Icons and Blend colours are set on the four documented in `docs/design/README.md` (Family, Faith,
   Uni, Health); Career, Personal, People and the undocumented sub-areas are left unstyled rather
   than inventing a look Dan hasn't chosen. `seedAreas()` is idempotent (checks each slug, updates
   instead of duplicating) and was run twice against the live project through a temporary gated
   route: first run created all 14 areas, second run updated the same 14 with no duplicates,
   confirmed directly in `public.items`. **Flag for Dan:** Family carries the `commitment: 10`
   (hours/week) placeholder from the Phase 0 sample vault, since this step's brief named "the Family
   ring commitment" specifically. Faith, Uni and Health have no real weekly-hour target recorded
   anywhere, so their rings won't mean anything until Dan sets one.
5. **Partly done 5 Oct** (local-only pieces; Claude classification still blocked):
   - `packages/core/src/capture-dates.ts`: `parseNaturalDate()` handles today/tomorrow, a bare or
     "next" weekday, "in N days/weeks", and a time of day. Tested (`pnpm test`, 36 passing).
   - `apps/web/src/lib/claude-usage.ts`: `monthlyUsageStatus()` and `logClaudeUsage()` against
     `claude_usage`. Verified live: ok at $0, warn at $30, blocked at $55, test rows removed after.
   - `apps/web/src/app/capture-box.tsx` + `apps/web/src/app/api/capture/route.ts`: one input on
     Home, always files to the inbox as a capture (correct default per constitution §5 — nothing's
     classified yet, so everything is "genuinely unclear") and shows the local date guess as a chip.
     Verified live against the real vault.
   - **Not built: the Claude (Haiku) call for type, area and people.** `ANTHROPIC_API_KEY` is empty
     in `.env.local` — there's nothing to test it against, and writing an unexecuted integration
     isn't worth the risk of shipping something broken. Needs the key, then: call Haiku, log to
     `claude_usage` via `logClaudeUsage()`, check `monthlyUsageStatus()` before calling (refuse at
     `blocked`), and file confidently-classified captures straight to their type/area instead of
     leaving everything in the inbox.
   - **Flag for Dan:** two real capture items from live-testing the capture box are sitting in the
     real inbox ("call the dentist tomorrow 3pm", "idea: keep a list of MMA drills Ryan likes") —
     left in place rather than deleted, per "nothing deletes". Also still there from step 2's
     testing: a closed note titled "Smoke test note". Safe to archive/ignore, or triage for real if
     any happen to be useful.
6. Home v3 layout: Needs you, Today, next 7 days, side column. Design reference is the
   "Second Brain Home Directions" canvas.
7. 7-day calendar from iCloud over CalDAV (app-specific password as a Vercel secret), skipping
   "Monkey Notes".
8. Installable PWA with web push for timed tasks.

## Open decisions

- Hosted file store: Supabase Storage as primary, mirrored to a private GitHub vault repo.
  Chosen by Claude because iCloud can't be reached from a server; Dan can still change it.
