import { toneWording } from './tone-wording.ts';
import type { Book, Question, Tone } from './types.ts';
export function replaceQuestion(draft:Question[],id:string,book:Book,collisionId:string){
 const q=draft.find(q=>q.id===id),collision=book.collisions.find(c=>c.id===collisionId);
 if(!q||q.locked||q.optional)throw Error('Select an unlocked scored question.');
 if(!collision||draft.some(q=>q.collision_id===collisionId))throw Error('Choose an unused collision.');
 return draft.map(x=>x.id===id?{...structuredClone(collision.question),id}:structuredClone(x));
}
export function rewordQuestion(draft:Question[],id:string,book:Book){
 const q=draft.find(q=>q.id===id);if(!q||q.locked)throw Error('Unlock this question before editing it.');
 return draft.map(x=>x.id===id?{...x,subtext:toneWording[x.collision_id??x.id]?.Conversational??x.subtext}:{...x});
}
export function adjustTone(draft:Question[],tone:Tone,book:Book){
 return draft.map(q=>q.locked?{...q}:{...q,subtext:toneWording[q.collision_id??q.id]?.[tone]??q.subtext});
}
