-- Book Club Briefing: background-job status tracking for automated research runs.
-- Adds run_status columns to book_profile_drafts so a run triggered by
-- "Run research now" can execute as a background job (Upstash Workflow --
-- see app/api/research/run-profile/[bookId]/workflow/route.ts) instead of
-- inline inside the single Vercel request the button click makes. Running
-- discover -> propose -> verify back to back in one request was hitting
-- Vercel's per-invocation time limit in production (confirmed via a live
-- 504 FUNCTION_INVOCATION_TIMEOUT after exactly 300 seconds -- see
-- RESEARCH_MILESTONE.md). Never edit 0001-0004; they are already applied.

-- report/status describe the LAST COMPLETED run's content and its
-- verification outcome; they can be null before a book's first run ever
-- finishes, so both must stop being required here. run_status/run_error/
-- run_updated_at describe whatever run is CURRENTLY in flight (if any)
-- and are what the "Reviews" panel polls to show progress.
alter table book_profile_drafts alter column report drop not null;
alter table book_profile_drafts alter column status drop not null;

alter table book_profile_drafts
  add column if not exists run_status text not null default 'idle'
    check (run_status in ('idle', 'queued', 'running', 'done', 'failed')),
  add column if not exists run_error text,
  add column if not exists run_updated_at timestamptz not null default now();
