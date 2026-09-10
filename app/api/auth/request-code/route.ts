import {createClient} from '../../../../lib/supabase/server.ts';
import {createAdminClient} from '../../../../lib/supabase/admin.ts';

const GENERIC_MESSAGE = 'If that address is authorized, a passcode is on its way.';
const isEmail = (value: unknown): value is string => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;

/** Whitelist-gated first step of sign-in. Always returns the same
 * response whether or not the email is authorized, so this endpoint can't
 * be used to enumerate who's on the list. Only whitelisted addresses
 * actually get a Supabase email-OTP call, and therefore only they
 * receive a passcode. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = isEmail(body?.email) ? body.email.toLowerCase().trim() : null;
    if (!email) return Response.json({error: 'Enter a valid email address.'}, {status: 400});

    const admin = createAdminClient();
    const {data} = await admin.from('authorized_emails').select('email').eq('email', email).maybeSingle();

    if (data) {
      const supabase = await createClient();
      // shouldCreateUser stays at its default (true): the whitelist table,
      // not Supabase's own user list, is the source of truth for who may
      // sign in, so a first-time authorized address should succeed too.
      await supabase.auth.signInWithOtp({email});
    }
    return Response.json({message: GENERIC_MESSAGE});
  } catch {
    return Response.json({message: GENERIC_MESSAGE});
  }
}
