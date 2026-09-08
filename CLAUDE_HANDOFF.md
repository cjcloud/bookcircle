# Book Club Briefing — Claude handoff

Prepared: 8 September 2026.

## Product objective

Book Club Briefing should research a broad, credible set of critical and reader responses to a book, identify substantive differences of interpretation, verify that every distilled position accurately represents its sources, and express those differences as clear questions for a book-club discussion.

The value is not generic question generation. The value is accurate research distilled into a small number of crisp, insightful collision points.

## Critical provenance warning

The editable fixture Opinion Maps, including the Broken Country collision **“Believing the love triangle”**, were drafted with ChatGPT/Codex during prototype development. They were not derived from verified review research. They are correctly labelled **Simulated — not researched**.

Claude-generated research exists separately in the three Admin Briefing reports. Only one exact Kundera candidate currently has a controlled route from a verified research report into a draft. Do not treat fluent fixture prose as researched evidence.

## User’s editorial standard

Every sentence must use straightforward, natural English and carry its full meaning. A reader should debate the interpretation, not decipher the wording.

Required properties:

- identify the person, event, action, technique or consequence;
- make the object of words such as “choice”, “escape”, “link”, “feelings” and “too much” explicit;
- name who acts: distinguish a character’s decision from the author’s construction;
- use causal language only when the relationship is logical and evidenced;
- compare two genuinely different assessments of the same issue;
- retain qualifications and contrary details from the source;
- avoid slang, fashionable shorthand, academic vagueness and forced informality in every tone.

Examples of rejected reasoning include treating believable and predictable as opposites, saying that death “produces secrecy”, asking whether grief is “an excuse” without naming what it excuses, or saying that Gabriel provides a “link” without explaining what Beth seeks or remembers.

[EDITORIAL_SPEC.md](EDITORIAL_SPEC.md) is the binding acceptance standard.

## Implemented application

The Next.js/React/TypeScript app contains:

- three selectable fixture books;
- Admin Briefing with saved research coverage and separate reader-platform reception;
- Context & Interpretation;
- ten Candidate Collisions per book;
- a six-card Draft Opinion Map;
- manual edit, replace, lock, tone and simulated Curator Chat controls;
- exact-content editorial acknowledgement;
- Chair/member snapshot and print view;
- Meeting Capture with initial and after-discussion positions;
- Round-up preview with anonymous response patterns and approved observations;
- browser-local persistence and JSON backup/import.

No live model runs in the browser. The app has two thin local API routes for books and validation; it has no research API route, database or account system.

## Implemented research pipeline

Claude is used through operator-run commands for discovery, full-page retrieval, source screening, synthesis, independent verification and source-coverage classification. Evidence is bound to complete captured text, exact passages and SHA-256 digests. Failures remain unresolved or unsupported.

Saved pilot reports cover:

- *Broken Country*: 10 complete reviews; two supported candidates and one blocked candidate.
- *The Family Upstairs*: 10 complete reviews; one supported revised candidate plus blocked/unresolved examples.
- *The Unbearable Lightness of Being*: eight complete reviews; staged synthesis produced one supported candidate.

Only the exact Kundera proposition in `lib/research-promotions.ts` is currently admissible into a draft. Editing it expires verification.

[RESEARCH_MILESTONE.md](RESEARCH_MILESTONE.md) defines the source-fidelity gate. [CLAUDE_SETUP.md](CLAUDE_SETUP.md) documents all operator commands and file formats.

## Work that remains

The most valuable next work is:

1. Replace simulated fixture collisions with source-researched, independently verified collisions, starting with *Broken Country*.
2. Apply the editorial specification during synthesis rather than trying to repair vague wording after generation.
3. Evaluate candidate wording manually for logic and clarity even after source verification passes.
4. Expand the promotion mechanism only for exact candidates that pass the full evidence and wording gates.
5. Move admission, immutable evidence storage and finalisation enforcement to a trusted server before production release.
6. Run the broad acceptance evaluation listed in `RESEARCH_MILESTONE.md`.
7. Keep overall Goodreads/StoryGraph appreciation separate from critical-sample counts and collision coverage. Never compute a median or consensus for a discussion polarity.

## Non-negotiable safeguards

- Do not relabel fixture content as researched.
- Do not accept an isolated quotation without checking its complete captured review.
- Do not infer a position from silence, plot summary, star rating or general praise.
- Do not treat different URLs as proof of independent authorship.
- Do not publish unsupported or unresolved collision coverage.
- Do not let an editorial checkbox override source-fidelity failure.
- Do not expose an Anthropic key to client code or use a `NEXT_PUBLIC_` variable for it.
- Do not remove Python parity fixtures without documenting an intentional change to the selection contract.

## Validation and local run

```powershell
npm ci
npm run typecheck
npm test
npm run build
npm run dev -- --port 3001
```

The current suite contains 65 passing checks. Webpack is deliberately selected in the package scripts because Turbopack exhausted memory on the original Windows development machine.

## Key files

- `README.md`: current product, setup, deployment and architecture.
- `EDITORIAL_SPEC.md`: binding prose, collision and provenance requirements.
- `RESEARCH_MILESTONE.md`: implemented source safeguards and production blockers.
- `CLAUDE_SETUP.md`: Anthropic configuration and research commands.
- `data/books.json`: curated simulated fixture content.
- `data/*research-preview.json`: concise research reports shown in the app.
- `lib/editorial-policy.ts`: application-level wording and evidence checks.
- `lib/claude-research.ts`: proposal and independent audit prompts.
- `scripts/research-book.ts`: whole-book research-map prompt.
- `lib/research-promotions.ts`: exact local Kundera admission manifest.

## Transfer hygiene

Transfer source, data, tests and documentation. Exclude `node_modules`, `.next`, `.test-build*`, cache folders, development logs, `*.tsbuildinfo`, `.vercel` and all `.env*` files. Configure the Anthropic key independently in the destination environment.

The JSON source and result files in the project root may contain complete review text. Include them only if the destination should receive that evidence and the user is entitled to transfer it.
