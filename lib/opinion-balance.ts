export type OpinionStance='a'|'mixed'|'b'|'not_addressed'|'unresolved';
export interface StanceRow {sourceId:string;stance:OpinionStance;passage:string;reasoning:string}

export function summariseOpinion(rows:StanceRow[],totalSources:number){
  const counts={a:0,mixed:0,b:0,not_addressed:0,unresolved:0};
  for(const row of rows)counts[row.stance]++;
  const addressed=counts.a+counts.mixed+counts.b;
  const coverage=totalSources?addressed/totalSources:0;
  return {counts,totalSources,addressed,coverage};
}
