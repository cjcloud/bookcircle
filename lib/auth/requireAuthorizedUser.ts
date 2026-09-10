import {createClient} from '../supabase/server.ts';
import {createAdminClient} from '../supabase/admin.ts';
import {authDisabled, DEV_EMAIL} from '../supabase/dbClient.ts';

export class UnauthorizedError extends Error {}

/** Server-side guard for API routes: resolves the caller's session and
 * confirms their email is still on the whitelist right now — not just at
 * login time. A session can outlive a later removal from
 * authorized_emails, so every privileged route re-checks here rather than
 * trusting the JWT alone. Row Level Security enforces the same rule at
 * the database layer independently; this is the app-layer half of that
 * defense-in-depth pair. Throws UnauthorizedError if the caller should be
 * refused; otherwise returns their lowercased email. */
export async function requireAuthorizedUser(): Promise<string> {
  if (authDisabled) return DEV_EMAIL;
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase().trim();
  if (!email) throw new UnauthorizedError('Sign in required.');
  const admin = createAdminClient();
  const {data, error} = await admin.from('authorized_emails').select('email').eq('email', email).maybeSingle();
  if (error || !data) throw new UnauthorizedError('This account is no longer authorized.');
  return email;
}
