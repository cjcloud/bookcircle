import { loadAllBooks } from '@/lib/books-db';
import { requireAuthorizedUser, UnauthorizedError } from '@/lib/auth/requireAuthorizedUser';
import { getDbClient } from '@/lib/supabase/dbClient';
import { publishBookProfile } from '@/lib/book-profile-db';
import { prepareProfileEvidence } from '@/lib/profile-evidence';
import type { BookProfileInput } from '@/lib/profile-evidence';

/** Publishes a verified book-profile research report (produced by
 * scripts/research-book-profile.ts and curated into data/<book-id>-profile-research.json,
 * same convention as the existing *-research-preview.json files) into the
 * live book_profiles/review_points tables. Mirrors app/api/research/promote/route.ts:
 * requireAuthorizedUser() first, getDbClient() for the dev-bypass-aware
 * client, and a hard server-side re-check of the verification status rather
 * than trusting the client — a report is never released on the strength of
 * a UI button alone. */
export async function POST(request: Request) {
  try {
    const email = await requireAuthorizedUser();
    const text = await request.text();
    if (text.length > 2_000_000) return Response.json({ error: 'Request too large.' }, { status: 413 });
    const body = JSON.parse(text);

    const bookId = typeof body?.bookId === 'string' ? body.bookId : null;
    const report = body?.report;
    if (!report || typeof report !== 'object') return Response.json({ error: 'Unrecognized request.' }, { status: 400 });

    const supabase = await getDbClient();
    if (!bookId || !(await loadAllBooks(supabase)).some((b) => b.id === bookId)) return Response.json({ error: 'Unknown book.' }, { status: 400 });

    const proposal = report.proposal as BookProfileInput | null;
    const verification = report.verification;
    if (!proposal || !verification || verification.status !== 'model_supported') {
      return Response.json({ error: 'Only a fully verified (model_supported) report can be published.' }, { status: 400 });
    }

    // Re-derive the evidence digest server-side rather than trusting the
    // one embedded in the report, so a hand-edited or stale file can't be
    // published under a digest that no longer matches its own content.
    const prepared = prepareProfileEvidence(proposal);
    if (prepared.status !== 'ready_for_verification' || prepared.inputDigest !== verification.inputDigest) {
      return Response.json({ error: 'This report no longer matches its verified evidence digest.' }, { status: 400 });
    }

    await publishBookProfile(
      supabase,
      bookId,
      {
        genre: proposal.genre,
        summaryNoSpoilers: proposal.summaryNoSpoilers,
        summarySpoilers: proposal.summarySpoilers,
        opinions: proposal.opinions,
        evidenceDigest: prepared.inputDigest,
        verifiedAt: verification.verifiedAt,
        sourceIds: proposal.sources.map((s) => s.id),
      },
      proposal.points,
      email,
    );

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return Response.json({ error: error.message }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : 'Could not publish this profile.' }, { status: 400 });
  }
}
