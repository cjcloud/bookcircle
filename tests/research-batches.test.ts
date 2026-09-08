import test from 'node:test';
import assert from 'node:assert/strict';
import {createResearchBatches} from '../lib/research-batches.ts';

test('research batching preserves every source and avoids one-source batches',()=>{
  for(const count of [5,6,7,8,9,10,15]){
    const sources=Array.from({length:count},(_,index)=>index+1);
    const batches=createResearchBatches(sources,4);
    assert.deepEqual(batches.flat(),sources);
    assert.ok(batches.every(batch=>batch.length>=2&&batch.length<=4));
  }
});

test('research batching rejects unsafe batch sizes',()=>{
  assert.throws(()=>createResearchBatches([1,2,3],1));
  assert.throws(()=>createResearchBatches([1],4));
});
