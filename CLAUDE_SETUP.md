# Claude operator research guide

This guide describes the implemented research tools as of 8 September 2026. They run locally, use the Anthropic API and write review evidence and reports to JSON files. They are not browser features or public Next.js API routes.

Research has been run for all three fixture books. A successful command is still not publication approval. Reports fail closed, write `releaseApproved: false`, and do not alter the app or promotion manifest automatically.

## Configuration

Create `.env.local` in this folder:

```text
ANTHROPIC_API_KEY=your_private_api_key
ANTHROPIC_MODEL=your_enabled_claude_model_id
```

Use a model available to your Anthropic account. Never prefix the key with `NEXT_PUBLIC_`, commit `.env.local`, paste the key into chat, or place it in source JSON. Review text sent through the research commands is transmitted to Anthropic.

Every command creates a new output file and refuses to overwrite an existing one. Use a new filename or deliberately remove an obsolete local output before rerunning.

## Source record format

The quick synthesis command accepts an array of 2–10 records. Book-level and staged research accept 5–15 records. Every record must contain the complete review and declare that scope:

```json
[
  {
    "id": "book-review-1",
    "url": "https://example.org/review",
    "title": "Review title",
    "author": "Review author",
    "retrievedAt": "2026-09-08T12:00:00.000Z",
    "textScope": "full_review",
    "text": "The complete review text with its surrounding context",
    "originEvidence": [
      {
        "url": "https://example.org/about",
        "text": "First-party information supporting the stated authorship"
      }
    ]
  }
]
```

`originEvidence` is optional. Use it when a separate first-party page helps establish authorship. Excerpts, summaries and records with unknown coverage remain unresolved and do not reach Claude synthesis. URLs must be public HTTP or HTTPS addresses; identifiers must be unique; dates must be valid ISO dates.

## Quick proposal and audit

```powershell
npm run research -- sources.json research-result.json
```

This makes one proposal call and, when the proposal is complete, a separate verification call. A `no_supported_disagreement` result is a valid research outcome. `model_supported` means the model audit found the supplied evidence sufficient for that candidate; it does not mean release approval.

## Full discovery and research sequence

Use distinct filenames for each stage:

```powershell
npm run discover:reviews -- "Book title" "Author name" 01-discovered.json
npm run screen:discovery -- 01-discovered.json 02-screened.json
npm run retrieve:reviews -- 02-screened.json 03-retrieved.json
npm run approve:retrieved -- 03-retrieved.json 04-sources.json 04-screening-report.json book-prefix
npm run research:book -- book-id 04-sources.json 05-research-map.json
```

The stages have separate responsibilities:

1. **Discovery** uses Claude web search to locate candidate pages.
2. **Initial screening** separates likely reviews from retailers, social posts, reference pages, aggregators and reader-platform aggregates.
3. **Retrieval** fetches candidate pages and isolates an article body when possible. Retrieval alone does not approve a source.
4. **Approval screening** uses Claude to check the correct book, substantive criticism, completeness and explicit authorship. Approved records receive `textScope: "full_review"` and a book-specific identifier.
5. **Book research** maps themes, proposes at most two strongest collisions and independently verifies each complete candidate.

`research:book` defaults to `broken-country` only when the book ID is omitted. Supplying the ID is recommended so reports and source identifiers remain explicit.

For long corpora that cannot complete as one structured synthesis, analyse the same complete source set in safe groups:

```powershell
npm run research:staged -- 04-sources.json 05-staged-report.json
```

The default batch size is four. You may add a final numeric batch size. The command records each batch independently and does not treat separate-topic findings as one disagreement.

To merge two already approved source arrays without duplicating a URL or ID:

```powershell
npm run merge:sources -- source-a.json source-b.json merged-sources.json
```

## Verify revised candidates

Use this after editorially revising a candidate. The candidate file is an array containing `id`, `positionA`, `positionB`, `memberWording` and exact evidence `claims` with `position`, `sourceId`, `passage` and `reasoning`:

```powershell
npm run verify:candidates -- sources.json candidates.json verification.json
```

Verification checks attribution, retained qualifications, genuine disagreement, faithful member wording and reasonable evidence of independent authorship. Different domains alone do not establish independence. An exact source passage is necessary but does not by itself prove that the synthesis is accurate.

## Measure source coverage

After a collision has passed source verification:

```powershell
npm run measure:opinion -- sources.json candidates.json coverage.json
```

Every review is classified as View A, mixed/qualified, View B, not addressed or unresolved. The output reports coverage only. It does not calculate a median, consensus, dominant side or viability score. Coverage for a failed collision must not be published as a research finding.

## App admission

Saved reports in `data/*research-preview.json` are manually prepared concise displays of completed runs. Adding a report does not make its wording editable or verified.

The only current draft admission is the Kundera candidate declared in `lib/research-promotions.ts`. The manifest binds the book, candidate, target card, category, exact proposition, exact supporting prompt, evidence digest, source IDs and verification date. The Admin Briefing shows **Use verified wording in draft** only for a matching manifest entry. Editing either member-facing text changes its status to **Verification expired** and prevents finalisation.

This browser-visible manifest demonstrates the interaction but is not a trusted production boundary. A production research service must repeat admission checks on the server. See [RESEARCH_MILESTONE.md](RESEARCH_MILESTONE.md).

## Outcome meanings

- `model_supported`: all five model checks passed for the exact captured sources and wording; release remains false.
- `unsupported`: the evidence contradicts or fails to support part of the proposal; the candidate is blocked.
- `unresolved`: evidence or model output is incomplete or ambiguous; the candidate is blocked.
- `no_supported_disagreement`: the supplied reviews do not establish the proposed kind of polarity; this is a valid result.

HTTP errors, timeouts, incomplete responses, invalid JSON, changed source text, missing exact passages, duplicate review text and unknown source scope do not pass.
