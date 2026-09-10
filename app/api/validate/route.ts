import { loadAllBooks } from '@/lib/books-db';
import { getDbClient } from '@/lib/supabase/dbClient';
import { parseQuestions, validateForBook } from '@/lib/editorial';
export async function POST(request:Request){
 try {
  const text=await request.text();if(text.length>100000)return Response.json({error:'Request too large.'},{status:413});
  const data=JSON.parse(text);
  const supabase=await getDbClient();
  const book=(await loadAllBooks(supabase)).find(b=>b.id===data.book_id);if(!book)throw Error('Unknown book.');
  return Response.json(validateForBook(book,parseQuestions(data.questions,book)));
 }catch(error){return Response.json({error:error instanceof Error?error.message:'Invalid request.'},{status:400});}
}
