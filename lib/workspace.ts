import { reviewFingerprint } from './editorial-policy.ts';
import { toneWording } from './tone-wording.ts';
import type { Book, Question, Workspace } from './types.ts';
import { parseQuestions, validateForBook } from './editorial.ts';
import { scoreValues } from './meeting.ts';
import {researchAdmissionState,type ResearchPromotion,defaultResearchPromotions} from './research-promotions.ts';
export const storageKey=(id:string)=>`bcb-admin-v11:${id}`;
export function freshWorkspace(book:Book):Workspace { return {schema:1,wordingRevision:3,draft:structuredClone(book.questions),history:[],chat:[],tone:'Conversational',final:null,meeting:null,diagnostics:validateForBook(book,book.questions)}; }
export function editDraft(state:Workspace,book:Book,questions:Question[],reason:string,promotions:ResearchPromotion[]=defaultResearchPromotions):Workspace {
 const parsed=parseQuestions(questions,book,promotions);
 for(const q of state.draft){if(!q.locked)continue;const next=parsed.find(x=>x.id===q.id);if(!next||JSON.stringify({...q,locked:false})!==JSON.stringify({...next,locked:false}))throw Error('Locked questions cannot be changed.');}
 return {...state,draft:parsed,history:[...state.history,{time:new Date().toISOString(),reason,questions:structuredClone(state.draft)}],diagnostics:validateForBook(book,parsed)};
}
export function finalise(state:Workspace,book:Book,promotions:ResearchPromotion[]=defaultResearchPromotions):Workspace {
 if(state.editorialApproval!==reviewFingerprint(book,state.draft))throw Error('Review the wording and research checklist before finalising.');
 if(state.meeting)throw Error('Meeting capture is attached to the saved Chair version.');
 if(state.draft.some(question=>researchAdmissionState(question,book.id,promotions)==='expired'))throw Error('A research-backed question has changed. Restore its verified wording or replace it before finalising.');
 const diagnostics=validateForBook(book,parseQuestions(state.draft,book,promotions));if(!diagnostics.valid)throw Error('Resolve the editorial issues before finalising.');
 return {...state,diagnostics,final:{questions:structuredClone(state.draft),date:new Date().toISOString()}};
}
export function readWorkspace(raw:string,book:Book,promotions:ResearchPromotion[]=defaultResearchPromotions):Workspace {
 const state=JSON.parse(raw) as Workspace;
 if(!state||state.schema!==1||!Array.isArray(state.history)||!Array.isArray(state.chat)||!['Conversational','Direct','Thoughtful'].includes(state.tone))throw Error('Saved workspace format is invalid.');
 state.draft=parseQuestions(state.draft,book,promotions);state.diagnostics=validateForBook(book,state.draft);
 for(const entry of state.history){parseQuestions(entry.questions,book,promotions);if(typeof entry.reason!=='string'||typeof entry.time!=='string')throw Error('Invalid history.');}
 for(const entry of state.chat)if(typeof entry.role!=='string'||typeof entry.text!=='string')throw Error('Invalid chat history.');
 if(state.final){state.final.questions=parseQuestions(state.final.questions,book,promotions);if(typeof state.final.date!=='string')throw Error('Invalid Chair version.');}
 if(state.meeting){const m=state.meeting;if(!state.final||!Array.isArray(m.members)||m.members.length<1||m.members.length>12||m.members.some(n=>typeof n!=='string')||new Set(m.members).size!==m.members.length)throw Error('Invalid meeting members.');
 if(typeof m.date!=='string'||typeof m.simulated!=='boolean'||!m.notes||!m.insights||!m.skipped||!m.responses)throw Error('Invalid meeting.');
 for(const q of state.final.questions.filter(q=>q.question_type==='five_point')){const rows=m.responses[q.id];if(!Array.isArray(rows)||rows.length!==m.members.length||rows.some(r=>!r||!scoreValues.includes(r.initial)||!scoreValues.includes(r.final)))throw Error('Invalid meeting responses.');if(m.notes[q.id]!==undefined&&typeof m.notes[q.id]!=='string')throw Error('Invalid note.');const insight=m.insights[q.id];if(insight&&(typeof insight.text!=='string'||typeof insight.approved!=='boolean'))throw Error('Invalid observation.');}
 }
 if(state.wordingRevision!==3){
  state.history.push({time:new Date().toISOString(),reason:'Before the logical clarity and concrete referent wording update (including test locks)',questions:structuredClone(state.draft)});
  state.draft=state.draft.map(q=>{if(researchAdmissionState(q,book.id,promotions)==='verified')return q;const source=q.optional?book.questions.find(x=>x.id===q.id):book.collisions.find(c=>c.id===q.collision_id)?.question;return source?{...q,proposition:source.proposition,subtext:q.optional?source.subtext:toneWording[q.collision_id??q.id]?.[state.tone]??source.subtext}:q;});
  state.wordingRevision=3;state.diagnostics=validateForBook(book,state.draft);
 }
 return state;
}
