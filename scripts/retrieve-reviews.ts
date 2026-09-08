import {readFile,writeFile} from 'node:fs/promises';
import {retrieveReviewPage} from '../lib/review-retrieval.ts';
import type {DiscoveredPage} from '../lib/claude-discovery.ts';

const [inputPath,outputPath]=process.argv.slice(2);
if(!inputPath||!outputPath)throw Error('Usage: retrieve:reviews screened.json output.json');
const input=JSON.parse(await readFile(inputPath,'utf8')) as {bookTitle:string;author:string;pages:(DiscoveredPage&{status:string})[]};
const candidates=input.pages.filter(page=>page.status==='candidate_full_text');
const pages=[];
for(const page of candidates){const result=await retrieveReviewPage(page);pages.push(result);console.log(`${result.status}: ${page.title}`);}
const retrieved=pages.filter(page=>page.status==='retrieved_for_screening').length;
await writeFile(outputPath,JSON.stringify({bookTitle:input.bookTitle,author:input.author,retrievedAt:new Date().toISOString(),candidateCount:candidates.length,retrievedCount:retrieved,pages,status:'requires_context_and_authorship_screening'},null,2)+'\n',{flag:'wx'});
console.log(`Retrieved ${retrieved} of ${candidates.length} candidate articles. None are approved as evidence yet.`);
