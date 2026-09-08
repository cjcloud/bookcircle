import { books } from '@/lib/books';
export function GET(){return Response.json(books);}
