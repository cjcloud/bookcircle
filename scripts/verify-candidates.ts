import {readFile,writeFile} from 'node:fs/promises';
import {snapshotSource,type EvidenceClaim,type SourceSnapshot} from '../lib/source-evidence.ts';
import {verifyCollision} from '../lib/claude-research.ts';

interface CandidateInput {
  id:string;
  positionA:string;
  positionB:string;
  memberWording:string;
  claims:EvidenceClaim[];
}

function isCandidate(value:unknown):value is CandidateInput {
  if(!value||typeof value!=='object')return false;
  const row=value as Partial<CandidateInput>;
  return typeof row.id==='string'&&typeof row.positionA==='string'&&typeof row.positionB==='string'&&typeof row.memberWording==='string'&&Array.isArray(row.claims);
}

const [sourcePath,candidatePath,outputPath]=process.argv.slice(2);
if(!sourcePath||!candidatePath||!outputPath)throw Error('Usage: verify:candidates <sources.json> <candidates.json> <output.json>');

const sourceRows=JSON.parse(await readFile(sourcePath,'utf8')) as Omit<SourceSnapshot,'digest'>[];
const candidateRows=JSON.parse(await readFile(candidatePath,'utf8')) as unknown;
if(!Array.isArray(sourceRows)||sourceRows.length<2)throw Error('At least two source records are required.');
if(!Array.isArray(candidateRows)||!candidateRows.length||!candidateRows.every(isCandidate))throw Error('Candidate file is invalid.');
const sources=sourceRows.map(snapshotSource);
const reports=[];
for(const candidate of candidateRows){
  const verification=await verifyCollision({
    positionA:candidate.positionA,
    positionB:candidate.positionB,
    memberWording:candidate.memberWording,
    claims:candidate.claims,
    sources
  });
  reports.push({candidate,verification});
}
const output={generatedAt:new Date().toISOString(),model:process.env.ANTHROPIC_MODEL,reports,releaseApproved:false};
await writeFile(outputPath,JSON.stringify(output,null,2)+'\n',{flag:'wx'});
console.log(`Verification saved: ${reports.map(report=>`${report.candidate.id}=${report.verification.status}`).join(', ')}. Not approved for release.`);
