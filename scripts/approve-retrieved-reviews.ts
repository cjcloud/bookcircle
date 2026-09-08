import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {askClaude} from '../lib/claude-research.ts';

interface RetrievedPage {url:string;title:string;status:string;author?:string;text?:string;retrievedAt?:string;wordCount?:number}
interface Decision {url:string;correctBook:boolean;substantiveReview:boolean;appearsComplete:boolean;author:string;overallReception:'positive'|'mixed'|'negative'|'unclear';reason:string}
const decisionSchema={type:'object',properties:{url:{type:'string'},correctBook:{type:'boolean'},substantiveReview:{type:'boolean'},appearsComplete:{type:'boolean'},author:{type:'string'},overallReception:{type:'string',enum:['positive','mixed','negative','unclear']},reason:{type:'string'}},required:['url','correctBook','substantiveReview','appearsComplete','author','overallReception','reason'],additionalProperties:false};
const schema={type:'object',properties:{decisions:{type:'array',items:decisionSchema}},required:['decisions'],additionalProperties:false};

const [inputPath,sourceOutputPath,screeningOutputPath,requestedPrefix]=process.argv.slice(2);
if(!inputPath||!sourceOutputPath||!screeningOutputPath)throw Error('Usage: approve:retrieved input.json sources.json screening.json [source-prefix]');
const input=JSON.parse(await readFile(inputPath,'utf8')) as {bookTitle:string;author:string;pages:RetrievedPage[]};
const sourcePrefix=(requestedPrefix||input.bookTitle.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')).slice(0,48);
if(!sourcePrefix)throw Error('A valid source prefix is required.');
const pages=input.pages.filter(page=>page.status==='retrieved_for_screening'&&page.text);
const raw=await askClaude(`Screen these retrieved article bodies before they can enter literary research. For every URL decide whether it reviews exactly the named book by the named author, contains substantive independent critical judgement rather than mostly summary or publicity, and appears to contain the complete review rather than a snippet, comment thread or truncated extract. Identify the review author only from an explicit byline or first-person site identity in the supplied page; use an empty string when unavailable. Classify the article's overall reception as positive, mixed, negative or unclear. Preserve critical qualifications. Return every URL exactly once.`,{bookTitle:input.bookTitle,bookAuthor:input.author,pages:pages.map(page=>({url:page.url,title:page.title,claimedAuthor:page.author,text:page.text}))},undefined,6000,schema) as {decisions?:Decision[]};
const decisions=Array.isArray(raw.decisions)?raw.decisions:[];
const byUrl=new Map(decisions.map(decision=>[decision.url,decision]));
const approved=[];const report=[];const digests=new Set<string>();
for(const [index,page] of pages.entries()){
  const decision=byUrl.get(page.url);
  let status='excluded_incomplete_screening',reason='No complete screening decision was returned.';
  if(decision){
    const digest=createHash('sha256').update(page.text!).digest('hex');
    if(!decision.correctBook){status='excluded_wrong_book';reason=decision.reason;}
    else if(!decision.substantiveReview){status='excluded_not_substantive';reason=decision.reason;}
    else if(!decision.appearsComplete){status='excluded_incomplete';reason=decision.reason;}
    else if(!decision.author.trim()){status='excluded_unattributed';reason='No explicit review authorship could be identified.';}
    else if(digests.has(digest)){status='excluded_duplicate';reason='Duplicate article text.';}
    else{
      digests.add(digest);status='approved_full_review';reason=decision.reason;
      approved.push({id:`${sourcePrefix}-review-${index+1}`,url:page.url,title:page.title,author:decision.author,retrievedAt:page.retrievedAt??new Date().toISOString(),text:page.text,textScope:'full_review',overallReception:decision.overallReception});
    }
  }
  report.push({url:page.url,title:page.title,status,reason,author:decision?.author??'',overallReception:decision?.overallReception??'unclear',wordCount:page.wordCount});
}
await writeFile(sourceOutputPath,JSON.stringify(approved,null,2)+'\n',{flag:'wx'});
await writeFile(screeningOutputPath,JSON.stringify({bookTitle:input.bookTitle,bookAuthor:input.author,screenedAt:new Date().toISOString(),retrievedCount:pages.length,approvedCount:approved.length,report,status:'requires_collision_synthesis'},null,2)+'\n',{flag:'wx'});
console.log(`Approved ${approved.length} complete reviews from ${pages.length} retrieved articles. Collision synthesis has not yet run.`);
