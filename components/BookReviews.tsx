'use client';
import { useEffect, useState } from 'react';
import type { Book } from '@/lib/types';
import BookProfileResearch from './BookProfileResearch';

interface OpinionExcerpt { sourceId: string; author: string; publication: string; quote: string; url: string; containsSpoilers: boolean }
interface ReviewPointEvidence { sourceId: string; passage: string }
interface ReviewPoint { id: string; sentiment: 'positive' | 'negative'; text: string; evidence: ReviewPointEvidence[] }
interface BookProfile { bookId: string; genre: string; summaryNoSpoilers: string; summarySpoilers: string; opinions: OpinionExcerpt[]; verifiedAt: string; sourceIds: string[] }

/** Strength tier is derived here from the evidence array's distinct source
 * count, never stored — red = raised in 1 review, amber = 2, green = 3+,
 * per the confirmed rule. This can never drift from what a point's
 * evidence actually shows because it isn't persisted anywhere. */
function strengthTier(point: ReviewPoint): { label: 'red' | 'amber' | 'green'; count: number } {
  const count = new Set(point.evidence.map((e) => e.sourceId)).size;
  return { label: count <= 1 ? 'red' : count === 2 ? 'amber' : 'green', count };
}

function PointsTable({ points, sentiment }: { points: ReviewPoint[]; sentiment: 'positive' | 'negative' }) {
  const rows = points.filter((p) => p.sentiment === sentiment);
  return <div className="table-wrap">
    <table>
      <thead><tr><th>{sentiment === 'positive' ? 'What worked' : 'What didn’t'}</th><th>Strength</th></tr></thead>
      <tbody>
        {!rows.length && <tr><td colSpan={2} className="hint">No {sentiment} points published yet.</td></tr>}
        {rows.map((point) => {
          const tier = strengthTier(point);
          return <tr key={point.id}>
            <td>{point.text}</td>
            <td><span className={`strength-bar strength-${tier.label}`} aria-hidden="true" /><span className="hint">{tier.count} review{tier.count === 1 ? '' : 's'}</span></td>
          </tr>;
        })}
      </tbody>
    </table>
  </div>;
}

export default function BookReviews({ book }: { book: Book }) {
  const [profile, setProfile] = useState<BookProfile | null>(null);
  const [points, setPoints] = useState<ReviewPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSpoilers, setShowSpoilers] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const res = await fetch(`/api/book-profile/${book.id}`);
        const json = await res.json();
        if (!res.ok) throw Error(json.error || 'Could not load the book profile.');
        if (!cancelled) { setProfile(json.profile); setPoints(json.points ?? []); }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [book.id]);

  const visibleOpinions = (profile?.opinions ?? []).filter((o) => showSpoilers || !o.containsSpoilers);

  return <>
    <p className="muted">Genre, a spoiler-aware summary, and reception distilled from reviews — generated and independently verified through the same research pipeline as the rest of this app, never hand-authored.</p>
    {loading && <p>Loading…</p>}
    {!loading && error && <div className="opinion-balance blocked-balance"><strong>Could not load</strong><p>{error}</p></div>}
    {!loading && !error && !profile && <div className="opinion-balance blocked-balance"><strong>Not yet published</strong><p>No verified book profile has been published for this book yet. See the research panel below.</p></div>}
    {!loading && !error && profile && <article className="card">
      <span className="tag">{profile.genre}</span>
      <label className="check"><input type="checkbox" checked={showSpoilers} onChange={(e) => setShowSpoilers(e.target.checked)} />Show spoilers</label>
      <h2>Summary</h2>
      <p>{showSpoilers ? profile.summarySpoilers : profile.summaryNoSpoilers}</p>
      {visibleOpinions.length > 0 && <>
        <h3>What critics said</h3>
        <ul>{visibleOpinions.map((o, i) => <li key={i}>“{o.quote}” — <a href={o.url} target="_blank" rel="noreferrer">{o.author}, {o.publication}</a>{o.containsSpoilers ? ' · spoiler' : ''}</li>)}</ul>
      </>}
      <h3>Where reviewers agreed and disagreed</h3>
      <div className="split">
        <PointsTable points={points} sentiment="positive" />
        <PointsTable points={points} sentiment="negative" />
      </div>
      <p className="hint">Verified {new Date(profile.verifiedAt).toLocaleDateString('en-GB')} from {profile.sourceIds.length} sources.</p>
    </article>}
    <details>
      <summary>See the research behind this profile</summary>
      <BookProfileResearch bookId={book.id} />
    </details>
  </>;
}
