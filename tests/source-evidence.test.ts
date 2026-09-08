import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotSource,prepareEvidence} from '../lib/source-evidence.ts';
const a=snapshotSource({id:'a',url:'https://example.com/a',title:'A',author:'A',retrievedAt:'2026-09-07',text:'The plot works, though the ending is rushed.'});
const b=snapshotSource({id:'b',url:'https://example.org/b',title:'B',author:'B',retrievedAt:'2026-09-07',text:'The plot is unconvincing. The ending cannot repair it.'});
const input=()=>({positionA:'The plot works.',positionB:'The plot does not work.',memberWording:'The plot is convincing.',sources:[a,b],claims:[{position:'a' as const,sourceId:'a',passage:'The plot works',reasoning:'Positive assessment'},{position:'b' as const,sourceId:'b',passage:'The plot is unconvincing.',reasoning:'Negative assessment'}]});
test('complete evidence is only ready for verification and retains qualifications',()=>{const result=prepareEvidence(input());assert.equal(result.status,'ready_for_verification');assert.ok(result.contexts[0].source?.text.includes('though the ending is rushed'));});
test('wrong attribution cannot pass preparation',()=>{const x=input();x.claims[0].sourceId='b';assert.equal(prepareEvidence(x).status,'unresolved');});
test('changed source and changed wording invalidate the input digest',()=>{const x=input(),before=prepareEvidence(x).inputDigest;x.memberWording='Different wording';assert.notEqual(prepareEvidence(x).inputDigest,before);x.sources=[{...a,text:'Changed'},b];assert.equal(prepareEvidence(x).status,'unresolved');});
test('copied reviews cannot count as two sources',()=>{const x=input();x.sources=[a,snapshotSource({...b,text:a.text})];x.claims[1].passage=x.claims[0].passage;assert.equal(prepareEvidence(x).status,'unresolved');});

test('authorship evidence is retained separately and arbitrary summaries are stripped',()=>{
 const source=snapshotSource({...a,originEvidence:[{url:'https://example.com/about',text:'Written by the named author.'}]});
 assert.equal(source.originEvidence?.[0].text,'Written by the named author.');
 assert.throws(()=>snapshotSource({...a,originEvidence:[{url:'javascript:bad',text:'Claim'}]}),/authorship/);
});
