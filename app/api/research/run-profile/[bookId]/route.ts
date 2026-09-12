import { loadAllBooks } from '@/lib/books-db';
import { requireAuthorizedUser, UnauthorizedError } from '@/lib/auth/requireAuthorizedUser';
import { getDbClient } from '@/lib/supabase/dbClient';
import { loadDraftReport, setDraftRunStatus } from '@/lib/book-profile-db';
import { Client } from '@upstash/workflow';

/** Starts (POST) or reports on (GET) the fully-automated "step 1" research
 * pipeline for one book. The pipeline itself -- discoverReviewSources ->
 * proposeBookProfile -> verifyBookProfile -- now runs as a background job
 * (see ./workflow/route.ts) instead of inline in this request: running all
 * three stages back to back here used to hit Vercel's per-invocation time
 * limit in production (confirmed via a live 504 FUNCTION_INVOCATION_TIMEOUT
 * after exactly 300 seconds -- see RESEARCH_MILESTONE.md).
 *
 * POST does almost no work itself: it records that a run was requested and
 * asks Upstash's Client to trigger the workflow, so it returns in well
 * under a second regardless of how long the actual research run takes.
 * components/BookProfileResearch.tsx polls GET below afterwards to learn
 * when it's done -- this is deliberately NOT real-time; the user starts a
 * run and checks back later, there is no socket or push update. */
export async function POST(request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  let bookId = '';
  try {
    const email = await requireAuthorizedUser();
    ({ bookId } = await params);
    const supabase = await getDbClient();
    if (!(await loadAllBooks(supabase)).some((b) => b.id === bookId)) return Response.json({ error: 'Unknown book.' }, { status: 400 });

    const token = process.env.QSTASH_TOKEN;
    if (!token) return Response.json({ error: 'Background research is not configured yet (missing QSTASH_TOKEN).' }, { status: 500 });

    await setDraftRunStatus(supabase, bookId, 'queued', email);

    const origin = new URL(request.url).origin;
    const client = new Client({ token });
    await client.trigger({
      url: `${origin}/api/research/run-profile/${bookId}/workflow`,
      body: JSON.stringify({ bookId, email }),
      retries: 2,
    });

    return Response.json({ queued: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return Response.json({ error: error.message }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : 'Could not queue the research run.' }, { status: 400 });
  }
}

/** Returns the latest saved draft (or null if none has finished yet), plus
 * the status of whatever run is currently in flight, so the panel can show
 * "in progress" instead of nothing while polling. */
export async function GET(_request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  try {
    await requireAuthorizedUser();
    const { bookId } = await params;
    const supabase = await getDbClient();
    if (!(await loadAllBooks(supabase)).some((b) => b.id === bookId)) return Response.json({ error: 'Unknown book.' }, { status: 400 });
    const draft = await loadDraftReport(supabase, bookId);
    return Response.json({
      report: draft?.report ?? null,
      runStatus: draft?.runStatus ?? 'idle',
      runError: draft?.runError ?? null,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return Response.json({ error: error.message }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : 'Could not load the research run.' }, { status: 400 });
  }
}
