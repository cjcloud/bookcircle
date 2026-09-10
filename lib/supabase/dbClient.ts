import { createClient } from './server';
import { createAdminClient } from './admin';

/** Local dev escape hatch: set AUTH_DISABLED=true in .env.local (never in
 * Vercel/production env vars) to skip the whitelist+OTP flow entirely
 * while working ahead of Supabase's default ~2-emails-per-hour rate
 * limit. The NODE_ENV check is a second line of defense — even if
 * AUTH_DISABLED were set in a deployed environment by mistake, NODE_ENV
 * is 'production' there and this stays false regardless. */
export const authDisabled = process.env.AUTH_DISABLED === 'true' && process.env.NODE_ENV !== 'production';
export const DEV_EMAIL = 'dev@local';

/** The Supabase client API routes should use for data access. Bypassing
 * app-layer auth (see lib/auth/requireAuthorizedUser.ts) still leaves no
 * real signed-in JWT for Postgres's Row Level Security policies to check,
 * so every read/write would otherwise be silently refused by RLS even
 * with the app-layer check skipped — this swaps in the service-role
 * client instead, only in that same dev-bypass case. */
export async function getDbClient() {
  if (authDisabled) return createAdminClient();
  return await createClient();
}
