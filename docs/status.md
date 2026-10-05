# Build status

Updated 5 October 2026. Read this after CLAUDE.md to pick up where the last session left off.

## Done

- Phase 0: constitution (`docs/constitution.md`), item format (`docs/item-format.md`), headless
  core with tests (`packages/core`), Next.js skeleton (`apps/web`), sample vault.
- Supabase project "Stead" (ref `lbwxmmsdyhneeijpjlib`, Sydney). Both migrations in
  `supabase/migrations` are applied. Security advisor is clean.
- Public config in `apps/web/.env.example`. Secrets live only in `.env.local` and Vercel.

## Next: Phase 1, capture and today

In order:

1. Sign-in. Proposed: email magic link, then a passkey so the phone uses Face ID. No passwords.
   Waiting on Dan's yes.
2. Supabase adapters behind the core's interfaces: a `FileStore` on the private `vault` bucket
   (files under `<user id>/`) and an `ItemIndex` on `public.items` + `public.links`. Keep them
   outside `packages/core`.
3. Capture box with "Saves as" chips; natural-language dates parsed locally first, Claude (Haiku)
   only for type/area/people.
4. Home v3 layout: Needs you, Today, next 7 days, side column. Design reference is the
   "Second Brain Home Directions" canvas.
5. 7-day calendar from Apple Calendar over CalDAV (app-specific password, stored as a Vercel secret).
6. Installable PWA with web push for timed tasks.
7. Vercel project linked to this repo, region Sydney (syd1). Dan creates it.

## Open decisions

- Sign-in method (above).
- Hosted file store: Supabase Storage as primary, mirrored to a private GitHub vault repo.
  Chosen by Claude on 5 Oct because iCloud can't be reached from a server; Dan can still change it.
