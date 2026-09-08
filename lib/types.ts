export interface Question {
  id: string; collision_id: string | null; proposition: string; subtext: string;
  category: string; question_type: 'five_point' | 'going_deeper'; optional: boolean; locked: boolean;
  research?: {candidateId:string;evidenceDigest:string;admittedAt:string};
}
export interface Diagnostics { valid: boolean; issues: string[]; warnings: string[]; category_mix: Record<string,number>; scored_question_count: number; going_deeper_count: number }
export interface SourceSupport { source:string; url:string; passage:string; reasoning:string }
export interface Collision { research?:{status:'simulated'|'researched';positions?:{a:SourceSupport[];b:SourceSupport[]}}; id:string; title:string; dimension:string; lens_a:string; lens_b:string; evidence_strength:string; discussion_potential:string; finding_ids:string[]; question:Question }
export interface Lens { lens_type:string; title:string; core_idea:string; why_it_matters:string; what_it_changes:string; disagreement:string; collision_ids:string[] }
export interface Book { id:string; book_title:string; author:string; questions:Question[]; diagnostics:Diagnostics; summary:string; lenses:Lens[]; collisions:Collision[]; findings:{id:string;text:string;source:string}[]; sample_scores:(number|string)[][] }
export type Score = '2'|'1'|'0'|'-1'|'-2'|'no_position'|'absent'|'not_discussed'|'';
export interface Position { initial:Score; final:Score }
export interface Meeting { members:string[]; date:string; simulated:boolean; responses:Record<string,Position[]>; skipped:Record<string,boolean>; notes:Record<string,string>; insights:Record<string,{text:string;approved:boolean}> }
export interface Workspace { schema:1; wordingRevision?:number; editorialApproval?:string; draft:Question[]; history:{time:string;reason:string;questions:Question[]}[]; chat:{role:string;text:string}[]; tone:Tone; final:{questions:Question[];date:string}|null; meeting:Meeting|null; diagnostics:Diagnostics }
export type Tone = 'Conversational'|'Direct'|'Thoughtful';
