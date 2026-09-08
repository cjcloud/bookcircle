import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {snapshotSource} from '../lib/source-evidence.ts';
import {proposeCollision,verifyCollision} from '../lib/claude-research.ts';
try {
 const [path,out]=process.argv.slice(2);if(!path||!out)throw Error('Usage: npm run research -- sources.json result.json');
 if(!process.env.ANTHROPIC_API_KEY?.trim()||!process.env.ANTHROPIC_MODEL?.trim())throw Error('SETUP_MISSING');
 if(!existsSync(path))throw Error('INPUT_MISSING');
 if(existsSync(out))throw Error('OUTPUT_EXISTS');
 const raw=JSON.parse(readFileSync(path,'utf8'));if(!Array.isArray(raw)||raw.length<2||raw.length>10)throw Error('Provide 2–10 source records.');
 const sources=raw.map(snapshotSource);
 const proposal=await proposeCollision(sources);
 const verification='status' in proposal?{...proposal,releaseApproved:false}:await verifyCollision(proposal);
 writeFileSync(out,JSON.stringify({proposal,verification},null,2),{flag:'wx'});
 console.log(`Research report saved. Result: ${verification.status}. Not approved for release.`);
}catch(error){
 const message=error instanceof Error?error.message:'';
 const setup:Record<string,string>={SETUP_MISSING:'The .env.local file must contain both ANTHROPIC_API_KEY and ANTHROPIC_MODEL. See CLAUDE_SETUP.md.',INPUT_MISSING:'The input file does not exist. Check the source filename.',OUTPUT_EXISTS:'The output file already exists. Choose a new filename.'};
 const api=message.match(/^Claude request failed \((\d{3})\)/);
 const detail=setup[message]??(api?`Claude returned HTTP ${api[1]}. Check credentials (401), access (403), model/input (400 or 404), or rate limits (429).`:error instanceof SyntaxError?'The source file is not valid JSON.':'Source preparation or verification failed. Check that sources contain complete review text and that the model returned a complete supported proposal.');
 console.error(`Research did not complete: ${detail} No result approved.`);process.exitCode=1;
}
