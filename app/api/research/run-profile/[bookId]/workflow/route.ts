import { serve } from '@upstash/workflow/nextjs';
import { getDbClient } from '@/lib/supabase/dbClient';
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
 * payload in the first place. */
export const maxDuration = 300;

interface WorkflowPayload {
  bookId: string;
  email: string;
}

export const { POST } = serve<WorkflowPayload>(async (context) => {
  const { bookId, email } = context.requestPayload;

  const book = await context.run('load-book', async () => {
    const supabase = await getDbClient();
    const found = (await loadAllBooks(supabase)).find((b) => b.id === bookId);
    if (!found) throw new Error('Unknown book.');
    return { title: found.book_title, author: found.author };
  });

  await context.run('mark-running', async () => {
    const supabase = await getDbClient();
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
      const supabase = await getDbClient();
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
      const supabase = await getDbClient();
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
