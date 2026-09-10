import { loadAllBooks } from '@/lib/books-db';
import { editDraft, freshWorkspace, readWorkspace } from '@/lib/workspace';
import { admitResearchCandidate } from '@/lib/research-promotions';
import { requireAuthorizedUser, UnauthorizedError } from '@/lib/auth/requireAuthorizedUser';
import { getDbClient } from '@/lib/supabase/dbClient';
import { loadResearchPromotions } from '@/lib/research-promotions-db';
import type { Book, Workspace } from '@/lib/types';

async function resolveBook(supabase: Awaited<ReturnType<typeof getDbClient>>, bookId: string): Promise<Book> {
  const book = (await loadAllBooks(supabase)).find((b) => b.id === bookId);
  if (!book) throw Error('Unknown book.');
  return book;
}

/** Admits a verified research candidate into a book's shared draft. Mirrors
 * what components/AdminApp.tsx's promote() used to do entirely client-side
 * (admitResearchCandidate then editDraft) — moved here so it runs against
 * the live research_promotions table and the shared workspaces row, with
 * the same enforcement editDraft already provides (locked questions, etc). */
export async function POST(request: Request) {
  try {
    const email = await requireAuthorizedUser();
    const text = await request.text();
    if (text.length > 10_000) return Response.json({ error: 'Request too large.' }, { status: 413 });
    const body = JSON.parse(text);
    const bookId = typeof body?.bookId === 'string' ? body.bookId : null;
    const candidateId = typeof body?.candidateId === 'string' ? body.candidateId : null;
    if (!bookId || !candidateId) return Response.json({ error: 'Unrecognized request.' }, { status: 400 });

    const supabase = await getDbClient();
    const book = await resolveBook(supabase, bookId);
    const promotions = await loadResearchPromotions(supabase);

    const { data } = await supabase.from('workspaces').select('state').eq('book_id', book.id).maybeSingle();
    let current: Workspace;
    try {
      current = data ? readWorkspace(JSON.stringify(data.state), book, promotions) : freshWorkspace(book);
    } catch {
      current = freshWorkspace(book);
    }

    const questions = admitResearchCandidate(current.draft, book.id, candidateId, new Date().toISOString(), promotions);
    const next = editDraft(current, book, questions, 'Admitted verified research wording', promotions);

    const { error } = await supabase.from('workspaces').upsert({
      book_id: book.id,
      state: next,
      updated_at: new Date().toISOString(),
      updated_by: email,
    });
    if (error) throw Error('Could not save the workspace.');

    return Response.json({ workspace: next });
  } catch (error) {
    if (error instanceof UnauthorizedError) return Response.json({ error: error.message }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : 'Could not admit this research.' }, { status: 400 });
  }
}
