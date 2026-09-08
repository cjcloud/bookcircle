import type { Book, Question } from './types.ts';
export const editorialPrinciples = [
 'Each prompt names the relevant action, relationship, technique or consequence and explains both positions fairly; it does not leave abstract words such as “choice”, “escape” or “too much” for the reader to interpret.',
 'Both positions assess the same named issue and differ meaningfully; compatible observations are not presented as opposites.',
 'The connection between a character, event and interpretation is explicit; the reader does not have to supply missing reasoning.',
 'Every tone uses precise, natural English without slang, jargon or forced informality, and preserves the meaning.',
 'Research claims are traceable to supporting passages, retain important qualifications and do not invent disagreement or imply unsupported consensus; sample material stays clearly labelled as simulated.'
];
export function reviewFingerprint(book:Book,questions:Question[]){
 return JSON.stringify({policy:2,questions:questions.map(({locked,...q})=>q),collisions:book.collisions,lenses:book.lenses,summary:book.summary});
}
export function policyIssues(book:Book,questions:Question[]):string[]{
 const issues:string[]=[];
 const weak=['pushes for tears','sympathy may soften judgement','which moments support your reading','grief and the remembered self','choices she could have made','love, escape, or both','feel real or predictable','where did the writing help you feel more','when did it seem like an excuse','did it try too hard','push you to feel them','link he gave her','feelings shaped mainly','intended emotion','death produces','how it produces each action','damaging extension','earn its emotional force'];
 const texts=[...questions.map(q=>[q.id,q.proposition+' '+q.subtext]),...book.lenses.map(l=>[l.title,[l.core_idea,l.why_it_matters,l.what_it_changes,l.disagreement].join(' ')]),...book.collisions.map(c=>[c.id,c.lens_a+' '+c.lens_b]),...book.findings.map(f=>[f.id,f.text])];
 for(const [id,text] of texts)for(const phrase of weak)if(text.toLowerCase().includes(phrase))issues.push(`${id}: Replace imprecise wording: “${phrase}”. Explain the specific meaning.`);
 for(const c of book.collisions){
  if(!c.research||!['simulated','researched'].includes(c.research.status)){issues.push(`${c.id}: Declare whether the material is simulated or researched.`);continue;}
  if(c.research.status==='simulated')continue;
  issues.push(`${c.id}: Source-fidelity verification is not yet available. Research-backed finalisation is blocked.`);
  const positions=c.research.positions;
  if(!positions||!positions.a?.length||!positions.b?.length){issues.push(`${c.id}: Both researched positions need source support.`);continue;}
  const refs=[...positions.a,...positions.b];
  for(const ref of refs)if(!ref.source.trim()||!/^https?:\/\//.test(ref.url)||!ref.passage.trim()||!ref.reasoning.trim())issues.push(`${c.id}: Each source needs a title, URL, supporting passage and explanation of how it supports the position.`);
  if(new Set(refs.map(r=>r.url.trim())).size<2)issues.push(`${c.id}: A researched disagreement needs more than one source.`);
 }
 return issues;
}
