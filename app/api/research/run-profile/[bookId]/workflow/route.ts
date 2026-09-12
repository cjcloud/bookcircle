import { serve } from '@upstash/workflow/nextjs';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadAllBooks } from '@/lib/books-db';
import { saveDraftReport, loadDraftReport, setDraftRunStatus } from '@/lib/book-profile-db';
import { discoverReviewSources, proposeBookProfile, verifyBookProfile } from '@/lib/claude-research';

/** The actual discover -> propose -> verify pipeline for one book, run as
 * an Upstash Workflow instead of inline inside a single Vercel request.
 *
 * Each context.run() step below is its own short Vercel invocation,
 * orchestrated by QStash calling back into this same route between steps
 * (serve() verifies that call is genuinely from QStash using
 * QSTASH_CURRENT_SIGNING_KEY / QSTASH_NEXT_SIGNING_KEY automatically) --
 * so no single call has to run discover+propose+verify back to back the
 * way app/api/research/run-profile/[bookId]/route.ts used to. That
 * all-in-one-request approach is what was hitting Vercel's per-invocation
 * time limit in production: confirmed live via a 504
 * FUNCTION_INVOCATION_TIMEOUT after exactly 300 seconds on the Hobby plan
 * (see RESEARCH_MILESTONE.md). Splitting into per-stage steps here doesn't
 * remove Vercel's ceiling on any single invocation, but each stage alone
 * is well under it even though all three together weren't.
 *
 * This route must never be called directly by the browser -- only
 * ../route.ts's POST handler starts a run, via the Upstash Client's
 * trigger(), which is how QStash learns this URL and this bookId/email
 * payload in the first place.
 *
 * Every DB call here uses createAdminClient() (service-role, bypasses
 * RLS), not getDbClient()/createClient() -- QStash's callback carries no
 * browser session cookie at all, so the RLS-respecting client would have
 * no auth.jwt() email for is_authorized() to check, and every read/write
 * against an RLS-protected table (books, book_profile_drafts, ...) would
 * silently return nothing. That's exactly what broke the very first real
 * run: a fixture book (hardcoded in lib/books.ts, never gated by RLS)
 * looked fine, but an in-app-added book (a real row in the `books` table)
 * failed at the very first step with "Unknown book." This is safe here
 * specifically because this route can only ever be triggered by
 * ../route.ts's POST handler *after* it already ran requireAuthorizedUser()
 * -- the authorization decision was made before the job was ever queued,
 * this step just needs to actually see the data. */
export const maxDuration = 300;

interface WorkflowPayload {
  bookId: string;
  email: string;
}

export const { POST } = serve<WorkflowPayload>(async (context) => {
  const { bookId, email } = context.requestPayload;

  const book = await context.run('load-book', async () => {
    const supabase = createAdminClient();
    const found = (await loadAllBooks(supabase)).find((b) => b.id === bookId);
    if (!found) throw new Error('Unknown book.');
    return { title: found.book_title, author: found.author };
  });

  await context.run('mark-running', async () => {
    const supabase = createAdminClient();
    await setDraftRunStatus(supabase, bookId, 'running', email);
  });

  try {
    const sources = await context.run('discover', async () =>
      discoverReviewSources(bookId, book.title, book.author));

    const proposal = await context.run('propose', async () =>
      proposeBookProfile(sources));

    const verification = await context.run('verify', async () =>
      verifyBookProfile(proposal));

    await context.run('save-success', async () => {
      const supabase = createAdminClient();
      const report = {
        bookId,
        generatedAt: new Date().toISOString(),
        model: process.env.ANTHROPIC_MODEL,
        sourceCount: proposal.sources.length,
        proposal,
        verification,
        releaseApproved: false,
      };
      await saveDraftReport(supabase, bookId, report, email);
      await setDraftRunStatus(supabase, bookId, 'done', email);
    });
  } catch (runError) {
    // Same "never let a failed re-run destroy a previously successful
    // draft" protection the old inline handler had: only write a
    // failure report over the top if there was nothing worth protecting
    // yet. run_status still flips to 'failed' either way, so the UI can
    // tell the difference between "no run yet" and "last run failed but
    // an older successful one is still shown".
    await context.run('save-failure', async () => {
      const supabase = createAdminClient();
      const message = runError instanceof Error ? runError.message : 'The research run failed.';
      const existing = await loadDraftReport(supabase, bookId);
      const existingHadProposal = !!(existing?.report as { proposal?: unknown } | undefined)?.proposal;
      if (!existingHadProposal) {
        const report = {
          bookId,
          generatedAt: new Date().toISOString(),
          model: process.env.ANTHROPIC_MODEL,
          sourceCount: 0,
          proposal: null,
          verification: { status: 'unresolved', reason: message, releaseApproved: false },
          releaseApproved: false,
        };
        await saveDraftReport(supabase, bookId, report, email);
      }
      await setDraftRunStatus(supabase, bookId, 'failed', email, message);
    });
  }
});
