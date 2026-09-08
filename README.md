# Book Club Briefing V1.1 — Next.js prototype

Book Club Briefing is a local Admin prototype for turning researched differences of opinion about a book into a concise discussion map. This edition uses Next.js, React and TypeScript. Python is not required to run, build, test or deploy it; the original Python results remain as parity fixtures so the editorial selection rules can still be compared with the first prototype.

Documentation reviewed: 8 September 2026.

## Current status

- The seven-screen Admin workflow is implemented for *Broken Country*, *The Unbearable Lightness of Being* and *The Family Upstairs*.
- Each book has an editable six-card Opinion Map, ten candidate collisions, three context lenses, Chair/member preview, Meeting Capture and Round-up preview.
- Fixture Opinion Maps and context copy were drafted with ChatGPT/Codex during prototype development and revised through editorial feedback. They were not distilled from verified reviews. Curator responses and sample meeting data are also simulated, and the interface labels this material accordingly.
- The Admin Briefing contains saved research reports based on complete public review pages for all three books, with separate Goodreads and StoryGraph appreciation figures.
- Supported, unsupported and unresolved research outcomes remain distinct. Source coverage counts show how often a sampled review addressed a polarity; they do not rank views or imply consensus.
- Three verified candidates have a controlled local route into their designated draft cards: one Kundera candidate and two Broken Country candidates (Beth's characterisation, prose restraint), the latter two re-verified live against freshly retrieved review text on 8 September 2026. Each candidate's exact wording and evidence digest are fixed; editing it expires verification and blocks finalisation until it is restored or replaced.
- Research reports do not otherwise alter fixture Opinion Maps automatically.
- The interface has not been deployed to Vercel. Research remains an operator-run command-line workflow rather than an in-app or public API service.
- Production release of live researched wording remains blocked pending trusted server-side admission and a broader acceptance evaluation. See [RESEARCH_MILESTONE.md](RESEARCH_MILESTONE.md).

## Run locally

Use Node.js 20.19 or later. Node.js 24 LTS is recommended. Open a terminal in this folder and run:

```powershell
npm ci
npm run dev
```

Open **http://127.0.0.1:3000** and keep the terminal open. Press Ctrl+C to stop the app.

If port 3000 is already occupied:

```powershell
npm run dev -- --port 3001
```

Then open **http://127.0.0.1:3001**. Browser storage is separate for every host and port.

## Verify a change

```powershell
npm run typecheck
npm test
npm run build
npm start
```

The first three commands validate the project. `npm start` serves the completed production build at **http://127.0.0.1:3000**.

`npm test` currently runs 65 checks. They cover 27 reference cases from the Python engine, editing and meeting safeguards, all Broken Country tone variants, saved-work wording migration, research discovery and batching, source capture and attribution, duplicate detection, qualification preservation, independent verification, source coverage and controlled draft admission.

The build and development scripts use Webpack because Turbopack exhausted memory on the original Windows development machine.

## Admin workflow

1. **Admin Briefing** shows the saved research pilot, reader-platform reception and clearly labelled fixture briefing.
2. **Context & Interpretation** presents three suggested lenses.
3. **Candidate Collisions** shows ten possible discussion disagreements and their fixture evidence notes.
4. **Draft Opinion Map** supports manual editing, replacement, locking, three tone settings and simulated Curator Chat. Rewording retains a collision; replacement changes it.
5. **Chair / member preview** uses a fixed snapshot created by finalisation and supports browser Print / Save PDF.
6. **Meeting Capture** records initial and optional after-discussion positions, notes and skipped questions. It can start blank or with fictional responses.
7. **Round-up preview** displays anonymous response patterns and requires editorial approval for each written observation before it is included in print.

Finalisation requires acknowledgement of the editorial checklist for the exact current wording. Any later content change invalidates that acknowledgement. See [EDITORIAL_SPEC.md](EDITORIAL_SPEC.md).

## Storage and portability

Drafts, history, locks, Chair snapshots and meeting data are stored locally in the browser and separately for each book. There is no account system, shared database or cross-device synchronisation. A later draft edit cannot change the Chair snapshot attached to an existing meeting.

Use **Workspace backup & portability** in the app to export or import one book’s workspace as JSON. Import replaces the selected book’s current workspace. Export before changing browser, port or hosting address. The accepted storage key remains `bcb-admin-v11:<book-id>`.

## Research workflow

Claude powers the operator-run discovery, synthesis and independent source audit. Source text is captured in full, hashed, attributed and retained with context. Each proposed position must cite an exact passage and explain how it supports the claim. A separate verification call checks attribution, qualifications, genuine disagreement, member wording and reasonable evidence of source independence. Missing or ambiguous evidence remains unresolved.

No model runs inside the browser. The browser displays static fixture copy and saved research summaries. The simulated Curator Chat uses programmed responses. A live Claude call occurs only when an operator runs one of the research commands.

The synthesis prompt also requires natural English, explicit referents, a named agent and logically supported causal language. It must not create opposition from compatible observations.

See [CLAUDE_SETUP.md](CLAUDE_SETUP.md) for configuration, source format and every research command. Generating a report never publishes a candidate or adds it to the promotion manifest.

## Vercel deployment

Push the repository to Git and import it in Vercel. If this app remains inside the existing `book-review-central` repository, set the Vercel project’s **Root Directory** to `next-app`. Use:

- Framework: Next.js
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: Next.js default
- Node.js: 24.x

Vercel currently provides Node.js 24.x by default and also supports 22.x and 20.x. A broad engine range such as this project’s `>=20.19.0` resolves to the latest available compatible version. See Vercel’s [supported Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) and [Root Directory guidance](https://vercel.com/docs/monorepos).

The saved interface needs no environment variables. Do not deploy `ANTHROPIC_API_KEY` merely to host the current interface: there is no public research API route. If live research is later implemented server-side, configure the key as a private Vercel environment variable and never prefix it with `NEXT_PUBLIC_`.

The app has no Vercel-specific library or database dependency and remains portable to another Node.js host. On a host that must accept network traffic, run `npx next start --hostname 0.0.0.0 --port 3000` after building.

## Project structure

- `app/`: App Router entry point and thin book/validation API adapters.
- `components/`: the seven Admin views and research report interface.
- `data/books.json`: all three books and their curated simulated fixture material.
- `data/*research-preview.json`: concise saved research reports displayed by Admin Briefing; these are summaries rather than copies of reviews.
- `lib/editorial.ts`, `lib/editorial-policy.ts`, `lib/tone-wording.ts`: selection, validation, wording and editorial policy.
- `lib/curator.ts`, `lib/meeting.ts`, `lib/workspace.ts`: editing, capture, persistence validation and migrations.
- `lib/claude-discovery.ts`, `lib/review-retrieval.ts`, `lib/source-evidence.ts`, `lib/claude-research.ts`: operator research and fail-closed verification.
- `lib/research-promotions.ts`: exact local admission manifest for the verified Kundera, Beth's-characterisation and prose-restraint candidates.
- `scripts/`: discovery, retrieval, screening, synthesis, verification and source-coverage commands.
- `tests/python-parity.json`: expected results recorded from the original Python engine.

The TypeScript selection engine visits Writing / Style and then Handling of Subjects in a deterministic order. The original Python implementation used an unordered set for those mandatory domains. Selection and diversity rules remain equivalent, and the fixture Opinion Map order is preserved.

## Documentation ownership

- [README.md](README.md): implemented product, local use, deployment and architecture.
- [EDITORIAL_SPEC.md](EDITORIAL_SPEC.md): binding content and wording acceptance criteria.
- [RESEARCH_MILESTONE.md](RESEARCH_MILESTONE.md): source-fidelity release gate, implemented safeguards and remaining work.
- [CLAUDE_SETUP.md](CLAUDE_SETUP.md): operator research configuration and commands.
- [CLAUDE_HANDOFF.md](CLAUDE_HANDOFF.md): self-contained context, provenance, priorities and safeguards for continuing the project with Claude.
- [AGENTS.md](AGENTS.md): instructions that require future code and content changes to follow the specifications.
