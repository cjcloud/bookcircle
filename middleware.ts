import {createServerClient} from '@supabase/ssr';
import {NextResponse, type NextRequest} from 'next/server';

/** Gates every route behind a signed-in, currently-whitelisted user
 * except /login itself and Next's own internals. This is app-layer
 * defense in depth: the real enforcement is Row Level Security in
 * Postgres (see supabase/migrations/0001_init.sql) plus the per-request
 * check in lib/auth/requireAuthorizedUser.ts, since a middleware redirect
 * alone can't stop a direct API call. */
// Duplicated (not imported from lib/supabase/dbClient.ts) so this check
// stays a plain inline process.env read in the Edge middleware bundle,
// with no dependency on lib/supabase/server.ts's next/headers usage,
// which is meant for Route Handlers/Server Components, not middleware.
const authDisabled = process.env.AUTH_DISABLED === 'true' && process.env.NODE_ENV !== 'production';

export async function middleware(request: NextRequest) {
  if (authDisabled) return NextResponse.next();
  const response = NextResponse.next({request});
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          for (const {name, value} of cookiesToSet) request.cookies.set(name, value);
          for (const {name, value, options} of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  const {data: {user}} = await supabase.auth.getUser();
  const isLoginRoute = request.nextUrl.pathname.startsWith('/login');
  // The passcode-request endpoint has to be reachable by a signed-out
  // visitor — that's the whole point of it — so it's exempt from the
  // gate the same way /login is. verifyOtp itself runs client-side
  // straight against Supabase, so no other API route needs this.
  const isAuthApiRoute = request.nextUrl.pathname.startsWith('/api/auth/');
  // Same idea for the research workflow's own callback route: it's never
  // called by a signed-in browser, only by Upstash's QStash servers
  // between pipeline steps (see app/api/research/run-profile/[bookId]/workflow/route.ts),
  // which never carries our session cookie. Without this exemption every
  // QStash callback got redirected here to /login and then rejected with
  // a 405 (a POST redirected to a GET-only page) before the pipeline ever
  // ran a single step. That route already authenticates the caller itself
  // — serve() verifies QStash's own request signature — and the run was
  // only ever queued in the first place after ../route.ts's POST handler
  // ran requireAuthorizedUser(), so this isn't skipping authorization,
  // just using the right mechanism for a server-to-server call instead of
  // a cookie a non-browser caller could never have.
  const isResearchWorkflowRoute = /^\/api\/research\/run-profile\/[^/]+\/workflow$/.test(request.nextUrl.pathname);

  if (!user && !isLoginRoute && !isAuthApiRoute && !isResearchWorkflowRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  if (user && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
