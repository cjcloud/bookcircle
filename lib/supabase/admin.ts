import {createClient as createSupabaseClient} from '@supabase/supabase-js';

/** Service-role Supabase client. Bypasses Row Level Security entirely —
 * never import this into client code, and use it only for the specific
 * operations that must run before/outside a user session, such as
 * checking the authorized_emails whitelist before issuing a login code.
 * Everything else should go through lib/supabase/server.ts so RLS still
 * applies. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw Error('Supabase server configuration is missing.');
  return createSupabaseClient(url, key, {auth: {autoRefreshToken: false, persistSession: false}});
}
