'use client';
import { useEffect, useState } from 'react';

/** Sibling to ResearchPilot.tsx: fetches the latest automated research run
 * for this book from app/api/research/run-profile/[bookId] (GET) on
 * mount, and offers a "Run research now" button (POST to the same route)
 * that drives the whole discover -> propose -> verify pipeline with no
 * command line involved — discoverReviewSources in lib/claude-research.ts
 * uses Claude's own web_search + web_fetch tools to find and capture real
 * review pages itself. A run can take a couple of minutes; the button
 * disables and shows a busy note while it's in flight rather than
 * assuming it'll be fast.
 *
 * Publishing is unchanged: the "Publish to app" button only appears once
 * verification.status === 'model_supported', and still goes through
 * app/api/research/publish-profile, which re-derives and checks the
 * evidence digest server-side rather than trusting this report at face
 * value. */
interface ProfileOpinion { sourceId: string; author: string; publication: string; quote: string; url: string; containsSpoilers: boolean }
interface ProfileEvidence { sourceId: string; passage: string }
interface ProfilePoint { sentiment: 'positive' | 'negative'; text: string; evidence: ProfileEvidence[] }
interface ProfileProposal { genre: string; summaryNoSpoilers: string; summarySpoilers: string; opinions: ProfileOpinion[]; points: ProfilePoint[]; sources: { id: string; url: string; author: string; title: string }[] }
interface ProfileCheck { name: string; status: string; reason: string; sourceIds: string[] }
interface ProfileVerification { status: string; inputDigest?: string; checks?: ProfileCheck[]; model?: string; verifiedAt?: string; reason?: string }
interface ProfileReport { bookId: string; generatedAt: string; model: string; sourceCount: number; proposal: ProfileProposal | null; verification: ProfileVerification }

const statusLabel: Record<string, string> = {
  model_supported: 'Source checks passed',
  unsupported: 'Blocked',
  unresolved: 'Needs another check',
};

export default function BookProfileResearch({ bookId }: { bookId: string }) {
  const [report, setReport] = useState<ProfileReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/research/run-profile/${bookId}`)
      .then((res) => res.json())
      .then((json) => { if (!cancelled) setReport(json.report ?? null); })
      .catch(() => { if (!cancelled) setNotice('Could not load the latest research run.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [bookId]);

  async function runNow() {
    setRunning(true);
    setNotice('');
    try {
      const res = await fetch(`/api/research/run-profile/${bookId}`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw Error(json.error || 'The research run failed.');
      setReport(json.report ?? null);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  async function publish() {
    if (!report) return;
    setPublishing(true);
    setNotice('');
    try {
      const res = await fetch('/api/research/publish-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, report }),
      });
      const json = await res.json();
      if (!res.ok) throw Error(json.error || 'Could not publish this profile.');
      setNotice('Published. Reload the Reviews step to see the live version.');
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setPublishing(false);
    }
  }

  const runButton = <button className="secondary" disabled={running} onClick={runNow}>
    {running ? 'Searching and reading reviews online (this can take a couple of minutes)…' : report ? 'Run research again' : 'Run research now'}
  </button>;

  if (loading) return <p className="hint">Loading the latest research run…</p>;

  if (!report) return <div>
    <p className="hint">No research has been run for this book yet. This searches the web for reviews, reads them, and drafts the profile — no files or command line needed.</p>
    {runButton}
    {notice && <p className="hint">{notice}</p>}
  </div>;

  const { proposal, verification } = report;
  return <div>
    <span className={`tag research-status ${verification.status}`}>{statusLabel[verification.status] ?? verification.status}</span>
    <p className="hint">Run: {new Date(report.generatedAt).toLocaleString('en-GB')} · {report.model} · {report.sourceCount} sources</p>
    {!proposal && <div className="opinion-balance blocked-balance"><strong>No profile produced</strong><p>{verification.reason ?? 'The pipeline did not return a usable profile.'}</p></div>}
    {proposal && <>
      <h4>Genre</h4>
      <p>{proposal.genre}</p>
      <h4>Summary (spoiler-free)</h4>
      <p>{proposal.summaryNoSpoilers}</p>
      <h4>Summary (full)</h4>
      <p>{proposal.summarySpoilers}</p>
      <h4>Opinions</h4>
      <ul>{proposal.opinions.map((o, i) => <li key={i}>“{o.quote}” — {o.author}, {o.publication}{o.containsSpoilers ? ' · spoiler' : ''}</li>)}</ul>
      <h4>Points</h4>
      <ul>{proposal.points.map((p, i) => <li key={i}>[{p.sentiment}] {p.text} ({p.evidence.length} source{p.evidence.length === 1 ? '' : 's'})</li>)}</ul>
    </>}
    {verification.checks && <><h4>Verification checks</h4><ul>{verification.checks.map((c) => <li key={c.name}><strong>{c.name}</strong>: {c.status} — {c.reason}</li>)}</ul></>}
    {notice && <p className="hint">{notice}</p>}
    <div className="actions">
      {runButton}
      {verification.status === 'model_supported' && proposal && <button className="primary" disabled={publishing} onClick={publish}>Publish to app</button>}
    </div>
  </div>;
}
