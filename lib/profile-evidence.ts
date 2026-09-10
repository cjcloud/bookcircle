// Server-side evidence preparation for book profiles (genre, spoiler-aware
// summaries, attributed opinion excerpts, positive/negative points). Mirrors
// lib/source-evidence.ts's prepareEvidence/snapshotSource for the two-sided
// collision-candidate shape: same digest-binding convention, same
// exact-substring fidelity check, same {status, issues, inputDigest} return
// shape, so the rest of the app's verification/promotion plumbing needs no
// special-casing for this content type.
import { createHash } from 'node:crypto';
import type { SourceSnapshot } from './source-evidence.ts';

export interface OpinionExcerpt { sourceId: string; author: string; publication: string; quote: string; url: string; containsSpoilers: boolean }
export interface ReviewPointEvidence { sourceId: string; passage: string }
export interface ReviewPoint { sentiment: 'positive' | 'negative'; text: string; evidence: ReviewPointEvidence[] }
export interface BookProfileInput {
  genre: string;
  summaryNoSpoilers: string;
  summarySpoilers: string;
  opinions: OpinionExcerpt[];
  points: ReviewPoint[];
  sources: SourceSnapshot[];
}

const digest = (text: string) => createHash('sha256').update(text).digest('hex');

// A report saved to Postgres as jsonb and read back does not necessarily
// preserve the original key order of its nested objects — jsonb is free to
// re-serialize on storage. inputDigest used to hash plain JSON.stringify(input),
// which is key-order-sensitive, so a report that round-tripped through
// book_profile_drafts (saved at verify time, reloaded later to publish)
// could come back with the exact same content but a different digest,
// making a genuinely untampered, already-verified report look "no longer
// matching its evidence digest" and silently block publishing. Hashing a
// canonical form — object keys sorted recursively, array order preserved
// (order is meaningful there) — makes the digest depend only on content,
// never on incidental key ordering from any JSON round trip.
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) sorted[key] = canonicalize((value as Record<string, unknown>)[key]);
    return sorted;
  }
  return value;
}
const stableStringify = (value: unknown) => JSON.stringify(canonicalize(value));

// Matching-only normalization: web pages commonly use typographic quotes,
// em/en dashes and non-breaking spaces that a model reproducing a quote
// verbatim tends to render as their plain ASCII equivalents (or vice
// versa) when generating JSON text. That is a typography difference, not
// a paraphrase, so it must not fail the fidelity check the way an actual
// reworded quote should. This never touches what gets stored — only how
// two strings are compared for the exact-substring check below.
const normalizeForMatch = (s: string) => s
  .normalize('NFKC')
  .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
  .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
  .replace(/[\u2013\u2014]/g, '-')
  .replace(/[\u00A0\u2000-\u200A\u202F\u205F]/g, ' ')
  // discoverReviewSources captures markdown-ish page text (from Claude's
  // web_fetch tool), so an italicized book title or emphasised phrase in
  // the source carries literal *asterisk* or _underscore_ markers. A
  // model copying that text verbatim in the sense that matters (same
  // words, same order) commonly renders it as plain prose without those
  // markers. That's markdown syntax, not wording, so strip stray
  // emphasis markers before comparing rather than failing a genuinely
  // faithful quote over formatting it never claimed to preserve.
  .replace(/[*_]+/g, '')
  .replace(/\s+/g, ' ');
export const containsVerbatim = (source: string, needle: string) => normalizeForMatch(source).indexOf(normalizeForMatch(needle)) >= 0;

export function prepareProfileEvidence(input: BookProfileInput) {
  const issues: string[] = [];
  const ids = input.sources.map(s => s.id);
  if (new Set(ids).size !== ids.length) issues.push('Duplicate source identifiers.');
  for (const s of input.sources) if (s.digest !== digest(s.text)) issues.push(`Source ${s.id} changed after capture.`);
  if (!input.genre.trim()) issues.push('Missing genre.');
  if (!input.summaryNoSpoilers.trim() || !input.summarySpoilers.trim()) issues.push('Missing summary text.');
  if (!input.opinions.length) issues.push('At least one attributed opinion excerpt is required.');
  if (!input.points.length) issues.push('At least one positive or negative point is required.');

  for (const opinion of input.opinions) {
    const source = input.sources.find(s => s.id === opinion.sourceId);
    if (!source) { issues.push(`Opinion cites unknown source ${opinion.sourceId}.`); continue; }
    if (!opinion.quote.trim() || !containsVerbatim(source.text, opinion.quote)) issues.push(`Opinion quote is absent from source ${opinion.sourceId}.`);
    if (!opinion.author.trim() || !opinion.publication.trim()) issues.push(`Opinion from ${opinion.sourceId} is missing attribution.`);
  }

  const usedSourceIds = new Set<string>();
  for (const point of input.points) {
    if (!point.text.trim()) { issues.push('A point is missing its text.'); continue; }
    if (!point.evidence.length) { issues.push(`Point "${point.text}" has no supporting evidence.`); continue; }
    for (const e of point.evidence) {
      const source = input.sources.find(s => s.id === e.sourceId);
      if (!source) { issues.push(`Point "${point.text}" cites unknown source ${e.sourceId}.`); continue; }
      if (!e.passage.trim() || !containsVerbatim(source.text, e.passage)) issues.push(`Evidence for "${point.text}" is absent from source ${e.sourceId}.`);
      usedSourceIds.add(e.sourceId);
    }
  }

  const normalise = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const used = input.sources.filter(s => usedSourceIds.has(s.id) || input.opinions.some(o => o.sourceId === s.id));
  if (new Set(used.map(s => digest(normalise(s.text)))).size < 2) issues.push('At least two distinct source texts are required; duplicated reviews are insufficient.');

  return { status: issues.length ? 'unresolved' as const : 'ready_for_verification' as const, issues, inputDigest: digest(stableStringify(input)) };
}
