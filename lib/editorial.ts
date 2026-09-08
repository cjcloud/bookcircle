import { policyIssues } from './editorial-policy.ts';
import type { Book, Collision, Diagnostics, Question } from './types.ts';
import {getResearchPromotion} from './research-promotions.ts';
export const mandatoryDomains=['Writing / Style','Handling of Subjects'];
const banned=['some readers','readers thought','critics','reviewers','the wider conversation','widely praised'];
const countWords=(text:string)=>text.trim()?text.trim().split(/\s+/).length:0;

/** Pure port of the Python editorial engine. No framework, storage or network imports. */
export function validateQuestion(q:Question):string[]{
  const issues:string[]=[];
  if(q.question_type==='five_point'&&!q.collision_id)issues.push('Scored question has no collision provenance.');
  const text=`${q.proposition} ${q.subtext}`.toLowerCase();
  for(const phrase of banned)if(text.includes(phrase))issues.push(`Member-facing copy contains banned reviewer-summary phrase: "${phrase}".`);
  if(q.question_type==='five_point'){
    if(!q.subtext.trim())issues.push('Scored question is missing subtext.');
    if(countWords(q.subtext)>45)issues.push('Subtext is probably too long for the light-touch member experience.');
  }
  if(q.question_type==='going_deeper'&&!q.optional)issues.push('Going Deeper must be Optional.');
  return issues;
}
export function validateMap(questions:Question[]):Diagnostics {
  const issues=questions.flatMap(q=>validateQuestion(q).map(item=>`${q.id}: ${item}`)),warnings:string[]=[];
  const scored=questions.filter(q=>q.question_type==='five_point'),deeper=questions.filter(q=>q.question_type==='going_deeper');
  const counts:Record<string,number>={};for(const q of scored)counts[q.category]=(counts[q.category]??0)+1;
  for(const domain of mandatoryDomains)if(!counts[domain])issues.push(`Mandatory domain missing: ${domain}`);
  if(deeper.length!==1)issues.push('Opinion Map should contain exactly one Going Deeper item.');
  else if(questions.at(-1)?.question_type!=='going_deeper')issues.push('Going Deeper must appear last.');
  const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
  if(top&&top[1]>Math.max(2,Math.floor(scored.length/2)))warnings.push(`Map may be over-concentrated: ${top[1]}/${scored.length} scored questions are ${top[0]}.`);
  if(scored.length<5||scored.length>7)warnings.push(`Expected 5–7 scored questions; found ${scored.length}.`);
  return {valid:issues.length===0,issues,warnings,category_mix:counts,scored_question_count:scored.length,going_deeper_count:deeper.length};
}
export function selectCollisions(collisions:Collision[],maxScored=6):Collision[]{
  const rank=(c:Collision)=>[c.discussion_potential.toLowerCase()==='high'?0:1,['Established Pattern','Strong Trend'].includes(c.evidence_strength)?0:1];
  const ranked=[...collisions].sort((a,b)=>rank(a)[0]-rank(b)[0]||rank(a)[1]-rank(b)[1]);
  const chosen:Collision[]=[],counts:Record<string,number>={};
  const add=(c:Collision)=>{chosen.push(c);counts[c.dimension]=(counts[c.dimension]??0)+1;};
  for(const domain of mandatoryDomains){const c=ranked.find(x=>x.dimension===domain);if(c)add(c);}
  for(const c of ranked){if(chosen.includes(c))continue;if(chosen.length>=maxScored)break;if((counts[c.dimension]??0)>=2)continue;add(c);}
  return chosen.slice(0,maxScored);
}
/** Boundary checks added by the local web adapter, beyond the original engine. */
export function parseQuestions(value:unknown,book:Book):Question[]{
  if(!Array.isArray(value)||value.length<1||value.length>20)throw Error('Expected 1–20 questions.');
  const allowed=new Set(book.questions.map(q=>q.id));
  const result=value.map((v:unknown)=>{
    if(!v||typeof v!=='object')throw Error('Invalid question.');
    const q=v as Record<string,unknown>;
    if(typeof q.id!=='string'||!allowed.has(q.id))throw Error('Question does not belong to this book.');
    for(const k of ['proposition','subtext','category'])if(typeof q[k]!=='string'||!(q[k] as string).trim()||(q[k] as string).length>3000)throw Error('Invalid question or empty wording.');
    if(q.question_type!=='five_point'&&q.question_type!=='going_deeper')throw Error('Unknown question type.');
    if(q.collision_id!==null&&typeof q.collision_id!=='string')throw Error('Invalid collision ID.');
    if(typeof q.optional!=='boolean'||typeof q.locked!=='boolean')throw Error('Invalid question flags.');
    let research:Question['research'];
    if(q.research!==undefined){const value=q.research as Record<string,unknown>;if(!value||typeof value!=='object'||typeof value.candidateId!=='string'||typeof value.evidenceDigest!=='string'||typeof value.admittedAt!=='string'||!getResearchPromotion(book.id,value.candidateId))throw Error('Invalid research admission.');research={candidateId:value.candidateId,evidenceDigest:value.evidenceDigest,admittedAt:value.admittedAt};}
    return {id:q.id,collision_id:q.collision_id,proposition:q.proposition,subtext:q.subtext,category:q.category,question_type:q.question_type,optional:q.optional,locked:q.locked,...(research?{research}:{})} as Question;
  });
  if(new Set(result.map(q=>q.id)).size!==result.length)throw Error('Duplicate question IDs.');
  return result;
}
export function validateForBook(book:Book,questions:Question[]):Diagnostics {
  const result=validateMap(questions);
  for(const q of questions)if(q.question_type==='five_point'&&!book.collisions.some(c=>c.id===q.collision_id&&c.dimension===q.category))result.issues.push(`${q.id}: Collision provenance does not match this book/category.`);
  result.issues.push(...policyIssues(book,questions));
  result.valid=result.issues.length===0;return result;
}
