import test from 'node:test';
import assert from 'node:assert/strict';
import books from '../data/books.json' with {type:'json'};
import type {Book} from '../lib/types.ts';
import {admitResearchCandidate,researchAdmissionState} from '../lib/research-promotions.ts';
import {finalise,freshWorkspace,readWorkspace} from '../lib/workspace.ts';
import {reviewFingerprint} from '../lib/editorial-policy.ts';

const book=(books as unknown as Book[]).find(item=>item.id==='kundera')!;
const brokenCountry=(books as unknown as Book[]).find(item=>item.id==='broken-country')!;

test('verified research promotion replaces only its intended draft card',()=>{
  const original=freshWorkspace(book).draft;
  const promoted=admitResearchCandidate(original,book.id,'ideas-and-felt-life','2026-09-08T00:00:00.000Z');
  assert.equal(researchAdmissionState(promoted[0],book.id),'verified');
  assert.equal(promoted[0].proposition,"The novel's philosophical and political ideas strengthen its emotional effect.");
  assert.deepEqual(promoted.slice(1),original.slice(1));
  assert.equal(researchAdmissionState({...promoted[0],proposition:'Changed wording'},book.id),'expired');
});

test('verified Broken Country research promotions replace only their intended cards',()=>{
  const original=freshWorkspace(brokenCountry).draft;
  const bethPromoted=admitResearchCandidate(original,brokenCountry.id,'beth-characterisation','2026-09-08T21:25:34.000Z');
  assert.equal(researchAdmissionState(bethPromoted[0],brokenCountry.id),'verified');
  assert.equal(bethPromoted[0].proposition,"Beth's affair with Gabriel comes across as a believable, sympathetic response to grief rather than as selfishness or immaturity.");
  assert.deepEqual(bethPromoted.slice(1),original.slice(1));

  const prosePromoted=admitResearchCandidate(bethPromoted,brokenCountry.id,'prose-style','2026-09-08T21:25:55.000Z');
  assert.equal(researchAdmissionState(prosePromoted[3],brokenCountry.id),'verified');
  assert.equal(prosePromoted[3].proposition,"Hall's prose stays disciplined and restrained throughout the novel rather than becoming overly explanatory.");
  assert.equal(researchAdmissionState(prosePromoted[0],brokenCountry.id),'verified');
  assert.deepEqual(prosePromoted.filter((_,index)=>index!==0&&index!==3),original.filter((_,index)=>index!==0&&index!==3));

  assert.equal(researchAdmissionState({...prosePromoted[0],subtext:'Changed wording'},brokenCountry.id),'expired');
});

test('research admission survives a valid backup and changed wording cannot finalise',()=>{
  let state=freshWorkspace(book);state.draft=admitResearchCandidate(state.draft,book.id,'ideas-and-felt-life');
  state=readWorkspace(JSON.stringify(state),book);assert.equal(researchAdmissionState(state.draft[0],book.id),'verified');
  state.editorialApproval=reviewFingerprint(book,state.draft);assert.ok(finalise(state,book).final);
  state={...state,final:null,draft:state.draft.map((question,index)=>index===0?{...question,subtext:'Changed wording'}:question)};
  state.editorialApproval=reviewFingerprint(book,state.draft);
  assert.throws(()=>finalise(state,book),/research-backed question has changed/i);
});
