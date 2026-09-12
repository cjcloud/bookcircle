'use client';
import { useEffect, useRef, useState } from 'react';

/** Sibling to ResearchPilot.tsx: fetches the latest automated research run
 * for this book from app/api/research/run-profile/[bookId] (GET) on
 * mount, and offers a "Run research now" button (POST to the same route)
 * that starts the whole discover -> propose -> verify pipeline in the
 * background -- discoverReviewSources in lib/claude-research.ts uses
 * Claude's own web_search + web_fetch tools to find and capture real
 * review pages itself.
 *
 * This is deliberately not real-time: POST just queues the run (via
 * app/api/research/run-profile/[bookId]/workflow, an Upstash Workflow
 * background job) and returns immediately, and this component polls GET
 * every few seconds afterwards to learn when it finishes. A run can take
 * a couple of minutes; the panel stays usable and navigable while it's in
 * flight rather than blocking on one long request the way it used to
 * (which is what was hitting Vercel's serverless time limit in
 * production -- see RESEARCH_MILESTONE.md).
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

const runStatusLabel: Record<string, string> = {
  queued: 'Queued — waiting to start…',
  running: 'Running — searching and reading reviews online. This can take a few minutes; feel free to navigate away and come back.',
};

const POLL_MS = 5000;

export default function BookProfileResearch({ bookId }: { bookId: string }) {
  const [report, setReport] = useState<ProfileReport | null>(null);
  const [runStatus, setRunStatus] = useState('idle');
  const [runError, setRunError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(poll, POLL_MS);
  }

  async function poll() {
    try {
      const res = await fetch(`/api/research/run-profile/${bookId}`);
      const json = await res.json();
      setReport(json.report ?? null);
      setRunStatus(json.runStatus ?? 'idle');
      setRunError(json.runError ?? null);
      if (json.runStatus !== 'queued' && json.runStatus !== 'running') stopPolling();
    } catch {
      // A transient poll failure isn't worth surfacing — the next tick tries again.
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/research/run-profile/${bookId}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setReport(json.report ?? null);
        setRunStatus(json.runStatus ?? 'idle');
        setRunError(json.runError ?? null);
        if (json.runStatus === 'queued' || json.runStatus === 'running') startPolling();
      })
      .catch(() => { if (!cancelled) setNotice('Could not load the latest research run.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; stopPolling(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  async function runNow() {
    setStarting(true);
    setNotice('');
    try {
      const res = await fetch(`/api/research/run-profile/${bookId}`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw Error(json.error || 'Could not start the research run.');
      setRunStatus('queued');
      setRunError(null);
      startPolling();
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setStarting(false);
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

  const isBusy = runStatus === 'queued' || runStatus === 'running';
  const runButton = <button className="secondary" disabled={starting || isBusy} onClick={runNow}>
    {isBusy ? (runStatusLabel[runStatus] ?? 'Working…') : starting ? 'Starting…' : report ? 'Run research again' : 'Run research now'}
  </button>;

  if (loading) return <p className="hint">Loading the latest research run…</p>;

  if (!report) return <div>
    <p className="hint">No research has been run for this book yet. This searches the web for reviews, reads them, and drafts the profile — no files or command line needed. It runs in the background, so you can navigate away and check back later.</p>
    {runButton}
    {runStatus === 'failed' && runError && <p className="hint">The last attempt failed: {runError}</p>}
    {notice && <p className="hint">{notice}</p>}
  </div>;

  const { proposal, verification } = report;
  return <div>
    <span className={`tag research-status ${verification.status}`}>{statusLabel[verification.status] ?? verification.status}</span>
    <p className="hint">Run: {new Date(report.generatedAt).toLocaleString('en-GB')} · {report.model} · {report.sourceCount} sources</p>
    {isBusy && <p className="hint">{runStatusLabel[runStatus]} Showing the last completed run below until this one finishes.</p>}
    {runStatus === 'failed' && runError && <p className="hint">The last attempt failed: {runError} Showing the last successful run below.</p>}
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
