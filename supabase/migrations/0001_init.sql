-- Book Club Briefing: multi-user schema
-- Whitelist-gated auth (Supabase email OTP) + shared workspace/research state.

create extension if not exists "pgcrypto";

-- Whitelist of people allowed to sign in. `role` is unused by application
-- logic today (everyone behaves the same) but exists so future permission
-- differences are a data change, not a schema migration.
create table if not exists authorized_emails (
  email      text primary key,
  role       text not null default 'member',
  added_at   timestamptz not null default now(),
  added_by   text
);

-- Shared draft/history/meeting state per book. Replaces the old
-- browser-local `bcb-admin-v11:<book-id>` localStorage entry: one row per
-- book, visible to every authorized user instead of one per browser.
create table if not exists workspaces (
  book_id    text primary key,
  state      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Captured review evidence (the research "library"). One row per unique
-- captured source text, keyed by its sha256 digest for natural dedup.
create table if not exists research_sources (
  id              text not null,
  book_id         text not null,
  url             text not null,
  title           text not null,
  author          text not null,
  retrieved_at    timestamptz not null,
  text            text not null,
  text_scope      text not null,
  digest          text not null unique,
  origin_evidence jsonb,
  created_at      timestamptz not null default now(),
  primary key (book_id, id)
);

-- Proposal + independent-verification output from a research run.
create table if not exists research_candidates (
  id            uuid primary key default gen_random_uuid(),
  book_id       text not null,
  source_ids    text[] not null,
  position_a    text not null,
  position_b    text not null,
  member_wording text not null,
  claims        jsonb not null,
  verification  jsonb not null,
  created_at    timestamptz not null default now()
);

-- Controlled draft admission manifest. Replaces the static array in
-- lib/research-promotions.ts: same fields, same meaning, now shared and
-- server-enforced instead of shipped to the browser as a source file.
create table if not exists research_promotions (
  book_id           text not null,
  candidate_id      text not null,
  target_question_id text not null,
  collision_id      text not null,
  category          text not null,
  proposition       text not null,
  subtext           text not null,
  evidence_digest   text not null,
  verified_at       timestamptz not null,
  sources           text[] not null,
  promoted_by       text,
  promoted_at       timestamptz not null default now(),
  primary key (book_id, candidate_id)
);

-- Row Level Security: every table is only readable/writable by a
-- signed-in user whose JWT email is present in authorized_emails.
-- This is the actual trust boundary now that a real server exists —
-- app-layer checks in API routes are defense in depth on top of this,
-- not the only enforcement.
create or replace function is_authorized() returns boolean
language sql stable
as $$
  select exists (
    select 1 from authorized_emails
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

alter table authorized_emails enable row level security;
alter table workspaces enable row level security;
alter table research_sources enable row level security;
alter table research_candidates enable row level security;
alter table research_promotions enable row level security;

-- Nobody reads the whitelist itself via the client API (only server-side
-- service-role code checks it during login); everything else is
-- readable/writable by any authorized signed-in user.
create policy "authorized users can read workspaces" on workspaces for select using (is_authorized());
create policy "authorized users can write workspaces" on workspaces for insert with check (is_authorized());
create policy "authorized users can update workspaces" on workspaces for update using (is_authorized());

create policy "authorized users can read sources" on research_sources for select using (is_authorized());
create policy "authorized users can write sources" on research_sources for insert with check (is_authorized());

create policy "authorized users can read candidates" on research_candidates for select using (is_authorized());
create policy "authorized users can write candidates" on research_candidates for insert with check (is_authorized());

create policy "authorized users can read promotions" on research_promotions for select using (is_authorized());
create policy "authorized users can write promotions" on research_promotions for insert with check (is_authorized());
create policy "authorized users can update promotions" on research_promotions for update using (is_authorized());
