-- Book Club Briefing: lets a new book be added from inside the app instead
-- of editing data/books.json and redeploying. Never edit 0001_init.sql,
-- 0002_book_profiles.sql or 0003_book_profile_drafts.sql; they are already
-- applied.

-- One row per book added in-app. lib/books-db.ts merges these with the
-- three hand-authored fixture books in data/books.json (loaded via
-- lib/books.ts) into a single list, so nothing that already reads `books`
-- needs to know which source a given book came from.
--
-- A book added here starts with empty questions/collisions/lenses/
-- findings/sample_scores — deliberately. The three fixture books ship with
-- a hand-authored 5-7 question opinion-map skeleton (required categories,
-- one Going Deeper item, matching collision entries) that the Candidate
-- Collisions step fills in with verified research; admitResearchCandidate
-- (lib/research-promotions.ts) replaces one of those pre-existing slots,
-- it does not add a new one. A book added here can immediately use the
-- Reviews step (it needs no skeleton), but Draft Opinion Map / Candidate
-- Collisions / Chair / Meeting / Round-up stay unusable for it until that
-- skeleton is authored by some other means — out of scope for this table.
create table if not exists books (
  id             text primary key,
  book_title     text not null,
  author         text not null,
  questions      jsonb not null default '[]'::jsonb,
  diagnostics    jsonb not null default '{"valid":false,"issues":[],"warnings":[],"category_mix":{},"scored_question_count":0,"going_deeper_count":0}'::jsonb,
  summary        text not null default '',
  lenses         jsonb not null default '[]'::jsonb,
  collisions     jsonb not null default '[]'::jsonb,
  findings       jsonb not null default '[]'::jsonb,
  sample_scores  jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now(),
  created_by     text
);

alter table books enable row level security;

create policy "authorized users can read books" on books for select using (is_authorized());
create policy "authorized users can write books" on books for insert with check (is_authorized());
create policy "authorized users can update books" on books for update using (is_authorized());
create policy "authorized users can delete books" on books for delete using (is_authorized());
