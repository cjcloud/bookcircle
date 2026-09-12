import type { SupabaseClient } from '@supabase/supabase-js';
import type { OpinionExcerpt, ReviewPoint } from './profile-evidence.ts';

/** Loaded shape for the published book profile plus its points, as read by
 * app/api/book-profile/[bookId]/route.ts. Strength tiers are NOT stored or
 * computed here — that stays purely a UI concern in components/BookReviews.tsx,
 * derived straight from each point's evidence.length, so it can never drift
 * from what's actually in the row. */
export interface BookProfile {
  bookId: string;
  genre: string;
  summaryNoSpoilers: string;
  summarySpoilers: string;
  opinions: OpinionExcerpt[];
  evidenceDigest: string;
  verifiedAt: string;
  sourceIds: string[];
}

export interface PublishedReviewPoint extends ReviewPoint {
  id: string;
}

export async function loadBookProfile(supabase: SupabaseClient, bookId: string): Promise<{ profile: BookProfile | null; points: PublishedReviewPoint[] }> {
  const [profileResult, pointsResult] = await Promise.all([
    supabase.from('book_profiles').select('*').eq('book_id', bookId).maybeSingle(),
    supabase.from('review_points').select('*').eq('book_id', bookId),
  ]);
  if (profileResult.error) throw Error('Could not load the book profile.');
  if (pointsResult.error) throw Error('Could not load the review points.');

  const row = profileResult.data as Record<string, unknown> | null;
  const profile: BookProfile | null = row ? {
    bookId: row.book_id as string,
    genre: row.genre as string,
    summaryNoSpoilers: row.summary_no_spoilers as string,
    summarySpoilers: row.summary_spoilers as string,
    opinions: (row.opinions as OpinionExcerpt[]) ?? [],
    evidenceDigest: row.evidence_digest as string,
    verifiedAt: row.verified_at as string,
    sourceIds: (row.source_ids as string[]) ?? [],
  } : null;

  const points: PublishedReviewPoint[] = ((pointsResult.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    sentiment: r.sentiment as 'positive' | 'negative',
    text: r.point_text as string,
    evidence: (r.evidence as { sourceId: string; passage: string }[]) ?? [],
  }));

  return { profile, points };
}

/** Fully replaces a book's published profile and points in one call, per
 * the plan's "a republish fully replaces the row" semantics — no incremental
 * merge logic to get wrong. Points are deleted and re-inserted together. */
export async function publishBookProfile(
  supabase: SupabaseClient,
  bookId: string,
  profile: { genre: string; summaryNoSpoilers: string; summarySpoilers: string; opinions: OpinionExcerpt[]; evidenceDigest: string; verifiedAt: string; sourceIds: string[] },
  points: ReviewPoint[],
  promotedBy: string,
): Promise<void> {
  const { error: profileError } = await supabase.from('book_profiles').upsert({
    book_id: bookId,
    genre: profile.genre,
    summary_no_spoilers: profile.summaryNoSpoilers,
    summary_spoilers: profile.summarySpoilers,
    opinions: profile.opinions,
    evidence_digest: profile.evidenceDigest,
    verified_at: profile.verifiedAt,
    source_ids: profile.sourceIds,
    promoted_by: promotedBy,
    promoted_at: new Date().toISOString(),
  });
  if (profileError) throw Error('Could not save the book profile.');

  const { error: deleteError } = await supabase.from('review_points').delete().eq('book_id', bookId);
  if (deleteError) throw Error('Could not replace the review points.');

  if (points.length) {
    const { error: insertError } = await supabase.from('review_points').insert(points.map((point) => ({
      book_id: bookId,
      sentiment: point.sentiment,
      point_text: point.text,
      source_ids: point.evidence.map((e) => e.sourceId),
      evidence: point.evidence,
      verified_at: profile.verifiedAt,
      promoted_by: promotedBy,
      promoted_at: new Date().toISOString(),
    })));
    if (insertError) throw Error('Could not save the review points.');
  }
}

