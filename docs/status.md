# Build status

Updated 5 October 2026. Read this after CLAUDE.md to pick up where the last session left off.

## How work flows

Dan and Claude make decisions in the Second Brain Project chat ("directors") and write them here.
Claude Code ("dev team") reads this file at the start of each session, builds, and updates the
Done list at the end. Reviews happen in the director chat against the constitution and the design,
and by Dan using the preview deployment on his phone.

## Done

- Phase 0: constitution (`docs/constitution.md`), item format (`docs/item-format.md`), headless
  core with tests (`packages/core`), Next.js skeleton (`apps/web`), sample vault.
- Supabase project "Stead" (ref `lbwxmmsdyhneeijpjlib`, Sydney). Both migrations in
  `supabase/migrations` are applied. Security advisor is clean.
- Public config in `apps/web/.env.example`. Secrets live only in `.env.local` and Vercel.

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
- **Daily driving starts when Stead works as a near-complete product**, not after Phase 1. In
  practice that means Phases 1 to 3 done (capture and today, closing the loop with Tend and
  Hearth, the Claude connector and the first migration pass). Learn (Phase 4) isn't required,
  since studying stays in the old Second Brain for now. Until then Dan tests through preview links.

## Next: Phase 1, capture and today

In order:

1. Vercel project linked to this repo, functions in Sydney (`syd1`). Dan creates it so every push
   gets a preview link he can open on his phone.
2. Supabase adapters behind the core's interfaces: a `FileStore` on the private `vault` bucket
   (files under `<owner id>/`) and an `ItemIndex` on `public.items` + `public.links`, both using the
   secret key server-side only. Keep them outside `packages/core`.
3. Seed the six top-level areas (and their known sub-areas) as area items.
4. Capture box with "Saves as" chips; natural-language dates parsed locally first, Claude (Haiku)
   only for type, area and people. Every call logged to `claude_usage` and checked against the cap.
5. Home v3 layout: Needs you, Today, next 7 days, side column. Design reference is the
   "Second Brain Home Directions" canvas.
6. 7-day calendar from iCloud over CalDAV (app-specific password as a Vercel secret), skipping
   "Monkey Notes".
7. Installable PWA with web push for timed tasks.

## Open decisions

- **A lightweight access gate.** Claude recommends a single shared passcode checked by Next.js
  middleware before anything with real data, the CalDAV password or the Anthropic key goes live,
  because the app will sit on a public URL. It's a lock on the front door, not a sign-in system:
  about 20 lines, no accounts. Waiting on Dan.
- **Where the Family ring lives** now that Family isn't a top-level area. Proposed: a Family
  sub-area under People that carries the weekly commitment, so the ring survives. Waiting on Dan.
- Hosted file store: Supabase Storage as primary, mirrored to a private GitHub vault repo.
  Chosen by Claude because iCloud can't be reached from a server; Dan can still change it.
