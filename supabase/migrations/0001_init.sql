-- Vital schema. Fake demo data only. Access goes through server routes using the
-- service-role key; RLS is on with no public policies, except realtime reads of sessions.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  data jsonb not null,               -- matches PatientProfile in src/data/types.ts
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id),
  transcript jsonb not null default '[]'::jsonb,     -- array of turns
  injury_record jsonb not null default '{}'::jsonb,  -- structured injury record
  summary_es jsonb,                                  -- DoctorSummary (Spanish)
  summary_en jsonb,                                  -- PatientSummary (English)
  status text not null default 'active' check (status in ('active','ended')),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.summary_links (
  token text primary key default encode(gen_random_bytes(16), 'hex'),
  session_id uuid not null references public.sessions(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);

create index on public.sessions (profile_id);
create index on public.summary_links (session_id);

create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end $$ language plpgsql;
create trigger sessions_touch before update on public.sessions
  for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.summary_links enable row level security;

-- Realtime for the projector view: sessions are readable by session id (uuid is unguessable).
create policy "sessions readable" on public.sessions for select using (expires_at > now());
alter publication supabase_realtime add table public.sessions;
