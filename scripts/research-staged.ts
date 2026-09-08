import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {proposeCollision,verifyCollision} from '../lib/claude-research.ts';
import {createResearchBatches} from '../lib/research-batches.ts';
import {snapshotSource} from '../lib/source-evidence.ts';

const [sourcePath,outputPath,sizeText]=process.argv.slice(2);
if(!sourcePath||!outputPath)throw Error('Usage: research:staged sources.json report.json [batch-size]');
if(!process.env.ANTHROPIC_API_KEY||!process.env.ANTHROPIC_MODEL)throw Error('Claude configuration is missing.');
if(!existsSync(sourcePath)||existsSync(outputPath))throw Error('Check the input and choose a new output filename.');
const raw=JSON.parse(readFileSync(sourcePath,'utf8'));
if(!Array.isArray(raw)||raw.length<5||raw.length>15)throw Error('Provide 5–15 complete reviews.');
const sources=raw.map(snapshotSource);
if(sources.some(source=>source.textScope!=='full_review'))throw Error('Every included source must contain the complete review.');
const batches=createResearchBatches(sources,sizeText?Number(sizeText):4);
const reports=[];
for(const [index,batch] of batches.entries()){
  try{
    const proposal=await proposeCollision(batch);
    const verification='status' in proposal?{...proposal,releaseApproved:false}:await verifyCollision(proposal);
    reports.push({batch:index+1,sourceIds:batch.map(source=>source.id),proposal,verification});
    console.log(`Batch ${index+1}: ${verification.status}`);
  }catch(error){
    reports.push({batch:index+1,sourceIds:batch.map(source=>source.id),proposal:null,verification:{status:'unresolved',reason:error instanceof Error?error.message:'Research failed.',releaseApproved:false}});
    console.log(`Batch ${index+1}: unresolved`);
  }
}
writeFileSync(outputPath,JSON.stringify({generatedAt:new Date().toISOString(),model:process.env.ANTHROPIC_MODEL,sourceCount:sources.length,batchSize:sizeText?Number(sizeText):4,reports,releaseApproved:false},null,2),{flag:'wx'});
console.log(`Staged research saved for ${sources.length} reviews in ${batches.length} batches. No candidate is automatically released.`);
