import { reviewFingerprint, policyIssues } from '../lib/editorial-policy.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateMap, parseQuestions, validateForBook, selectCollisions } from '../lib/editorial.ts';
import { replaceQuestion, adjustTone, rewordQuestion } from '../lib/curator.ts';
import { editDraft, finalise as finaliseChecked, freshWorkspace, readWorkspace } from '../lib/workspace.ts';
import { analyse, createMeeting, recordPosition } from '../lib/meeting.ts';
import {toneWording} from '../lib/tone-wording.ts';
import type { Book, Question, Diagnostics, Score } from '../lib/types.ts';
const books=JSON.parse(readFileSync('data/books.json','utf8')) as Book[];
const parity=JSON.parse(readFileSync('tests/python-parity.json','utf8')) as {book_id:string;case:string;questions:Question[];expected:Diagnostics}[];
for(const fixture of parity)test(`Python parity: ${fixture.book_id} / ${fixture.case}`,()=>{const actual=validateMap(fixture.questions);assert.deepEqual({...actual,issues:actual.issues.sort()},{...fixture.expected,issues:fixture.expected.issues.sort()});});
test('all fixture collision links and candidates survive migration',()=>{for(const b of books){assert.equal(b.collisions.length,10);assert.equal(validateForBook(b,b.questions).valid,true);for(const c of b.collisions){assert.ok(c.finding_ids.every(id=>b.findings.some(f=>f.id===id)));}assert.equal(selectCollisions(b.collisions).length,6);}});
test('cross-book provenance and malformed payloads are rejected',()=>{const b=books[0],q=structuredClone(b.questions);q[0].collision_id='ku-c1';assert.equal(validateForBook(b,q).valid,false);assert.throws(()=>parseQuestions([{...q[0],proposition:''}],b));assert.throws(()=>parseQuestions([q[0],q[0]],b));assert.throws(()=>parseQuestions([{...q[0],locked:'yes'}],b));});
test('replacement changes collision, reword preserves it, locks protect both',()=>{const b=books[0],q=structuredClone(b.questions);const replaced=replaceQuestion(q,q[0].id,b,b.collisions[6].id);assert.notEqual(replaced[0].collision_id,q[0].collision_id);assert.equal(replaced[0].id,q[0].id);assert.equal(rewordQuestion(q,q[0].id,b)[0].collision_id,q[0].collision_id);q[0].locked=true;assert.throws(()=>replaceQuestion(q,q[0].id,b,b.collisions[6].id));assert.throws(()=>rewordQuestion(q,q[0].id,b));assert.deepEqual(adjustTone(q,'Thoughtful',b)[0],q[0]);});
test('tone proposals do not mutate the draft and remain structurally valid for every book',()=>{for(const b of books){const before=JSON.stringify(b.questions);for(const tone of ['Conversational','Direct','Thoughtful'] as const)assert.equal(validateForBook(b,adjustTone(b.questions,tone,b)).valid,true);assert.equal(JSON.stringify(b.questions),before);}});
test('draft, history, final snapshot and meeting remain isolated',()=>{const b=books[0],s=freshWorkspace(b),f=finalise(s,b);const q=structuredClone(s.draft);q[0].proposition='A different proposition.';const edited=editDraft(f,b,q,'manual');assert.equal(f.final?.questions[0].proposition,s.draft[0].proposition);assert.notEqual(edited.draft[0].proposition,edited.final?.questions[0].proposition);assert.equal(edited.history[0].questions[0].proposition,s.draft[0].proposition);edited.meeting=createMeeting(b,f.final!.questions,['A','B'],'',true);assert.throws(()=>finalise(edited,b));assert.deepEqual(readWorkspace(JSON.stringify(edited),b),edited);});
test('malformed saved meeting data does not load',()=>{const b=books[0],s=finalise(freshWorkspace(b),b);s.meeting=createMeeting(b,s.final!.questions,['A'],'',true);s.meeting.responses[s.final!.questions[0].id][0].initial='bad' as Score;assert.throws(()=>readWorkspace(JSON.stringify(s),b));});
const rows=(values:Score[])=>values.map(initial=>({initial,final:'' as Score}));
test('same mean has different response shapes',()=>{assert.equal(analyse(rows(['0','0','0','0','0','0'])).shape,'The room was not strongly settled');assert.equal(analyse(rows(['2','2','2','-2','-2','-2'])).shape,'Different sides of the room');});
test('consensus, an isolated different view and unknown data stay distinct',()=>{assert.equal(analyse(rows(['2','2','1','1','1','2'])).shape,'The room leaned towards agreement');assert.equal(analyse(rows(['2','2','1','1','1','-2'])).shape,'One of us saw it differently');const a=analyse(rows(['','absent','not_discussed','no_position']));assert.equal(a.n,0);assert.equal(a.missing,1);assert.equal(a.none,1);assert.equal(a.absent,1);assert.equal(a.skipped,1);});
test('final zero counts as movement, empty final retains initial',()=>{const a=analyse([{initial:'2',final:'0'},{initial:'1',final:''}]);assert.equal(a.movement,1);assert.deepEqual(a.counts,[0,1,1,0,0]);});
test('correcting a response invalidates its approved observation only',()=>{const b=books[0],m=createMeeting(b,b.questions,['A','B'],'',true),id=b.questions[0].id;m.insights[id]={text:'Approved',approved:true};const n=recordPosition(m,id,0,'initial','');assert.equal(n.insights[id],undefined);assert.equal(m.insights[id].approved,true);assert.equal(n.responses[id][0].initial,'');});

