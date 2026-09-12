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
// Generous upper bound on a real run: discover/propose/verify each fit
// well inside Vercel's 300s ceiling individually, but leave headroom for
// QStash hand-off delays between steps. A run still showing 'queued' or
// 'running' past this is almost certainly dead (a crashed step, a bug
// like the middleware 405 that blocked every callback before the pipeline
// ever started) rather than genuinely working — and without this check
// the "Run research now" button stays disabled forever with no way to
// retry, since nothing else ever flips run_status back off 'queued'.
const STALE_AFTER_MS = 15 * 60 * 1000;

export default function BookProfileResearch({ bookId }: { bookId: string }) {
  const [report, setReport] = useState<ProfileReport | null>(null);
  const [runStatus, setRunStatus] = useState('idle');
  const [runError, setRunError] = useState<string | null>(null);
  const [runUpdatedAt, setRunUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState('');
  const [justCompleted, setJustCompleted] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tracks whether the run we're watching was busy on the previous check,
  // so a poll landing on 'done' can tell "this run just finished" apart
  // from "this book already had a finished report before I ever looked" —
  // the latter shouldn't claim a fresh success every time the page loads.
  const wasBusyRef = useRef(false);

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
      if (wasBusyRef.current && json.runStatus === 'done') setJustCompleted(true);
      wasBusyRef.current = json.runStatus === 'queued' || json.runStatus === 'running';
      setReport(json.report ?? null);
      setRunStatus(json.runStatus ?? 'idle');
      setRunError(json.runError ?? null);
      setRunUpdatedAt(json.runUpdatedAt ?? null);
      if (json.runStatus !== 'queued' && json.runStatus !== 'running') stopPolling();
    } catch {
      // A transient poll failure isn't worth surfacing — the next tick tries again.
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setJustCompleted(false);
    fetch(`/api/research/run-profile/${bookId}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        // A report already sitting there when the page loads was never
        // "just" completed by anything this tab did — only a poll that
        // watched a busy -> done transition itself should claim that.
        wasBusyRef.current = json.runStatus === 'queued' || json.runStatus === 'running';
        setReport(json.report ?? null);
        setRunStatus(json.runStatus ?? 'idle');
        setRunError(json.runError ?? null);
        setRunUpdatedAt(json.runUpdatedAt ?? null);
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
    setJustCompleted(false);
    try {
      const res = await fetch(`/api/research/run-profile/${bookId}`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw Error(json.error || 'Could not start the research run.');
      setRunStatus('queued');
      setRunError(null);
      setRunUpdatedAt(new Date().toISOString());
      wasBusyRef.current = true;
      startPolling();
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setStarting(false);
    }
  }

  // A run reporting 'queued'/'running' that hasn't updated in
  // STALE_AFTER_MS is treated as abandoned rather than genuinely in
  // flight, so the button doesn't stay disabled forever if a step ever
  // crashes without getting the chance to record its own failure (exactly
  // what happened once already — see supabase/migrations/0006_reset_stale_research_runs.sql).
  const isStale = (runStatus === 'queued' || runStatus === 'running') && !!runUpdatedAt
    && Date.now() - new Date(runUpdatedAt).getTime() > STALE_AFTER_MS;

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

  const isBusy = (runStatus === 'queued' || runStatus === 'running') && !isStale;
  const runButton = <button className="secondary" disabled={starting || isBusy} onClick={runNow}>
    {isBusy ? (runStatusLabel[runStatus] ?? 'Working…') : starting ? 'Starting…' : report ? 'Run research again' : 'Run research now'}
  </button>;

  if (loading) return <p className="hint">Loading the latest research run…</p>;

  if (!report) return <div>
    <p className="hint">No research has been run for this book yet. This searches the web for reviews, reads them, and drafts the profile — no files or command line needed. It runs in the background, so you can navigate away and check back later.</p>
    {runButton}
    {isStale && <p className="hint">The last run seems to have stalled without finishing — you can safely try again.</p>}
    {runStatus === 'failed' && runError && <p className="hint">The last attempt failed: {runError}</p>}
    {notice && <p className="hint">{notice}</p>}
  </div>;

  const { proposal, verification } = report;
  return <div>
    {justCompleted && <div className="opinion-balance">Research completed successfully — the results below are from this run.</div>}
    <span className={`tag research-status ${verification.status}`}>{statusLabel[verification.status] ?? verification.status}</span>
    <p className="hint">Run: {new Date(report.generatedAt).toLocaleString('en-GB')} · {report.model} · {report.sourceCount} sources</p>
    {isBusy && <p className="hint">{runStatusLabel[runStatus]} Showing the last completed run below until this one finishes.</p>}
    {isStale && <p className="hint">The last run seems to have stalled without finishing — you can safely try again. Showing the last successful run below.</p>}
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
