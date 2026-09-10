import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotSource} from '../lib/source-evidence.ts';
import {prepareProfileEvidence} from '../lib/profile-evidence.ts';

const a=snapshotSource({id:'a',url:'https://example.com/a',title:'A',author:'A',retrievedAt:'2026-09-07',text:'A tense, atmospheric thriller. The pacing drags in the middle third.',textScope:'full_review'});
const b=snapshotSource({id:'b',url:'https://example.org/b',title:'B',author:'B',retrievedAt:'2026-09-07',text:'The pacing is sluggish for long stretches. The ending redeems it.',textScope:'full_review'});
const input=()=>({
 genre:'Psychological thriller',
 summaryNoSpoilers:'A detective investigates a disappearance in a small town.',
 summarySpoilers:'A detective investigates a disappearance in a small town and discovers the culprit was her own partner.',
 opinions:[{sourceId:'a',author:'A',publication:'Pub A',quote:'A tense, atmospheric thriller',url:a.url,containsSpoilers:false}],
 points:[{sentiment:'negative' as const,text:'The pacing drags in the middle.',evidence:[{sourceId:'a',passage:'The pacing drags in the middle third'},{sourceId:'b',passage:'The pacing is sluggish for long stretches'}]}],
 sources:[a,b],
});

test('complete profile is ready for verification',()=>{
 const result=prepareProfileEvidence(input());
 assert.equal(result.status,'ready_for_verification');
 assert.equal(result.issues.length,0);
});

test('a changed source invalidates preparation',()=>{
 const x=input();
 x.sources=[{...a,text:'Changed text'},b];
 assert.equal(prepareProfileEvidence(x).status,'unresolved');
});

test('an opinion quote absent from its source cannot pass',()=>{
 const x=input();
 x.opinions[0].quote='This exact phrase never appears anywhere.';
 assert.equal(prepareProfileEvidence(x).status,'unresolved');
});

test('typographic quote/dash differences between source and model output do not fail the fidelity check',()=>{
 const curly=snapshotSource({id:'c',url:'https://example.net/c',title:'C',author:'C',retrievedAt:'2026-09-07',text:'The reviewer called it \u2018a tense, atmospheric thriller\u2019 \u2014 a rare feat.',textScope:'full_review'});
 const x=input();
 x.sources=[a,curly,b];
 // Straight quotes and a plain hyphen, as a model commonly renders them in JSON,
 // for text the source actually presents with curly quotes and an em dash.
 x.opinions[0]={sourceId:'c',author:'A',publication:'Pub A',quote:"a tense, atmospheric thriller",url:curly.url,containsSpoilers:false};
 const result=prepareProfileEvidence(x);
 assert.equal(result.status,'ready_for_verification');
 assert.equal(result.issues.length,0);
});

test('an actually reworded quote still fails even after typography normalization',()=>{
 const curly=snapshotSource({id:'c',url:'https://example.net/c',title:'C',author:'C',retrievedAt:'2026-09-07',text:'The reviewer called it \u2018a tense, atmospheric thriller\u2019 \u2014 a rare feat.',textScope:'full_review'});
 const x=input();
 x.sources=[a,curly,b];
 x.opinions[0]={sourceId:'c',author:'A',publication:'Pub A',quote:'a tense and atmospheric thriller',url:curly.url,containsSpoilers:false};
 assert.equal(prepareProfileEvidence(x).status,'unresolved');
});

test('a quote spanning markdown emphasis markers around a book title matches the plain-text version',()=>{
 const markdown=snapshotSource({id:'d',url:'https://example.net/d',title:'D',author:'D',retrievedAt:'2026-09-07',text:'It is the existential dilemma at the core of *Anna Karenina* that he restates in modern terms.',textScope:'full_review'});
 const x=input();
 x.sources=[a,markdown,b];
 x.opinions[0]={sourceId:'d',author:'A',publication:'Pub A',quote:'It is the existential dilemma at the core of Anna Karenina that he restates in modern terms.',url:markdown.url,containsSpoilers:false};
 const result=prepareProfileEvidence(x);
 assert.equal(result.status,'ready_for_verification');
 assert.equal(result.issues.length,0);
});

test('an opinion missing attribution cannot pass',()=>{
 const x=input();
 x.opinions[0].author='';
 assert.equal(prepareProfileEvidence(x).status,'unresolved');
});

test('a point with no evidence cannot pass',()=>{
 const x=input();
 x.points[0].evidence=[];
 assert.equal(prepareProfileEvidence(x).status,'unresolved');
});

test('a point citing a passage absent from its source cannot pass',()=>{
 const x=input();
 x.points[0].evidence[0].passage='Never appears in the source at all.';
 assert.equal(prepareProfileEvidence(x).status,'unresolved');
});

test('a point citing an unknown source id cannot pass',()=>{
 const x=input();
 x.points[0].evidence[0].sourceId='unknown';
 assert.equal(prepareProfileEvidence(x).status,'unresolved');
});

test('missing genre or summaries cannot pass',()=>{
 const noGenre=input();noGenre.genre='';
 assert.equal(prepareProfileEvidence(noGenre).status,'unresolved');
 const noSummary=input();noSummary.summarySpoilers='';
 assert.equal(prepareProfileEvidence(noSummary).status,'unresolved');
});

test('duplicated reviews cannot count as two distinct sources',()=>{
 const x=input();
 x.sources=[a,snapshotSource({...b,text:a.text})];
 x.points[0].evidence=[{sourceId:'a',passage:'The pacing drags in the middle third'},{sourceId:'b',passage:'The pacing drags in the middle third'}];
 assert.equal(prepareProfileEvidence(x).status,'unresolved');
});

test('changed wording invalidates the input digest',()=>{
 const x=input();
 const before=prepareProfileEvidence(x).inputDigest;
 x.summaryNoSpoilers='Different summary text entirely.';
 assert.notEqual(prepareProfileEvidence(x).inputDigest,before);
});

test('duplicate source identifiers cannot pass',()=>{
 const x=input();
 x.sources=[a,{...b,id:'a'}];
 assert.equal(prepareProfileEvidence(x).status,'unresolved');
});

test('the input digest is stable across a JSON round trip that reorders object keys',()=>{
 // Simulates what happens when a report is saved to and reloaded from a
 // Postgres jsonb column: the same content, but nested objects can come
 // back with their keys in a different order than when they were built
 // in memory. A digest that depended on key order would wrongly treat
 // this as a changed report and block publishing an untampered one.
 const x=input();
 const before=prepareProfileEvidence(x).inputDigest;
 const reordered=JSON.parse(JSON.stringify(x),(key,value)=>{
  if(value&&typeof value==='object'&&!Array.isArray(value)){
   const flipped:Record<string,unknown>={};
   for(const k of Object.keys(value).reverse()) flipped[k]=value[k];
   return flipped;
  }
  return value;
 });
 assert.equal(prepareProfileEvidence(reordered).inputDigest,before);
});
