import type { SupabaseClient } from '@supabase/supabase-js';
import type { ResearchPromotion } from './research-promotions.ts';

/** Loads the live research_promotions table and maps it onto the same
 * ResearchPromotion shape lib/research-promotions.ts's defaultResearchPromotions
 * uses, so every pure function in lib/editorial.ts / lib/workspace.ts /
 * lib/research-promotions.ts works unchanged whether it's called with the
 * static fixture list or this database-backed one. The database, not the
 * static array, is the source of truth once this route is in use. */
export async function loadResearchPromotions(supabase: SupabaseClient): Promise<ResearchPromotion[]> {
  const { data, error } = await supabase.from('research_promotions').select('*');
  if (error) throw Error('Could not load verified research.');
  return (data ?? []).map((row: Record<string, unknown>): ResearchPromotion => ({
    bookId: row.book_id as string,
    candidateId: row.candidate_id as string,
    targetQuestionId: row.target_question_id as string,
    collisionId: row.collision_id as string,
    category: row.category as string,
    proposition: row.proposition as string,
    subtext: row.subtext as string,
    evidenceDigest: row.evidence_digest as string,
    verifiedAt: row.verified_at as string,
    sources: (row.sources as string[]) ?? [],
  }));
}
