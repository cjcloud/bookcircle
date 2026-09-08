import {readFile,writeFile} from 'node:fs/promises';
import {askClaude} from '../lib/claude-research.ts';
import {snapshotSource,type SourceSnapshot} from '../lib/source-evidence.ts';
import {summariseOpinion,type OpinionStance,type StanceRow} from '../lib/opinion-balance.ts';

interface Candidate {id:string;positionA:string;positionB:string;memberWording:string}
const rowSchema={type:'object',properties:{sourceId:{type:'string'},stance:{type:'string',enum:['a','mixed','b','not_addressed','unresolved']},passage:{type:'string'},reasoning:{type:'string'}},required:['sourceId','stance','passage','reasoning'],additionalProperties:false};
const schema={type:'object',properties:{rows:{type:'array',items:rowSchema}},required:['rows'],additionalProperties:false};
const stances=new Set<OpinionStance>(['a','mixed','b','not_addressed','unresolved']);

const [sourcePath,candidatePath,outputPath]=process.argv.slice(2);
if(!sourcePath||!candidatePath||!outputPath)throw Error('Usage: measure:opinion <sources.json> <candidates.json> <output.json>');
const sources=(JSON.parse(await readFile(sourcePath,'utf8')) as Omit<SourceSnapshot,'digest'>[]).map(snapshotSource);
const candidates=JSON.parse(await readFile(candidatePath,'utf8')) as Candidate[];
if(sources.length<5||!Array.isArray(candidates)||!candidates.length)throw Error('Complete sources and at least one candidate are required.');

const reports=[];
for(const candidate of candidates){
  const raw=await askClaude(`Classify every supplied review on this exact disagreement. Use stance a only when the review substantively supports positionA; b only for positionB; mixed when it expresses both or a materially qualified middle view; not_addressed when it does not assess this issue; unresolved when the text is ambiguous. Do not infer a view from silence, plot summary, star rating or general praise. For a, b or mixed, provide one exact source substring of no more than 35 words and explain the classification in one concise sentence while preserving qualifications. For not_addressed use an empty passage and one concise sentence explaining what is absent. Return every source exactly once.`,{candidate,sources},undefined,8000,schema) as {rows?:StanceRow[]};
  const received=Array.isArray(raw.rows)?raw.rows:[];
  const byId=new Map(received.filter(row=>row&&typeof row.sourceId==='string').map(row=>[row.sourceId,row]));
  const rows=sources.map(source=>{
    const row=byId.get(source.id);
    if(!row||!stances.has(row.stance)||typeof row.passage!=='string'||typeof row.reasoning!=='string')return {sourceId:source.id,stance:'unresolved' as const,passage:'',reasoning:'No complete classification was returned.'};
    if(row.stance!=='not_addressed'&&!row.passage.trim())return {...row,stance:'unresolved' as const,reasoning:'The classification did not include supporting text.'};
    if(row.passage&& !source.text.includes(row.passage))return {...row,stance:'unresolved' as const,reasoning:'The proposed supporting passage was not an exact substring of the captured review.'};
    return row;
  });
  reports.push({candidate,rows,summary:summariseOpinion(rows,sources.length)});
}
await writeFile(outputPath,JSON.stringify({generatedAt:new Date().toISOString(),model:process.env.ANTHROPIC_MODEL,method:'source coverage mapping for discussion polarities; no central tendency or viewpoint ranking',reports,releaseApproved:false},null,2)+'\n',{flag:'wx'});
console.log(`Source coverage saved for ${reports.length} discussion polarities across ${sources.length} reviews. Viewpoints were not scored or ranked.`);
