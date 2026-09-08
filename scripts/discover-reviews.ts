import {writeFile} from 'node:fs/promises';
import {discoverReviewPages} from '../lib/claude-discovery.ts';

const [bookTitle,author,outputPath]=process.argv.slice(2);
if(!bookTitle||!author||!outputPath)throw Error('Usage: discover:reviews "Book title" "Author" output.json');
const result=await discoverReviewPages(bookTitle,author);
await writeFile(outputPath,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(`Discovery saved ${result.pages.length} candidate pages. Every page still requires complete-text retrieval and screening.`);
