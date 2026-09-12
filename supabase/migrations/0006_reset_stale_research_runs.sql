-- Book Club Briefing: one-off cleanup for run_status rows stuck 'queued'/
-- 'running' by a real bug, not a genuinely in-flight run.
--
-- Before app/api/research/run-profile/[bookId]/workflow/route.ts was
-- exempted from middleware's auth gate (see middleware.ts), every QStash
-- callback into it was redirected to /login and rejected with a 405
-- *before* the workflow function's own code ever ran a single step --
-- including the step that would have recorded the failure. So any book a
-- run was attempted on during that window is left showing run_status =
-- 'queued' forever, with no real job behind it, and the "Run research
-- now" button permanently disabled for that book (see the isBusy check
-- in components/BookProfileResearch.tsx) since nothing ever flips it to
-- 'done' or 'failed'.
--
-- This resets any such stuck row back to 'idle' so the button is usable
-- again. Never edit 0001-0005; they are already applied.
update book_profile_drafts
set run_status = 'idle',
    run_error = 'Reset: this run was queued before the workflow callback route was exempted from the auth-cookie gate (see middleware.ts), so it never actually ran. Click "Run research now" again.',
    run_updated_at = now()
where run_status in ('queued', 'running');
