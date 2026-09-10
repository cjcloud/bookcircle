import { loadAllBooks } from '@/lib/books-db';
import { requireAuthorizedUser, UnauthorizedError } from '@/lib/auth/requireAuthorizedUser';
import { getDbClient } from '@/lib/supabase/dbClient';
import { saveDraftReport, loadDraftReport } from '@/lib/book-profile-db';
import { discoverReviewSources, proposeBookProfile, verifyBookProfile } from '@/lib/claude-research';

/** Runs the fully-automated "step 1" pipeline end to end for one book:
 * discoverReviewSources (Claude's own web_search + web_fetch tools find and
 * capture real review pages, no hand-assembled sources file) ->
 * proposeBookProfile -> verifyBookProfile, then saves whatever the run
 * produced (success or failure) as that book's draft via saveDraftReport,
 * matching scripts/research-book-profile.ts's own "always write a report,
 * never silently approve" convention. Nothing here publishes anything —
 * publishing still requires the separate "Publish to app" action in
 * components/BookProfileResearch.tsx, gated on verification.status ===
 * 'model_supported', exactly as before.
 *
 * This route is genuinely slow — discovery alone can take a couple of
 * minutes of the model searching and fetching pages, and propose+verify
 * add more on top. maxDuration below asks Vercel for as long a serverless
 * execution window as the plan allows; on a plan whose real ceiling is
 * shorter than that (e.g. Hobby's fixed limits), this route can still time
 * out in production even though it works in local/dev testing. If that
 * happens the fix is either a paid plan with a longer function timeout or
 * moving this to a background job — flagged here rather than discovered
 * silently after deploy. */
export const maxDuration = 300;

export async function POST(_request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  let bookId = '';
  try {
    const email = await requireAuthorizedUser();
    ({ bookId } = await params);
    const supabase = await getDbClient();
    const book = (await loadAllBooks(supabase)).find((b) => b.id === bookId);
    if (!book) return Response.json({ error: 'Unknown book.' }, { status: 400 });

    try {
      const sources = await discoverReviewSources(bookId, book.book_title, book.author);
      const proposal = await proposeBookProfile(sources);
      const verification = await verifyBookProfile(proposal);
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
      return Response.json({ report });
    } catch (runError) {
      // A failed run still produces a diagnostic report so the failure is
      // visible in the UI instead of vanishing — same convention as the CLI
      // script. But book_profile_drafts holds one row per book (saveDraftReport
      // upserts on book_id), so saving unconditionally here would let a single
      // flaky re-run (e.g. discoverReviewSources finding too few sources this
      // time) silently destroy a previous run that actually produced a usable
      // profile, with no way back short of a run that happens to succeed again.
      // Only persist a total failure (no proposal at all) when there's nothing
      // worth protecting yet; otherwise show this run's failure in the response
      // without touching the stored draft, so reloading the panel still shows
      // the last run that actually worked.
      const report = {
        bookId,
        generatedAt: new Date().toISOString(),
        model: process.env.ANTHROPIC_MODEL,
        sourceCount: 0,
        proposal: null,
        verification: {
          status: 'unresolved',
          reason: runError instanceof Error ? runError.message : 'The research run failed.',
          releaseApproved: false,
        },
        releaseApproved: false,
      };
      const existing = await loadDraftReport(supabase, bookId);
      const existingHadProposal = !!(existing?.report as { proposal?: unknown } | undefined)?.proposal;
      if (!existingHadProposal) {
        await saveDraftReport(supabase, bookId, report, email);
      } else {
        report.verification.reason += ' Your previous successful run for this book was kept — reload this step to see it again.';
      }
      return Response.json({ report });
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) return Response.json({ error: error.message }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : 'Could not run the research pipeline.' }, { status: 400 });
  }
}

/** Returns the latest saved draft (or null if none has been run yet), so
 * the panel can show the last result on load without re-running anything. */
export async function GET(_request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  try {
    await requireAuthorizedUser();
    const { bookId } = await params;
    const supabase = await getDbClient();
    if (!(await loadAllBooks(supabase)).some((b) => b.id === bookId)) return Response.json({ error: 'Unknown book.' }, { status: 400 });
    const draft = await loadDraftReport(supabase, bookId);
    return Response.json({ report: draft?.report ?? null });
  } catch (error) {
    if (error instanceof UnauthorizedError) return Response.json({ error: error.message }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : 'Could not load the research run.' }, { status: 400 });
  }
}
