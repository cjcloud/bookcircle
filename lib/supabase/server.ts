import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';

/** Server-side Supabase client for Server Components, Route Handlers and
 * middleware. Runs as whichever user's session cookie is present — still
 * subject to Row Level Security, same as the browser client. Use this for
 * anything done "as the signed-in user"; use admin.ts only for the small
 * number of operations that must bypass RLS (e.g. checking the whitelist
 * before a session exists). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            for (const {name, value, options} of cookiesToSet) cookieStore.set(name, value, options);
          } catch {
            // Called from a Server Component during render, where cookies
            // can't be set. Safe to ignore: middleware refreshes the
            // session on every request anyway.
          }
        },
      },
    },
  );
}
