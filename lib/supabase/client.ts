'use client';
import {createBrowserClient} from '@supabase/ssr';

/** Browser-side Supabase client. Uses only the public URL and anon key —
 * safe to ship to the client. Row Level Security (see
 * supabase/migrations/0001_init.sql) is what actually restricts what this
 * client can read or write, not anything in this file. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
