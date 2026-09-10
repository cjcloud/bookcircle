import data from '../data/books.json';
import type { Book } from './types';
export const books=data as unknown as Book[];
export const fixtureBookIds=new Set(books.map(b=>b.id));
