import { loadAllBooks } from '@/lib/books-db';
import { requireAuthorizedUser, UnauthorizedError } from '@/lib/auth/requireAuthorizedUser';
import { getDbClient } from '@/lib/supabase/dbClient';
import { loadBookProfile } from '@/lib/book-profile-db';

/** Live read for the "Reviews" step. Returns {profile:null, points:[]} for a
 * book that's never been published yet — same "not yet released" empty
 * state precedent as ResearchPilot's "Research analysis incomplete" — so
 * components/BookReviews.tsx can render a plain not-ready message instead
 * of erroring. */
export async function GET(_request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  try {
    await requireAuthorizedUser();
    const { bookId } = await params;
    const supabase = await getDbClient();
    if (!(await loadAllBooks(supabase)).some((b) => b.id === bookId)) return Response.json({ error: 'Unknown book.' }, { status: 400 });
    const { profile, points } = await loadBookProfile(supabase, bookId);
    return Response.json({ profile, points });
  } catch (error) {
    if (error instanceof UnauthorizedError) return Response.json({ error: error.message }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : 'Could not load the book profile.' }, { status: 400 });
  }
}
