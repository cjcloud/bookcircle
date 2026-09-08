import data from '../data/books.json';
import type { Book } from './types';
export const books=data as unknown as Book[];
