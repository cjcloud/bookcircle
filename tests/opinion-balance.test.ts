import test from 'node:test';
import assert from 'node:assert/strict';
import {summariseOpinion,type StanceRow} from '../lib/opinion-balance.ts';

const rows=(values:StanceRow['stance'][]):StanceRow[]=>values.map((stance,index)=>({sourceId:String(index),stance,passage:'x',reasoning:'x'}));

test('source coverage reports every stance without ranking viewpoints',()=>{
  const result=summariseOpinion(rows(['a','a','mixed','b','not_addressed','unresolved']),6);
  assert.deepEqual(result,{counts:{a:2,mixed:1,b:1,not_addressed:1,unresolved:1},totalSources:6,addressed:4,coverage:4/6});
  assert.equal('medianLabel' in result,false);
  assert.equal('label' in result,false);
});

test('silence does not count as addressing a discussion polarity',()=>{
  const result=summariseOpinion(rows(['a','b','not_addressed','not_addressed']),4);
  assert.equal(result.addressed,2);
  assert.equal(result.coverage,0.5);
});
