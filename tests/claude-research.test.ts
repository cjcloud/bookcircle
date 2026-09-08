import test from 'node:test';
import assert from 'node:assert/strict';
import {askClaude} from '../lib/claude-research.ts';
test('Claude transport fails closed on HTTP, truncation and malformed JSON',async()=>{
 const key=process.env.ANTHROPIC_API_KEY,model=process.env.ANTHROPIC_MODEL;
 process.env.ANTHROPIC_API_KEY='test-only';process.env.ANTHROPIC_MODEL='test-only';
 try {
 for(const response of [new Response('',{status:429}),Response.json({stop_reason:'max_tokens',content:[]}),Response.json({stop_reason:'end_turn',content:[{type:'text',text:'invalid'}]})])await assert.rejects(askClaude('test',{},async()=>response));
 assert.deepEqual(await askClaude('test',{},async()=>Response.json({stop_reason:'end_turn',content:[{type:'text',text:'{"ok":true}'}]})),{ok:true});
 } finally {if(key===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=key;if(model===undefined)delete process.env.ANTHROPIC_MODEL;else process.env.ANTHROPIC_MODEL=model;}
});

test('Claude transport accepts JSON wrapped in a markdown fence',async()=>{
 const key=process.env.ANTHROPIC_API_KEY,model=process.env.ANTHROPIC_MODEL;
 process.env.ANTHROPIC_API_KEY='test-only';process.env.ANTHROPIC_MODEL='test-only';
 try {assert.deepEqual(await askClaude('test',{},async()=>Response.json({stop_reason:'end_turn',content:[{type:'text',text:'```json\n{"ok":true}\n```'}]})),{ok:true});}
 finally {if(key===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=key;if(model===undefined)delete process.env.ANTHROPIC_MODEL;else process.env.ANTHROPIC_MODEL=model;}
});

import {proposeCollision} from '../lib/claude-research.ts';
import {snapshotSource} from '../lib/source-evidence.ts';
test('excerpts stop before any API call and summaries are discarded',async()=>{
 const raw={id:'a',url:'https://example.com/a',title:'A',author:'A',retrievedAt:'2026-09-08',text:'Excerpt',textScope:'excerpt',contextSummary:'Not evidence'};
 const source=snapshotSource(raw);
 assert.equal('contextSummary' in source,false);
 const result=await proposeCollision([source],async()=>{throw Error('Must not call API');});
 assert.ok('status' in result&&result.status==='unresolved');
});
import {verifyCollision} from '../lib/claude-research.ts';
const fullSources=()=>['a','b'].map((id,i)=>snapshotSource({id,url:`https://example.com/${id}`,title:id,author:id,retrievedAt:'2026-09-08',text:i?'The ending is unconvincing.':'The ending is convincing.',textScope:'full_review'}));
async function mockSettings(run:()=>Promise<void>){const key=process.env.ANTHROPIC_API_KEY,model=process.env.ANTHROPIC_MODEL;process.env.ANTHROPIC_API_KEY='test';process.env.ANTHROPIC_MODEL='test';try{await run();}finally{if(key===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=key;if(model===undefined)delete process.env.ANTHROPIC_MODEL;else process.env.ANTHROPIC_MODEL=model;}}
const reply=(value:unknown)=>Response.json({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(value)}]});
test('no supported disagreement is a report outcome and source summaries are not sent',async()=>mockSettings(async()=>{
 const sources=fullSources().map(s=>({...s,contextSummary:'DO NOT SEND THIS'}));
 const result=await proposeCollision(sources,async(_url,init)=>{assert.ok(!String(init?.body).includes('DO NOT SEND THIS'));return reply({status:'no_supported_disagreement',reason:'The sources discuss different issues.'});});
 assert.ok('status' in result&&result.status==='no_supported_disagreement');
}));
test('verification preserves rejection and never grants release approval',async()=>mockSettings(async()=>{
 const sources=fullSources();const input={positionA:'Convincing',positionB:'Unconvincing',memberWording:'The ending is convincing.',sources,claims:sources.map((s,i)=>({position:i?'b' as const:'a' as const,sourceId:s.id,passage:s.text,reasoning:'Claim'}))};
 const checks=['attribution','qualifications','disagreement','memberWording','sourceIndependence'].map(name=>({name,status:name==='disagreement'?'unsupported':'supported',reason:'Test judgement',sourceIds:['a','b']}));
 const result=await verifyCollision(input,async()=>reply({checks}));assert.equal(result.status,'unsupported');assert.ok('releaseApproved' in result&&result.releaseApproved===false);
 await assert.rejects(verifyCollision(input,async()=>reply({checks:checks.slice(1)})),/Incomplete/);
}));
