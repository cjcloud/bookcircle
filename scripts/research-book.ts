import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { askClaude, verifyCollision } from '../lib/claude-research.ts';
import { prepareEvidence, snapshotSource, type VerificationInput } from '../lib/source-evidence.ts';

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const claimSchema={type:'object',properties:{position:{type:'string',enum:['a','b']},sourceId:{type:'string'},passage:{type:'string'},reasoning:{type:'string'}},required:['position','sourceId','passage','reasoning'],additionalProperties:false};
const researchMapSchema={type:'object',properties:{
 coverageSummary:{type:'string'},
 themes:{type:'array',items:{type:'object',properties:{name:{type:'string'},sourceIds:{type:'array',items:{type:'string'}},summary:{type:'string'}},required:['name','sourceIds','summary'],additionalProperties:false}},
 candidates:{type:'array',items:{type:'object',properties:{positionA:{type:'string'},positionB:{type:'string'},memberWording:{type:'string'},claims:{type:'array',items:claimSchema}},required:['positionA','positionB','memberWording','claims'],additionalProperties:false}},
 saturation:{type:'object',properties:{assessment:{type:'string'},newThemesInLastSources:{type:'array',items:{type:'string'}},reason:{type:'string'}},required:['assessment','newThemesInLastSources','reason'],additionalProperties:false}
},required:['coverageSummary','themes','candidates','saturation'],additionalProperties:false};
try {
  const args = process.argv.slice(2);
  const [bookId, sourcePath, outputPath] = args.length===3?args:['broken-country',args[0],args[1]];
  if (!sourcePath || !outputPath) throw Error('Usage: research-book [book-id] sources.json report.json');
  if (!process.env.ANTHROPIC_API_KEY || !process.env.ANTHROPIC_MODEL) throw Error('Claude configuration is missing.');
  if (!existsSync(sourcePath) || existsSync(outputPath)) throw Error('Check input and choose a new output filename.');
  const rawSources = JSON.parse(readFileSync(sourcePath, 'utf8'));
  if (!Array.isArray(rawSources) || rawSources.length < 5 || rawSources.length > 15) throw Error('Provide 5–15 complete reviews.');
  const sources = rawSources.map(snapshotSource);
  if (sources.some(source => source.textScope !== 'full_review')) throw Error('Every included source must contain the complete review.');

  const synthesis = await askClaude(`Study the complete reviews and map their substantive differences. Return JSON with:
  {coverageSummary, themes:[{name, sourceIds, summary}], candidates:[{positionA,positionB,memberWording,claims:[{position,sourceId,passage,reasoning}]}], saturation:{assessment,newThemesInLastSources,reason}}.
  Return the two strongest candidates at most. Each candidate must express two genuinely different assessments of the same character, event, technique or theme. Give exactly one short evidence claim for each position, using an exact source substring of no more than 30 words. Preserve qualifications and use precise natural English. Name the relevant character, author, action, technique or consequence instead of relying on abstract words such as "choice", "link", "escape", "feelings" or "too much". State who causes or shapes an outcome, and use causal language only when the reviews support that connection. Make memberWording self-contained so the reader does not have to infer an omitted event, action or object. Do not manufacture opposition from different topics, general praise versus specific criticism, or belief versus personal relatability. Exclude plot summary presented without judgement. Keep the theme list to six concise entries and every summary or reason to two sentences. If the evidence supports fewer than two disagreements, return fewer. Saturation is reached only when the later sources add no materially new assessed theme; explain the basis rather than relying on source count.`, sources, undefined, 6000, researchMapSchema, 180000) as Record<string, unknown>;

  if (!synthesis || !Array.isArray(synthesis.candidates) || !Array.isArray(synthesis.themes) || !isText(synthesis.coverageSummary)) throw Error('Claude returned an incomplete research map.');
  const reports = [];
  for (const value of synthesis.candidates.slice(0, 6)) {
    const candidate = value as Partial<VerificationInput>;
    if (!isText(candidate.positionA) || !isText(candidate.positionB) || !isText(candidate.memberWording) || !Array.isArray(candidate.claims)) continue;
    const input: VerificationInput = { positionA: candidate.positionA, positionB: candidate.positionB, memberWording: candidate.memberWording, claims: candidate.claims, sources };
    const prepared = prepareEvidence(input);
    let verification;
    try {
      verification = prepared.status === 'ready_for_verification' ? await verifyCollision(input) : { ...prepared, releaseApproved: false };
    } catch (error) {
      verification = { status: 'unresolved', reason: error instanceof Error ? error.message : 'Verification failed.', releaseApproved: false };
    }
    reports.push({ candidate: { positionA: input.positionA, positionB: input.positionB, memberWording: input.memberWording, claims: input.claims }, verification });
  }
  const report = { bookId, generatedAt: new Date().toISOString(), model: process.env.ANTHROPIC_MODEL, sourceCount: sources.length, coverageSummary: synthesis.coverageSummary, themes: synthesis.themes, saturation: synthesis.saturation, reports, releaseApproved: false };
  writeFileSync(outputPath, JSON.stringify(report, null, 2), { flag: 'wx' });
  const counts = reports.reduce<Record<string, number>>((all, item) => { const status = String(item.verification.status); all[status] = (all[status] ?? 0) + 1; return all; }, {});
  console.log(`Research map saved: ${sources.length} reviews, ${reports.length} candidates, ${JSON.stringify(counts)}. Not approved for release.`);
} catch (error) {
  console.error(`Research map failed: ${error instanceof Error ? error.message : 'unknown error'} No result approved.`);
  process.exitCode = 1;
}
