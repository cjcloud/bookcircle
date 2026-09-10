import type { SupabaseClient } from '@supabase/supabase-js';
import { books as fixtureBooks } from './books.ts';
import type { Book, Diagnostics } from './types.ts';

/** A book added in-app starts here: no opinion-map skeleton, no collisions,
 * nothing to admit research into yet. See the comment on the `books`
 * migration (0004_books.sql) for why that's a deliberate scope boundary,
 * not an oversight. */
const emptyDiagnostics: Diagnostics = { valid: false, issues: [], warnings: [], category_mix: {}, scored_question_count: 0, going_deeper_count: 0 };

/** The three hand-authored fixture books live in data/books.json, not the
 * `books` table — they can't be edited or deleted through this file. */
const fixtureIds = new Set(fixtureBooks.map((b) => b.id));

function fromRow(row: Record<string, unknown>): Book {
  return {
    id: row.id as string,
    book_title: row.book_title as string,
    author: row.author as string,
    questions: (row.questions as Book['questions']) ?? [],
    diagnostics: (row.diagnostics as Diagnostics) ?? emptyDiagnostics,
    summary: (row.summary as string) ?? '',
    lenses: (row.lenses as Book['lenses']) ?? [],
    collisions: (row.collisions as Book['collisions']) ?? [],
    findings: (row.findings as Book['findings']) ?? [],
    sample_scores: (row.sample_scores as Book['sample_scores']) ?? [],
  };
}

/** The three hand-authored fixture books (data/books.json, loaded via
 * lib/books.ts) plus every book added in-app through createBook below,
 * merged into one list. Every API route that used to statically import
 * `books` from lib/books.ts should call this instead, so a book added
 * in-app is immediately recognised everywhere — no code edit or redeploy
 * needed for it to show up, load, or be looked up by id. */
export async function loadAllBooks(supabase: SupabaseClient): Promise<Book[]> {
  const { data, error } = await supabase.from('books').select('*').order('created_at', { ascending: true });
  if (error) throw Error('Could not load books.');
  return [...fixtureBooks, ...((data ?? []) as Record<string, unknown>[]).map(fromRow)];
}

const slugify = (title: string) => title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'book';

/** Adds a new book with just a title and author. Everything else
 * (questions, collisions, lenses, findings, sample_scores) starts empty —
 * see the migration's comment for exactly what that does and doesn't make
 * usable right away. The id is slugified from the title and de-duplicated
 * against every existing book, fixture or in-app, so it can never collide. */
export async function createBook(supabase: SupabaseClient, input: { book_title: string; author: string }, createdBy: string): Promise<Book> {
  const book_title = input.book_title.trim();
  const author = input.author.trim();
  if (!book_title || !author) throw Error('Title and author are both required.');
  if (book_title.length > 300 || author.length > 300) throw Error('Title or author is too long.');

  const existingIds = new Set((await loadAllBooks(supabase)).map((b) => b.id));
  const base = slugify(book_title);
  let id = base;
  for (let n = 2; existingIds.has(id); n += 1) id = `${base}-${n}`;

  const { error } = await supabase.from('books').insert({
    id,
    book_title,
    author,
    questions: [],
    diagnostics: emptyDiagnostics,
    summary: '',
    lenses: [],
    collisions: [],
    findings: [],
    sample_scores: [],
    created_by: createdBy,
  });
  if (error) throw Error('Could not save the new book.');

  return { id, book_title, author, questions: [], diagnostics: emptyDiagnostics, summary: '', lenses: [], collisions: [], findings: [], sample_scores: [] };
}

/** Fixes a typo in a book added in-app. Only touches title/author — the
 * fixture books aren't rows in this table at all, so trying to edit one
 * fails with an honest error rather than silently doing nothing. */
export async function updateBook(supabase: SupabaseClient, id: string, input: { book_title: string; author: string }): Promise<Book> {
  if (fixtureIds.has(id)) throw Error('This is a sample book and can’t be edited here.');
  const book_title = input.book_title.trim();
  const author = input.author.trim();
  if (!book_title || !author) throw Error('Title and author are both required.');
  if (book_title.length > 300 || author.length > 300) throw Error('Title or author is too long.');

  const { data, error } = await supabase.from('books').update({ book_title, author }).eq('id', id).select().single();
  if (error || !data) throw Error('Could not find that book.');
  return fromRow(data as Record<string, unknown>);
}

/** Deletes a book added in-app, along with any workspace/research state
 * that had accumulated for it (workspaces, book profile drafts and
 * publications, promoted research). None of these tables have a foreign
 * key back to `books` — deleting the book row alone would leave orphaned
 * rows behind rather than fail, so this cleans them up explicitly instead
 * of relying on a constraint that doesn't exist. Best-effort: a cleanup
 * row failing to delete doesn't block the book itself from going away. */
export async function deleteBook(supabase: SupabaseClient, id: string): Promise<void> {
  if (fixtureIds.has(id)) throw Error('This is a sample book and can’t be deleted.');

  await Promise.allSettled([
    supabase.from('workspaces').delete().eq('book_id', id),
    supabase.from('research_sources').delete().eq('book_id', id),
    supabase.from('research_candidates').delete().eq('book_id', id),
    supabase.from('research_promotions').delete().eq('book_id', id),
    supabase.from('book_profile_drafts').delete().eq('book_id', id),
    supabase.from('book_profiles').delete().eq('book_id', id),
    supabase.from('review_points').delete().eq('book_id', id),
  ]);

  const { error } = await supabase.from('books').delete().eq('id', id);
  if (error) throw Error('Could not delete that book.');
}
