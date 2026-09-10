import { getDbClient } from '@/lib/supabase/dbClient';
import { loadAllBooks } from '@/lib/books-db';
import { fixtureBookIds } from '@/lib/books';
import AdminApp from '@/components/AdminApp';
export default async function Page(){const supabase=await getDbClient();const books=await loadAllBooks(supabase);return <AdminApp books={books} fixtureIds={[...fixtureBookIds]}/>;}
