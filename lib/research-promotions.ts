import type {Question} from './types.ts';

export interface ResearchPromotion {
  bookId:string;candidateId:string;targetQuestionId:string;collisionId:string;category:string;
  proposition:string;subtext:string;evidenceDigest:string;verifiedAt:string;sources:string[];
}

export const researchPromotions:ResearchPromotion[]=[{
  bookId:'kundera',candidateId:'ideas-and-felt-life',targetQuestionId:'ku-q1',collisionId:'ku-c1',category:'Ideas / Values',
  proposition:"The novel's philosophical and political ideas strengthen its emotional effect.",
  subtext:"Do the novel's philosophical and political ideas deepen its emotional power, or sometimes leave too little room for the characters' felt lives?",
  evidenceDigest:'4ae1598e99e68b892f616bfc49d7a6a1eace20f74e28eb334154382a01456def:c1882252c3953ac06b0cdc8a71691f451a5dc685aaf0bdde711101724ac07a35',
  verifiedAt:'2026-09-08T17:32:46.417Z',sources:['kundera-review-6','kundera-review-7']
}];

export function getResearchPromotion(bookId:string,candidateId:string){return researchPromotions.find(item=>item.bookId===bookId&&item.candidateId===candidateId);}

export function admitResearchCandidate(draft:Question[],bookId:string,candidateId:string,now=new Date().toISOString()):Question[]{
  const promotion=getResearchPromotion(bookId,candidateId);if(!promotion)throw Error('This candidate is not approved for draft admission.');
  const target=draft.find(question=>question.id===promotion.targetQuestionId);if(!target)throw Error('The matching draft card is unavailable.');
  if(target.locked)throw Error('Unlock the matching draft card before admitting this research.');
  return draft.map(question=>question.id===target.id?{...question,collision_id:promotion.collisionId,category:promotion.category,proposition:promotion.proposition,subtext:promotion.subtext,research:{candidateId,evidenceDigest:promotion.evidenceDigest,admittedAt:now}}:structuredClone(question));
}

export function researchAdmissionState(question:Question,bookId:string):'none'|'verified'|'expired'{
  if(!question.research)return 'none';const promotion=getResearchPromotion(bookId,question.research.candidateId);
  if(!promotion||question.research.evidenceDigest!==promotion.evidenceDigest)return 'expired';
  return question.id===promotion.targetQuestionId&&question.collision_id===promotion.collisionId&&question.category===promotion.category&&question.proposition===promotion.proposition&&question.subtext===promotion.subtext?'verified':'expired';
}
