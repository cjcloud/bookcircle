import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { proposeBookProfile, verifyBookProfile } from '../lib/claude-research.ts';
import { snapshotSource } from '../lib/source-evidence.ts';

const [bookId, sourcePath, outputPath] = process.argv.slice(2);
if (!bookId || !sourcePath || !outputPath) throw Error('Usage: research:book-profile book-id sources.json report.json');
if (!process.env.ANTHROPIC_API_KEY || !process.env.ANTHROPIC_MODEL) throw Error('Claude configuration is missing.');
if (!existsSync(sourcePath) || existsSync(outputPath)) throw Error('Check the input and choose a new output filename.');
const raw = JSON.parse(readFileSync(sourcePath, 'utf8'));
if (!Array.isArray(raw) || raw.length < 5 || raw.length > 15) throw Error('Provide 5–15 complete reviews.');
const sources = raw.map(snapshotSource);
if (sources.some(source => source.textScope !== 'full_review')) throw Error('Every included source must contain the complete review.');

try {
  const proposal = await proposeBookProfile(sources);
  const verification = await verifyBookProfile(proposal);
  const report = { bookId, generatedAt: new Date().toISOString(), model: process.env.ANTHROPIC_MODEL, sourceCount: sources.length, proposal, verification, releaseApproved: false };
  writeFileSync(outputPath, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(`Book profile saved for ${bookId}: ${verification.status}. Not approved for release.`);
} catch (error) {
  const report = { bookId, generatedAt: new Date().toISOString(), model: process.env.ANTHROPIC_MODEL, sourceCount: sources.length, proposal: null, verification: { status: 'unresolved', reason: error instanceof Error ? error.message : 'Research failed.', releaseApproved: false }, releaseApproved: false };
  writeFileSync(outputPath, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.error(`Book profile failed: ${error instanceof Error ? error.message : 'unknown error'} No result approved.`);
  process.exitCode = 1;
}
