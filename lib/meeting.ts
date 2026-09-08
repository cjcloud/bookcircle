import type { Book, Meeting, Position, Question, Score } from './types.ts';
export const scoreValues:Score[]=['2','1','0','-1','-2','no_position','absent','not_discussed',''];
export const scoreLabels:Record<Score,string>={'2':'Strongly Agree','1':'Agree','0':'Middle / Unsure','-1':'Disagree','-2':'Strongly Disagree',no_position:'No Position',absent:'Not Present',not_discussed:'Not Discussed','':'Missing'};
export const isScored=(v:string)=>['2','1','0','-1','-2'].includes(v);
export const effective=(r:Position)=>r.final===''?r.initial:r.final;
export function analyse(rows:Position[]){
 const all=rows.map(effective),scores=all.filter(isScored),counts=['2','1','0','-1','-2'].map(v=>scores.filter(x=>x===v).length),positive=counts[0]+counts[1],negative=counts[3]+counts[4],none=all.filter(v=>v==='no_position').length,n=scores.length;
 let shape='Too few positions to describe';
 if(n+none>=3){if(counts[2]+none>=(n+none)/2)shape='The room was not strongly settled';else if(positive>=2&&negative>=2)shape='Different sides of the room';else if(n>=4&&Math.max(positive,negative)>=n*.75&&Math.min(positive,negative)===1)shape='One of us saw it differently';else if(n>=3&&Math.max(positive,negative)>=n*.75)shape=positive>negative?'The room leaned towards agreement':'The room leaned towards disagreement';else shape='A mix of positions';}
 return {counts,shape,n,none,positive,negative,missing:all.filter(v=>v==='').length,absent:all.filter(v=>v==='absent').length,skipped:all.filter(v=>v==='not_discussed').length,movement:rows.filter(r=>isScored(r.initial)&&isScored(r.final)&&r.initial!==r.final).length};
}
export function createMeeting(book:Book,questions:Question[],members:string[],date:string,simulated:boolean):Meeting {
 if(!members.length||members.length>12||members.some(n=>!n.trim())||new Set(members).size!==members.length)throw Error('Enter 1–12 different attendee names.');
 const meeting:Meeting={members,date,simulated,responses:{},skipped:{},notes:{},insights:{}};
 questions.filter(q=>q.question_type==='five_point').forEach((q,i)=>{meeting.responses[q.id]=members.map((_,j)=>({initial:simulated?String(book.sample_scores[i%6][j%6]) as Score:'',final:''}));meeting.skipped[q.id]=simulated&&book.sample_scores[i%6].every(v=>v==='not_discussed');});return meeting;
}
export function recordPosition(meeting:Meeting,qid:string,member:number,phase:'initial'|'final',score:Score):Meeting {
 if(!scoreValues.includes(score)||!meeting.responses[qid]?.[member])throw Error('Invalid meeting entry.');
 const next=structuredClone(meeting);next.responses[qid][member][phase]=score;delete next.insights[qid];return next;
}
