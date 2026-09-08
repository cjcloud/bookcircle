import {readFile,writeFile} from 'node:fs/promises';
import {screenReviewPages,type DiscoveredPage} from '../lib/claude-discovery.ts';

const [inputPath,outputPath]=process.argv.slice(2);
if(!inputPath||!outputPath)throw Error('Usage: screen:discovery input.json output.json');
const input=JSON.parse(await readFile(inputPath,'utf8')) as {bookTitle:string;author:string;discoveredAt:string;pages:DiscoveredPage[]};
if(!Array.isArray(input.pages))throw Error('Discovery file is invalid.');
const pages=screenReviewPages(input.pages);
const counts=pages.reduce<Record<string,number>>((all,page)=>{all[page.status]=(all[page.status]??0)+1;return all;},{});
await writeFile(outputPath,JSON.stringify({...input,screenedAt:new Date().toISOString(),pages,counts,status:'candidates_require_full_text'},null,2)+'\n',{flag:'wx'});
console.log(`Screening saved: ${counts.candidate_full_text??0} review candidates from ${pages.length} discovered pages.`);
