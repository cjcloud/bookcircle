import { requireAuthorizedUser, UnauthorizedError } from '@/lib/auth/requireAuthorizedUser';
import { getDbClient } from '@/lib/supabase/dbClient';
import { loadAllBooks, createBook } from '@/lib/books-db';

/** GET: the merged book list (three fixture books + anything added in-app)
 * that components/AdminApp.tsx's book selector renders. POST: adds a new
 * book with just a title and author — see lib/books-db.ts and the
 * `books` migration for exactly what that does and doesn't make usable. */
export async function GET() {
  try {
    await requireAuthorizedUser();
    const supabase = await getDbClient();
    const books = await loadAllBooks(supabase);
    return Response.json(books);
  } catch (error) {
    if (error instanceof UnauthorizedError) return Response.json({ error: error.message }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : 'Could not load books.' }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const email = await requireAuthorizedUser();
    const text = await request.text();
    if (text.length > 10_000) return Response.json({ error: 'Request too large.' }, { status: 413 });
    const body = JSON.parse(text);
    if (typeof body?.book_title !== 'string' || typeof body?.author !== 'string') return Response.json({ error: 'A title and author are required.' }, { status: 400 });

    const supabase = await getDbClient();
    const book = await createBook(supabase, { book_title: body.book_title, author: body.author }, email);
    return Response.json({ book });
  } catch (error) {
    if (error instanceof UnauthorizedError) return Response.json({ error: error.message }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : 'Could not add the book.' }, { status: 400 });
  }
}