test('plain English update revises test-locked drafts once and preserves the Chair snapshot',()=>{
 const book=books[0], state=freshWorkspace(book);
 delete state.wordingRevision;
 state.draft[0]={...state.draft[0],locked:true,subtext:'Old test wording'};
 state.final={questions:structuredClone(state.draft),date:'2026-09-07'};
 const updated=readWorkspace(JSON.stringify(state),book);
 assert.equal(updated.draft[0].locked,true);
 assert.equal(updated.draft[0].subtext,book.questions[0].subtext);
 assert.equal(updated.history.at(-1)?.questions[0].subtext,'Old test wording');
 assert.equal(updated.final?.questions[0].subtext,'Old test wording');
 assert.deepEqual(readWorkspace(JSON.stringify(updated),book),updated);
});

function finalise(state:ReturnType<typeof freshWorkspace>,book:Book){return finaliseChecked({...state,editorialApproval:reviewFingerprint(book,state.draft)},book);}
test('finalisation requires review of the current wording',()=>{
 const book=books[0],state=freshWorkspace(book);
 assert.throws(()=>finaliseChecked(state,book),/Review the wording/);
 state.editorialApproval=reviewFingerprint(book,state.draft);
 assert.ok(finaliseChecked(state,book).final);
 state.draft[0].subtext='A changed question';
 assert.throws(()=>finaliseChecked(state,book),/Review the wording/);
});
test('research claims require support for both positions from multiple sources',()=>{
 const book=structuredClone(books[0]);
 book.collisions[0].research={status:'researched'};
 assert.ok(policyIssues(book,book.questions).some(s=>s.includes('Both researched positions')));
 const support={source:'Sample',url:'https://example.com/review',passage:'Passage',reasoning:'Reason'};
 book.collisions[0].research.positions={a:[support],b:[support]};
 assert.ok(policyIssues(book,book.questions).some(s=>s.includes('more than one source')));
});
test('known rejected language is flagged without changing the Python validator',()=>{
 const book=structuredClone(books[0]);book.questions[0].subtext='The prose pushes for tears.';
 assert.ok(validateForBook(book,book.questions).issues.some(s=>s.includes('imprecise wording')));
});
test('ambiguous links and illogical causation are rejected by the editorial policy',()=>{
 const rejected=['the link he gave her','their feelings shaped mainly to sustain the triangle','the intended emotion','Bobby\'s death produces secrecy','a damaging extension of his guilt'];
 for(const phrase of rejected){const book=structuredClone(books[0]);book.questions[0].subtext=phrase;assert.ok(policyIssues(book,book.questions).some(s=>s.includes('imprecise wording')),phrase);}
});
test('every Broken Country tone names the concrete subject of its disagreement',()=>{
 const b=books.find(book=>book.id==='broken-country')!;
 const anchors:Record<string,RegExp>={
  'bc-c1':/(?=.*Bobby)(?=.*(?:Frank|affair))/i,'bc-c2':/(?=.*Gabriel)(?=.*(?:future|seventeen))/i,'bc-c3':/(?=.*(?:Beth|relationships|characters))(?=.*(?:Hall|plot|motives|conflict|triangle))/i,
  'bc-c4':/(?=.*(?:Hall|detail|descript|writing))(?=.*(?:emotion|grief|feel))/i,'bc-c5':/(?=.*(?:grief|Bobby's death))(?=.*(?:Beth|Frank|Jimmy))/i,'bc-c6':/(?=.*(?:Bobby|shooting))(?=.*(?:suspense|information|revelation|plot|surprise|manipulative))/i,
  'broken-country-extra-1':/(?=.*Frank)(?=.*(?:Leo|Bobby|shooting))/i,'broken-country-extra-2':/(?=.*(?:Beth|Frank|characters|loss))(?=.*(?:emotion|pain|narration))/i,
  'broken-country-extra-3':/(?=.*(?:Gabriel|shooting))(?=.*(?:coincidence|chance|plot))/i,'broken-country-extra-4':/(?=.*(?:Frank|farm|family))(?=.*(?:Gabriel|romance|responsibilit|obligation))/i
 };
 for(const collision of b.collisions){for(const tone of ['Conversational','Direct','Thoughtful'] as const){const text=toneWording[collision.id][tone];assert.match(text,anchors[collision.id],`${collision.id} ${tone}: ${text}`);}}
});

test('complete citations cannot bypass source-fidelity gate',()=>{
 const book=structuredClone(books[0]);
 const support={source:'Review A',url:'https://example.com/a',passage:'Passage',reasoning:'Reason'};
 book.collisions[0].research={status:'researched',positions:{a:[support],b:[{...support,url:'https://example.org/b'}]}};
 const state=freshWorkspace(book);state.editorialApproval=reviewFingerprint(book,state.draft);
 assert.ok(policyIssues(book,state.draft).some(s=>s.includes('Source-fidelity verification')));
 assert.throws(()=>finaliseChecked(state,book),/editorial issues/);
});
