// Server-side evidence preparation. These checks do not judge meaning.
import { createHash } from 'node:crypto';
export interface SourceSnapshot {id:string;url:string;title:string;author:string;retrievedAt:string;text:string;digest:string;textScope?:string;originEvidence?:{url:string;text:string}[]}
export interface EvidenceClaim {position:'a'|'b';sourceId:string;passage:string;reasoning:string}
export interface VerificationInput {positionA:string;positionB:string;memberWording:string;claims:EvidenceClaim[];sources:SourceSnapshot[]}
const digest=(text:string)=>createHash('sha256').update(text).digest('hex');
export function snapshotSource(input:Omit<SourceSnapshot,'digest'>):SourceSnapshot {
 for(const key of ['id','url','title','author','retrievedAt','text'] as const)if(typeof input[key]!=='string')throw Error('Invalid source field.');
 if(input.originEvidence!==undefined&&(!Array.isArray(input.originEvidence)||input.originEvidence.some(e=>!e||typeof e.url!=='string'||!/^https?:\/\//.test(e.url)||typeof e.text!=='string'||!e.text.trim())))throw Error('Invalid authorship evidence.');
 const url=new URL(input.url);
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('Invalid source URL.');
 if(!input.id.trim()||!input.title.trim()||!input.text.trim()||!Number.isFinite(Date.parse(input.retrievedAt)))throw Error('Incomplete source snapshot.');
 return {id:input.id,url:input.url,title:input.title,author:input.author,retrievedAt:input.retrievedAt,text:input.text,textScope:input.textScope,originEvidence:input.originEvidence?.map(e=>({url:e.url,text:e.text})),digest:digest(input.text)};
}
export function prepareEvidence(input:VerificationInput){
 const issues:string[]=[];
 const ids=input.sources.map(s=>s.id);
 if(new Set(ids).size!==ids.length)issues.push('Duplicate source identifiers.');
 for(const s of input.sources)if(s.digest!==digest(s.text))issues.push(`Source ${s.id} changed after capture.`);
 for(const side of ['a','b'] as const)if(!input.claims.some(c=>c.position===side))issues.push(`Position ${side} has no evidence.`);
 if(!input.positionA.trim()||!input.positionB.trim()||!input.memberWording.trim())issues.push('Missing proposed wording.');
 const contexts=input.claims.map(c=>{
  const source=input.sources.find(s=>s.id===c.sourceId);
  const at=source?.text.indexOf(c.passage)??-1;
  if(!source||!c.passage.trim()||at<0)issues.push(`Evidence for ${c.position} is absent from its source.`);
  if(!c.reasoning.trim())issues.push(`Evidence for ${c.position} needs an explanation.`);
  // Send the full captured text, not just an isolated quotation, to the verifier.
  return {claim:c,source:source??null,passageOffset:at};
 });
 const used=input.sources.filter(s=>input.claims.some(c=>c.sourceId===s.id));
 const normalise=(s:string)=>s.toLowerCase().replace(/\s+/g,' ').trim();
 if(new Set(used.map(s=>digest(normalise(s.text)))).size<2)issues.push('At least two distinct source texts are required; duplicated reviews are insufficient.');
 return {status:issues.length?'unresolved' as const:'ready_for_verification' as const,issues,contexts,inputDigest:digest(JSON.stringify(input))};
}
