-- The passcode gate's attempt counter and lockout (docs/status.md Decisions).
-- Only the server (service role) ever touches this table; Dan doesn't sign in through Supabase
-- Auth, so there are no policies for anon or authenticated roles.
create table public.passcode_attempts (
  owner        uuid primary key references auth.users (id) on delete cascade,
  failures     integer not null default 0,
  locked_until timestamptz,
  updated      timestamptz not null default now()
);

alter table public.passcode_attempts enable row level security;
grant all on public.passcode_attempts to service_role;
