import { getDbClient } from '@/lib/supabase/dbClient';
import { loadAllBooks } from '@/lib/books-db';
import { fixtureBookIds } from '@/lib/books';
import AdminApp from '@/components/AdminApp';
export default async function Page(){
  const supabase = await getDbClient();
  // TEMPORARY DIAGNOSTIC LOGGING — remove once the missing-books issue is
  // resolved. Confirms (a) whether this request carries an authenticated
  // session at the point loadAllBooks runs, and (b) exactly what
  // loadAllBooks returns or throws, since a normal successful call logs
  // nothing on its own.
  const {data:{user},error:userError}=await supabase.auth.getUser();
  console.log('[bcb-debug] user:',user?.email??null,'userError:',userError?.message??null);
  const {data:isAuthRpc,error:isAuthErr}=await supabase.rpc('is_authorized');
  console.log('[bcb-debug] is_authorized() rpc ->',isAuthRpc,'error:',isAuthErr?.message??null,isAuthErr?.code??'');
  const rawBooks=await supabase.from('books').select('id,book_title');
  console.log('[bcb-debug] raw books select -> data:',JSON.stringify(rawBooks.data),'error:',rawBooks.error?.message??null,rawBooks.error?.code??'','status:',rawBooks.status);
  let books;
  try{
    books=await loadAllBooks(supabase);
    console.log('[bcb-debug] loadAllBooks ok. count:',books.length,'ids:',books.map(b=>b.id).join(', '));
  }catch(e){
    console.log('[bcb-debug] loadAllBooks threw:',(e as Error).message);
    throw e;
  }
  return <AdminApp books={books} fixtureIds={[...fixtureBookIds]}/>;
}
