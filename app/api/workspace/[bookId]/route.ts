import { loadAllBooks } from '@/lib/books-db';
import { editDraft, finalise, freshWorkspace, readWorkspace } from '@/lib/workspace';
import { requireAuthorizedUser, UnauthorizedError } from '@/lib/auth/requireAuthorizedUser';
import { getDbClient } from '@/lib/supabase/dbClient';
import { loadResearchPromotions } from '@/lib/research-promotions-db';
import type { Book, Workspace } from '@/lib/types';

/** Shared workspace state, one row per book, replacing the per-browser
 * localStorage copy (lib/workspace.ts's storageKey). Everyone on the
 * authorized_emails whitelist reads and writes the same row, so a second
 * person picking this up sees exactly what the previous editor left. */

async function resolveBook(supabase: Awaited<ReturnType<typeof getDbClient>>, bookId: string): Promise<Book> {
  const book = (await loadAllBooks(supabase)).find((b) => b.id === bookId);
  if (!book) throw Error('Unknown book.');
  return book;
}

async function loadCurrent(supabase: Awaited<ReturnType<typeof getDbClient>>, book: Book, promotions: Awaited<ReturnType<typeof loadResearchPromotions>>): Promise<Workspace> {
  const { data } = await supabase.from('workspaces').select('state').eq('book_id', book.id).maybeSingle();
  if (!data) return freshWorkspace(book);
  try {
    return readWorkspace(JSON.stringify(data.state), book, promotions);
  } catch {
    // A corrupted or stale saved row should never brick the book; fall
    // back to the fixture rather than 500ing every request for everyone.
    return freshWorkspace(book);
  }
}

async function persist(supabase: Awaited<ReturnType<typeof getDbClient>>, book: Book, workspace: Workspace, email: string) {
  const { error } = await supabase.from('workspaces').upsert({
    book_id: book.id,
    state: workspace,
    updated_at: new Date().toISOString(),
    updated_by: email,
  });
  if (error) throw Error('Could not save the workspace.');
}

export async function GET(_request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  try {
    await requireAuthorizedUser();
    const { bookId } = await params;
    const supabase = await getDbClient();
    const book = await resolveBook(supabase, bookId);
    const promotions = await loadResearchPromotions(supabase);
    const workspace = await loadCurrent(supabase, book, promotions);
    return Response.json({ workspace });
  } catch (error) {
    if (error instanceof UnauthorizedError) return Response.json({ error: error.message }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : 'Could not load the workspace.' }, { status: 400 });
  }
}

/** Body shapes:
 *  {type:'edit', questions, reason, tone?}  — runs editDraft server-side (this is
 *    where draft-locking / research-admission enforcement now actually happens,
 *    reusing the same pure function the client used to call unchecked).
 *  {type:'finalise'}                        — runs finalise server-side.
 *  {type:'replace', workspace}              — for everything else the client
 *    already computes locally without needing enforcement (tone changes, meeting
 *    capture, restoring an exported backup): revalidated in full by
 *    readWorkspace before it's trusted and saved. */
export async function PUT(request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  try {
    const email = await requireAuthorizedUser();
    const { bookId } = await params;
    const text = await request.text();
    if (text.length > 2_000_000) return Response.json({ error: 'Request too large.' }, { status: 413 });
    const body = JSON.parse(text);

    const supabase = await getDbClient();
    const book = await resolveBook(supabase, bookId);
    const promotions = await loadResearchPromotions(supabase);
    const current = await loadCurrent(supabase, book, promotions);

    let next: Workspace;
    if (body?.type === 'edit') {
      next = editDraft(current, book, body.questions, body.reason, promotions);
      if (body.tone) next = { ...next, tone: body.tone };
    } else if (body?.type === 'finalise') {
      next = finalise(current, book, promotions);
    } else if (body?.type === 'replace') {
      next = readWorkspace(JSON.stringify(body.workspace), book, promotions);
    } else {
      return Response.json({ error: 'Unrecognized request.' }, { status: 400 });
    }

    await persist(supabase, book, next, email);
    return Response.json({ workspace: next });
  } catch (error) {
    if (error instanceof UnauthorizedError) return Response.json({ error: error.message }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : 'Could not save the workspace.' }, { status: 400 });
  }
}