/** A saved run of the automated discover->propose->verify pipeline for one
 * book, stored so the "Reviews" admin panel can show it without a code edit
 * + redeploy cycle. `report` matches the shape already used by the curated
 * data/<book-id>-profile-research.json fixtures and by
 * scripts/research-book-profile.ts's own output, so
 * components/BookProfileResearch.tsx renders it identically either way.
 * `status` mirrors report.verification.status ('model_supported' |
 * 'unsupported' | 'unresolved') so the caller can show a run's outcome
 * without re-parsing the report.
 *
 * `report`/`status` describe the LAST COMPLETED run; they're null before a
 * book's very first run has ever finished. `runStatus` ('idle' | 'queued' |
 * 'running' | 'done' | 'failed') describes whatever run is CURRENTLY in
 * flight, if any — see setDraftRunStatus below and
 * app/api/research/run-profile/[bookId]/workflow/route.ts, which is what
 * actually runs the pipeline now (as a background job, not inline in the
 * request that used to time out in production). */
export interface BookProfileDraft {
  bookId: string;
  report: Record<string, unknown> | null;
  status: string | null;
  createdAt: string | null;
  requestedBy: string | null;
  runStatus: string;
  runError: string | null;
  runUpdatedAt: string;
}

export async function saveDraftReport(
  supabase: SupabaseClient,
  bookId: string,
  report: Record<string, unknown>,
  requestedBy: string,
): Promise<void> {
  const status = ((report as { verification?: { status?: string } }).verification?.status) ?? 'unresolved';
  const { error } = await supabase.from('book_profile_drafts').upsert({
    book_id: bookId,
    report,
    status,
    created_at: new Date().toISOString(),
    requested_by: requestedBy,
  });
  if (error) throw Error('Could not save the research run.');
}

/** Records the status of whatever background run is currently in flight
 * for a book, independent of any *completed* report (saveDraftReport
 * above). Upserts by hand rather than via .upsert(), because .upsert()
 * would otherwise overwrite report/status/created_at with nulls on a book
 * that already has a completed run sitting in those columns — this must
 * only ever touch the run_* columns, never the last-completed-run ones. */
export async function setDraftRunStatus(
  supabase: SupabaseClient,
  bookId: string,
  runStatus: 'queued' | 'running' | 'done' | 'failed',
  requestedBy: string,
  runError?: string,
): Promise<void> {
  const patch = {
    run_status: runStatus,
    run_error: runError ?? null,
    run_updated_at: new Date().toISOString(),
    requested_by: requestedBy,
  };
  const { data: existing, error: selectError } = await supabase.from('book_profile_drafts').select('book_id').eq('book_id', bookId).maybeSingle();
  if (selectError) throw Error('Could not check the research run status.');
  if (existing) {
    const { error } = await supabase.from('book_profile_drafts').update(patch).eq('book_id', bookId);
    if (error) throw Error('Could not update the research run status.');
  } else {
    const { error } = await supabase.from('book_profile_drafts').insert({ book_id: bookId, ...patch });
    if (error) throw Error('Could not create the research run record.');
  }
}

export async function loadDraftReport(supabase: SupabaseClient, bookId: string): Promise<BookProfileDraft | null> {
  const { data, error } = await supabase.from('book_profile_drafts').select('*').eq('book_id', bookId).maybeSingle();
  if (error) throw Error('Could not load the research run.');
  const row = data as Record<string, unknown> | null;
  if (!row) return null;
  return {
    bookId: row.book_id as string,
    report: (row.report as Record<string, unknown> | null) ?? null,
    status: (row.status as string | null) ?? null,
    createdAt: (row.created_at as string | null) ?? null,
    requestedBy: (row.requested_by as string | null) ?? null,
    runStatus: (row.run_status as string | undefined) ?? 'idle',
    runError: (row.run_error as string | null) ?? null,
    runUpdatedAt: (row.run_updated_at as string | undefined) ?? new Date().toISOString(),
  };
}
