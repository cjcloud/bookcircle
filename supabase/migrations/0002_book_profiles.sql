-- Book Club Briefing: book summary & reception ("Reviews" step).
-- Adds two tables alongside the schema in 0001_init.sql; never edit that
-- file, it is already applied.

-- Published, verified book profile: genre, spoiler-aware summaries and
-- attributed opinion excerpts. One row per book; a republish (via
-- app/api/research/publish-profile) fully replaces the row rather than
-- merging, matching how research_promotions rows are individually curated.
create table if not exists book_profiles (
  book_id             text primary key,
  genre               text not null,
  summary_no_spoilers text not null,
  summary_spoilers    text not null,
  opinions            jsonb not null,
  evidence_digest     text not null,
  verified_at         timestamptz not null,
  source_ids          text[] not null,
  promoted_by         text,
  promoted_at         timestamptz not null default now()
);

-- Published positive/negative points distilled from reviews. Many rows per
-- book; a republish deletes and re-inserts all of a book's rows together.
-- Strength (and therefore the red/amber/green tier shown in the UI) is
-- derived from array_length(source_ids,1) wherever this is read, not
-- stored, so it can never drift from the evidence it's based on.
create table if not exists review_points (
  id           uuid primary key default gen_random_uuid(),
  book_id      text not null,
  sentiment    text not null check (sentiment in ('positive','negative')),
  point_text   text not null,
  source_ids   text[] not null,
  evidence     jsonb not null,
  verified_at  timestamptz not null,
  promoted_by  text,
  promoted_at  timestamptz not null default now()
);

alter table book_profiles enable row level security;
alter table review_points enable row level security;

-- Same is_authorized() gate as every existing table (see 0001_init.sql).
create policy "authorized users can read book profiles" on book_profiles for select using (is_authorized());
create policy "authorized users can write book profiles" on book_profiles for insert with check (is_authorized());
create policy "authorized users can update book profiles" on book_profiles for update using (is_authorized());
create policy "authorized users can delete book profiles" on book_profiles for delete using (is_authorized());

create policy "authorized users can read review points" on review_points for select using (is_authorized());
create policy "authorized users can write review points" on review_points for insert with check (is_authorized());
create policy "authorized users can update review points" on review_points for update using (is_authorized());
create policy "authorized users can delete review points" on review_points for delete using (is_authorized());
