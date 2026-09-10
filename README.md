# Book Club Briefing V1.1 — Next.js app

Book Club Briefing is a shared Admin app for turning researched differences of opinion about a book into a concise discussion map, plus a source-verified at-a-glance reception profile. This edition uses Next.js, React, TypeScript and Supabase. Python is not required to run, build, test or deploy it; the original Python results remain as parity fixtures so the editorial selection rules can still be compared with the first prototype.

Documentation reviewed: 8 September 2026. Updated: 10 September 2026.

## Current status

- Whitelist-gated sign-in (Supabase email OTP) lets a small named group share the app; every authorized user sees the same server-persisted state per book (Supabase `workspaces` table), not separate per-browser copies.
- The eight-screen Admin workflow — Admin Briefing, Reviews, Context & Interpretation, Candidate Collisions, Draft Opinion Map, Chair/member preview, Meeting Capture, Round-up preview — is implemented for the three original fixture books (*Broken Country*, *The Unbearable Lightness of Being*, *The Family Upstairs*) and can be extended with more via **+ Add a book** in the sidebar.
- A book added in-app can use the Reviews step immediately (it only needs a title and author), but not Draft Opinion Map, Candidate Collisions, Chair, Meeting or Round-up — those need a hand-authored question skeleton the add-book feature deliberately doesn't create. The app shows an honest "not authored yet" message rather than a broken screen.
- **Reviews** runs a fully automated, in-app research pipeline (no command line) — "Run research now" discovers real reviews on the web, classifies genre, drafts a spoiler-aware summary pair, attributed opinion excerpts and clustered positive/negative points, then independently verifies the draft before it can be published.
- The three original fixture books also have an editable six-card Opinion Map, ten candidate collisions, three context lenses, Chair/member preview, Meeting Capture and Round-up preview.
- Fixture Opinion Maps and context copy were drafted with ChatGPT/Codex during prototype development and revised through editorial feedback. They were not distilled from verified reviews. Curator responses and sample meeting data are also simulated, and the interface labels this material accordingly.
- The Admin Briefing contains saved research reports based on complete public review pages for all three fixture books, with separate Goodreads and StoryGraph appreciation figures.
- Supported, unsupported and unresolved research outcomes remain distinct. Source coverage counts show how often a sampled review addressed a polarity; they do not rank views or imply consensus.
- Three verified candidates have a server-enforced route into their designated draft cards: one Kundera candidate and two Broken Country candidates (Beth's characterisation, prose restraint). Each candidate's exact wording and evidence digest are fixed; editing it expires verification and blocks finalisation until it is restored or replaced. Admission is checked against the live `research_promotions` table on the server, not just in browser code.
- Research reports do not otherwise alter fixture Opinion Maps automatically.
- The app is deployed via Vercel with a Supabase backend for auth and shared state; both research paths (operator command-line, and the in-app Reviews pipeline) call the Anthropic API live from the server.
- Production release of live researched wording still has open items — see [RESEARCH_MILESTONE.md](RESEARCH_MILESTONE.md) for the current, specific list (it's shorter than it used to be: admission and finalisation enforcement already moved server-side).

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

`npm test` currently runs 83 checks. They cover 27 reference cases from the Python engine, editing and meeting safeguards, all Broken Country tone variants, saved-work wording migration, research discovery and batching, source capture and attribution, duplicate detection, qualification preservation, independent verification, source coverage, controlled draft admission, and book-profile evidence preparation/digest stability.

On Windows, `npm test` runs `node --test .test-build/tests` rather than a wildcard path — a wildcard only expands correctly in a shell that does glob expansion (as `device_bash`'s Linux shell does), not in `cmd.exe`, which is what `npm run` scripts use by default even from a PowerShell prompt.

The build and development scripts use Webpack because Turbopack exhausted memory on the original Windows development machine.

## Admin workflow

1. **Admin Briefing** shows the saved research pilot, reader-platform reception and clearly labelled fixture briefing.
2. **Reviews** shows the published book profile — genre, a spoiler-toggle summary, attributed opinion excerpts and clustered positive/negative points — and, in a collapsed panel, the underlying research run and its verification checks. "Run research now"/"Run research again" triggers a fresh pipeline run in-app; "Publish to app" only appears once a run passes every verification check.
3. **Context & Interpretation** presents three suggested lenses.
4. **Candidate Collisions** shows ten possible discussion disagreements and their fixture evidence notes.
5. **Draft Opinion Map** supports manual editing, replacement, locking, three tone settings and simulated Curator Chat. Rewording retains a collision; replacement changes it. For a book with no authored question set (any book added via **+ Add a book**), this step shows an explanatory message instead.
6. **Chair / member preview** uses a fixed snapshot created by finalisation and supports browser Print / Save PDF.
7. **Meeting Capture** records initial and optional after-discussion positions, notes and skipped questions. It can start blank or with fictional responses.
8. **Round-up preview** displays anonymous response patterns and requires editorial approval for each written observation before it is included in print.

Finalisation requires acknowledgement of the editorial checklist for the exact current wording. Any later content change invalidates that acknowledgement. See [EDITORIAL_SPEC.md](EDITORIAL_SPEC.md).

## Storage and portability

Drafts, history, locks, Chair snapshots and meeting data are stored server-side in Supabase (the `workspaces` table, one shared row per book) rather than per-browser `localStorage`. Every authorized user sees the same state for a book; there is no separate copy per device or per person. Sign-in is a whitelist of emails (`authorized_emails`) gated by a Supabase email-OTP passcode. A later draft edit cannot change the Chair snapshot attached to an existing meeting.

Use **Workspace backup & portability** in the app to export or import one book’s workspace as JSON — useful as an offline record or to move state between hosting addresses. Import replaces the selected book’s current shared workspace for everyone, not just the importing browser.

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

The app now requires environment variables in production: `NEXT_PUBLIC_SUPABASE_URL`, the Supabase anon key and `SUPABASE_SERVICE_ROLE_KEY` for the shared multi-user workspace and auth (never prefix the service-role key with `NEXT_PUBLIC_`), and `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL` for the in-app automated research route (`app/api/research/run-profile/[bookId]`), which now calls Claude live from the server. That route is genuinely slow (it can take several minutes) and asks Vercel for a longer execution window via `maxDuration`, but the real ceiling depends on your Vercel plan — see [RESEARCH_MILESTONE.md](RESEARCH_MILESTONE.md)'s "Automated review discovery ↔ execution window and fallback positions" section before relying on it in production.

The app has no Vercel-specific library or database dependency and remains portable to another Node.js host. On a host that must accept network traffic, run `npx next start --hostname 0.0.0.0 --port 3000` after building.

## Project structure

- `app/`: App Router entry point and API routes — books, workspace, research promote/publish/run-profile, book-profile, validate, auth.
- `components/`: the eight Admin views, `BookReviews.tsx` (published profile), `BookProfileResearch.tsx` (Reviews-step research panel) and the collision-candidate research report interface.
- `data/books.json`: the three original fixture books and their curated simulated fixture material.
- `data/*research-preview.json`: concise saved research reports displayed by Admin Briefing; these are summaries rather than copies of reviews.
- `lib/editorial.ts`, `lib/editorial-policy.ts`, `lib/tone-wording.ts`: selection, validation, wording and editorial policy.
- `lib/curator.ts`, `lib/meeting.ts`, `lib/workspace.ts`: editing, capture, persistence validation and migrations.
- `lib/claude-discovery.ts`, `lib/review-retrieval.ts`, `lib/source-evidence.ts`, `lib/profile-evidence.ts`, `lib/claude-research.ts`: operator and in-app research, both fail-closed verification paths.
- `lib/books-db.ts`: merges the fixture books with any added in-app; create/update/delete for the latter.
- `lib/book-profile-db.ts`: published book profiles/review points, and saved Reviews-step research drafts.
- `lib/research-promotions.ts` / `lib/research-promotions-db.ts`: admission logic for the verified Kundera, Beth's-characterisation and prose-restraint candidates, and its live database-backed source of truth.
- `scripts/`: discovery, retrieval, screening, synthesis, verification and source-coverage commands (operator collision-research path).
- `supabase/migrations/`: `0001_init.sql` (auth whitelist, shared workspaces, research tables), `0002_book_profiles.sql`, `0003_book_profile_drafts.sql`, `0004_books.sql` (books added in-app).
- `tests/python-parity.json`: expected results recorded from the original Python engine.

The TypeScript selection engine visits Writing / Style and then Handling of Subjects in a deterministic order. The original Python implementation used an unordered set for those mandatory domains. Selection and diversity rules remain equivalent, and the fixture Opinion Map order is preserved.

## Documentation ownership

- [README.md](README.md): implemented product, local use, deployment and architecture.
- [EDITORIAL_SPEC.md](EDITORIAL_SPEC.md): binding content and wording acceptance criteria.
- [RESEARCH_MILESTONE.md](RESEARCH_MILESTONE.md): source-fidelity release gate, implemented safeguards and remaining work.
- [CLAUDE_SETUP.md](CLAUDE_SETUP.md): operator research configuration and commands.
- [CLAUDE_HANDOFF.md](CLAUDE_HANDOFF.md): self-contained context, provenance, priorities and safeguards for continuing the project with Claude.
- [AGENTS.md](AGENTS.md): instructions that require future code and content changes to follow the specifications.
#   b o o k c i r c l e  
 