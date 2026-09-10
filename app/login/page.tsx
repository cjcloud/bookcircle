'use client';
import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '../../lib/supabase/client.ts';

type Stage = 'email' | 'code';

export default function LoginPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  // Supabase's default OTP email includes both the 6-digit passcode this
  // page asks for AND a clickable magic-link button. If that link gets
  // clicked (or an email client's link-preview crawler follows it)
  // instead of the code being typed in, the browser lands back here with
  // a `code` query param that still needs exchanging for a session —
  // otherwise the visitor looks unauthenticated and middleware bounces
  // them right back to this same page with the param still attached.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) return;
    let cancelled = false;
    (async () => {
      setBusy(true); setNotice('Completing sign-in…');
      try {
        const supabase = createClient();
        const {error} = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) { setNotice('That sign-in link has expired or was already used. Enter your email again, or use the passcode from the email instead.'); return; }
        router.push('/'); router.refresh();
      } catch {
        if (!cancelled) setNotice('Something went wrong completing sign-in. Try again.');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setNotice('');
    try {
      const response = await fetch('/api/auth/request-code', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({email})});
      const body = await response.json();
      setNotice(body.message ?? body.error ?? 'Check your email for a passcode.');
      if (response.ok) setStage('code');
    } catch {
      setNotice('Something went wrong requesting a passcode. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setNotice('');
    try {
      const supabase = createClient();
      const {error} = await supabase.auth.verifyOtp({email, token: code.trim(), type: 'email'});
      if (error) { setNotice('That passcode was not accepted. Check it and try again, or request a new one.'); return; }
      router.push('/'); router.refresh();
    } catch {
      setNotice('Something went wrong verifying the passcode. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{maxWidth: 420, margin: '80px auto', padding: '0 24px'}}>
      <a className="brand" href="/" style={{marginBottom: 30}}>bcb<span>BOOK CLUB<br/>BRIEFING</span></a>
      <div className="card">
        <h2>Sign in</h2>
        {stage === 'email' && (
          <form onSubmit={requestCode}>
            <p className="hint">Enter an authorized email address. If it's on the list, we'll send a one-time passcode.</p>
            <label htmlFor="email">Email address</label><br/>
            <input id="email" type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} style={{width: '100%', margin: '8px 0 16px', padding: 9}}/>
            <br/>
            <button className="primary" type="submit" disabled={busy || !email}>{busy ? 'Sending…' : 'Send passcode'}</button>
          </form>
        )}
        {stage === 'code' && (
          <form onSubmit={verifyCode}>
            <p className="hint">Enter the passcode sent to {email}.</p>
            <label htmlFor="code">Passcode</label><br/>
            <input id="code" type="text" inputMode="numeric" required autoFocus value={code} onChange={e => setCode(e.target.value)} style={{width: '100%', margin: '8px 0 16px', padding: 9}}/>
            <br/>
            <button className="primary" type="submit" disabled={busy || !code}>{busy ? 'Verifying…' : 'Verify and sign in'}</button>
            {' '}
            <button type="button" onClick={() => { setStage('email'); setCode(''); setNotice(''); }}>Use a different email</button>
          </form>
        )}
        {notice && <p role="status" style={{marginTop: 16}}>{notice}</p>}
      </div>
    </main>
  );
}
