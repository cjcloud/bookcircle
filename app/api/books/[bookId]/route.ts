import { requireAuthorizedUser, UnauthorizedError } from '@/lib/auth/requireAuthorizedUser';
import { getDbClient } from '@/lib/supabase/dbClient';
import { updateBook, deleteBook } from '@/lib/books-db';

/** PATCH: fixes a typo in an in-app book's title/author. DELETE: removes an
 * in-app book and its accumulated workspace/research state. Neither applies
 * to the three fixture books (see lib/books-db.ts) — attempting either on
 * one returns an honest error instead of silently no-op'ing. */
export async function PATCH(request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  try {
    await requireAuthorizedUser();
    const { bookId } = await params;
    const text = await request.text();
    if (text.length > 10_000) return Response.json({ error: 'Request too large.' }, { status: 413 });
    const body = JSON.parse(text);
    if (typeof body?.book_title !== 'string' || typeof body?.author !== 'string') return Response.json({ error: 'A title and author are required.' }, { status: 400 });

    const supabase = await getDbClient();
    const book = await updateBook(supabase, bookId, { book_title: body.book_title, author: body.author });
    return Response.json({ book });
  } catch (error) {
    if (error instanceof UnauthorizedError) return Response.json({ error: error.message }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : 'Could not update the book.' }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  try {
    await requireAuthorizedUser();
    const { bookId } = await params;
    const supabase = await getDbClient();
    await deleteBook(supabase, bookId);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return Response.json({ error: error.message }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : 'Could not delete the book.' }, { status: 400 });
  }
}
