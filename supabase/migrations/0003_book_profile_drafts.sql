-- Book Club Briefing: stores the latest automated review-discovery run per
-- book so the "Reviews" admin panel can show live results (and let someone
-- click "Publish to app") without a code edit + redeploy cycle. Never edit
-- 0001_init.sql or 0002_book_profiles.sql; they are already applied.

-- One row per book: the most recent report produced by running
-- discoverReviewSources -> proposeBookProfile -> verifyBookProfile end to
-- end (app/api/research/run-profile). A fresh run overwrites the row.
-- `report` is the same shape written to data/<book-id>-profile-research.json
-- by the CLI script, so components/BookProfileResearch.tsx can render it
-- identically whether it came from a file or this table.
create table if not exists book_profile_drafts (
  book_id      text primary key,
  report       jsonb not null,
  status       text not null,
  created_at   timestamptz not null default now(),
  requested_by text
);

alter table book_profile_drafts enable row level security;

create policy "authorized users can read book profile drafts" on book_profile_drafts for select using (is_authorized());
create policy "authorized users can write book profile drafts" on book_profile_drafts for insert with check (is_authorized());
create policy "authorized users can update book profile drafts" on book_profile_drafts for update using (is_authorized());
create policy "authorized users can delete book profile drafts" on book_profile_drafts for delete using (is_authorized());
