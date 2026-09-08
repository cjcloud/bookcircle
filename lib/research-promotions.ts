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
},{
  bookId:'broken-country',candidateId:'beth-characterisation',targetQuestionId:'bc-q1',collisionId:'bc-c1',category:'Character / Moral Judgement',
  proposition:"Beth's affair with Gabriel comes across as a believable, sympathetic response to grief rather than as selfishness or immaturity.",
  subtext:"Does Beth's affair with Gabriel read as a believably sympathetic choice, or does it show her as selfish, self-absorbed and emotionally immature, with little growth by the novel's end?",
  evidenceDigest:'ebab6ed5584b3806ec05f2d7af7a7d2403da74c8722201693d5e299166d4c5c5',
  verifiedAt:'2026-09-08T21:25:34.258Z',sources:['bc-munro','bc-schatje']
},{
  bookId:'broken-country',candidateId:'prose-style',targetQuestionId:'bc-q4',collisionId:'bc-c4',category:'Writing / Style',
  proposition:"Hall's prose stays disciplined and restrained throughout the novel rather than becoming overly explanatory.",
  subtext:"Does Hall's writing stay disciplined, restrained and intimate throughout, or does it become telly and overly explanatory in the second half?",
  evidenceDigest:'fe687d8f6b5aea349e43f50134b379b0a1d1c3166af375af24b9d60a348bb81b',
  verifiedAt:'2026-09-08T21:25:55.300Z',sources:['bc-seattle','bc-beans']
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
