-- Stead: the index over the vault, plus the private file bucket.
-- The files in storage are the source of truth. Every table here can be truncated and rebuilt
-- from them (Vault.rebuildIndex), so nothing in this schema is the only copy of anything.
-- Multi-user-safe from day one: every row has an owner and row-level security enforces it.

create table public.items (
  id            text primary key,                 -- ULID from the file's frontmatter
  owner         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  slug          text not null,
  path          text not null,                    -- vault-relative, e.g. tasks/renew-rego.md
  type          text not null check (type in ('task','note','person','question','decision','reflection','learn','area','capture')),
  title         text not null,
  state         text not null default 'open' check (state in ('open','closed')),
  mode          text not null default 'store' check (mode in ('store','learn')),
  areas         text[] not null default '{}',
  people        text[] not null default '{}',
  tags          text[] not null default '{}',
  due           text,                             -- date or datetime, as written in the file
  "when"        text,
  confidential  boolean not null default false,
  fields        jsonb not null,                   -- the full frontmatter, unknown fields included
  body          text not null default '',
  created       timestamptz not null,
  updated       timestamptz not null,
  closed        timestamptz,
  file_hash     text,                             -- detects files changed outside the app
  unique (owner, slug)
);

create index items_owner_type_state on public.items (owner, type, state);
create index items_owner_areas on public.items using gin (areas);
create index items_owner_people on public.items using gin (people);
create index items_search on public.items using gin (to_tsvector('english', title || ' ' || body));

create table public.links (
  owner      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  from_slug  text not null,
  to_slug    text not null,
  kind       text not null,
  primary key (owner, from_slug, to_slug, kind)
);
create index links_to on public.links (owner, to_slug);

-- Per-user Claude spend, so a monthly cap can be enforced and other users never cost Dan.
create table public.claude_usage (
  id             bigint generated always as identity primary key,
  owner          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  at             timestamptz not null default now(),
  job            text not null,                   -- parse_capture, tend, summary_card …
  model          text not null,
  input_tokens   integer not null,
  output_tokens  integer not null,
  cached_tokens  integer not null default 0,
  cost_usd       numeric(10, 5) not null
);
create index claude_usage_owner_at on public.claude_usage (owner, at);

alter table public.items enable row level security;
alter table public.links enable row level security;
alter table public.claude_usage enable row level security;

create policy "own items" on public.items for all
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
create policy "own links" on public.links for all
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
-- Usage is written by the server with the service role; users can only read their own.
create policy "read own usage" on public.claude_usage for select
  using (owner = (select auth.uid()));

-- The vault itself: one private bucket, each user's files under a folder named by their id.
insert into storage.buckets (id, name, public) values ('vault', 'vault', false)
  on conflict (id) do nothing;

create policy "vault: own folder read" on storage.objects for select
  using (bucket_id = 'vault' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "vault: own folder write" on storage.objects for insert
  with check (bucket_id = 'vault' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "vault: own folder update" on storage.objects for update
  using (bucket_id = 'vault' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- No delete policy on purpose: Stead never deletes files.
