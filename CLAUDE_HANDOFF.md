# Book Club Briefing — Claude handoff

Prepared: 8 September 2026. Updated: 12 September 2026.

## Current deployment

Live at `https://bookcircle-ten.vercel.app` (Vercel Hobby plan, Fluid Compute). Source at `github.com/cjcloud/bookcircle` (public repo). Supabase project ref `kuzpvtmzccskjvxudout`. The user's local checkout is `C:\Users\CJ\Dev\Bookcircle`, reached in a Claude session via the remote-devices bridge — as of 12 September `device_bash` (a local shell on that machine) is unavailable (a Windows update broke it; Claude Code itself is unaffected), so any file edit has to go through the stage → edit-in-the-cloud-sandbox → commit-back cycle (`device_stage_files` / `device_commit_files`), and the user runs git/npm/Supabase-CLI commands themselves in their own PowerShell and pastes back the output. **`device_commit_files` has silently reported success without the write actually landing more than once this session** — always re-stage and diff the file against what you meant to write before telling the user to commit/push.

## Product objective

Book Club Briefing should research a broad, credible set of critical and reader responses to a book, identify substantive differences of interpretation, verify that every distilled position accurately represents its sources, and express those differences as clear questions for a book-club discussion. It should also give a reader-facing at-a-glance profile of a book — genre, a spoiler-aware summary, attributed critical opinions and clustered positive/negative points — generated and verified the same way, never hand-authored.

The value is not generic question generation. The value is accurate research distilled into a small number of crisp, insightful collision points, and an honest, source-grounded reception profile.

## Critical provenance warning

The editable fixture Opinion Maps, including the Broken Country collision **“Believing the love triangle”**, were drafted with ChatGPT/Codex during prototype development. They were not derived from verified review research. They are correctly labelled **Simulated — not researched**.

Claude-generated research exists separately in the three Admin Briefing reports and in each book's Reviews step profile. Do not treat fluent fixture prose as researched evidence.

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

The Next.js/React/TypeScript app, deployed on Vercel with a Supabase backend, contains:

- three hand-authored fixture books (*Broken Country*, *The Unbearable Lightness of Being*/Kundera, *The Family Upstairs*), plus any number of additional books added in-app through **+ Add a book** in the sidebar;
- whitelist-gated sign-in (Supabase email OTP) so a small named group can share the app, with every authorized user seeing the same shared state per book;
- an eight-step Admin workflow per book: Admin Briefing, **Reviews**, Context & Interpretation, Candidate Collisions, Draft Opinion Map, Chair/member preview, Meeting Capture, Round-up preview;
- **Reviews**: a fully automated, in-app "Run research now" pipeline (no command line) that discovers real reviews on the web, drafts a genre classification, spoiler-aware summaries, attributed opinion excerpts and clustered positive/negative points, independently verifies the draft, and only then can be published;
- a six-card Draft Opinion Map (fixture books) with manual edit, replace, lock, tone and simulated Curator Chat controls, exact-content editorial acknowledgement, Chair/member snapshot and print view, Meeting Capture with initial and after-discussion positions, and Round-up preview with anonymous response patterns and approved observations;
- shared, server-persisted workspace state (Supabase `workspaces` table) instead of browser-local storage, plus JSON backup/import per book.

Both the collision-candidate research (fixture books) and the book-profile research (any book's Reviews step) are triggered by an authorized user and independently verified before anything can be published; nothing publishes automatically. See "Implemented research pipeline" below.

## In-app book management ("Add a book")

Any authorized user can add a book by title and author from the sidebar (`+ Add a book`). This creates a row in the `books` table (migration `0004_books.sql`) with an id slugified from the title. A book added this way:

- **can** use the Reviews step immediately — the automated research pipeline only needs a title and author;
- **cannot** use Draft Opinion Map, Candidate Collisions, Chair preview, Meeting Capture or Round-up — those need a hand-authored question skeleton (5–7 questions covering the mandatory categories, one Going Deeper item) that this feature deliberately does not create. Selecting Draft Opinion Map for such a book shows an honest "no question set authored yet" message rather than a blank or broken screen.

**Edit** ("Edit title/author") and **Delete** are also available, but only for books added this way — the three fixture books live in `data/books.json`, not the `books` table, and attempting either on one returns an explicit error. Editing only changes the `book_title`/`author` columns; **the book's internal id never changes once created**, even if the title is corrected for a typo. This is deliberate: every related table (`workspaces`, `research_sources`, `research_candidates`, `research_promotions`, `book_profile_drafts`, `book_profiles`, `review_points`) references the book by that id, and renaming it would mean re-pointing every one of those rows atomically or silently losing the connection to already-completed research. Deleting a book removes its row from `books` and best-effort cleans up all of the tables just listed for that id.

## Implemented research pipeline

Two research paths exist side by side, both using Claude, both fail-closed (propose → independently verify → only a `model_supported` result can be published):

1. **Collision-candidate research** (fixture books only): operator-run commands (`scripts/research*.ts`) for discovery, full-page retrieval, source screening, synthesis and independent verification, writing to local JSON files during development. The resulting candidates are promoted into the shared `research_promotions` table and admitted into a book's draft via `app/api/research/promote`, which is fully server-enforced (loads the live promotion list from the database, checks the requesting user is authorized, and writes the result to the shared `workspaces` row) — this is a real production trust boundary, not a demo.
2. **Book-profile research** (any book, including one added in-app): triggered from the "Run research now"/"Run research again" button on the Reviews step. As of 12 September this runs as a background job, not inline in one request — see "Research pipeline is now a background job" below for why and how. It calls `discoverReviewSources` (Claude's own `web_search`/`web_fetch` tools find and capture real review pages — no hand-assembled sources file), then `proposeBookProfile` and `verifyBookProfile`, and saves the result (success or failure) to `book_profile_drafts`. Publishing to the live `book_profiles`/`review_points` tables requires a separate "Publish to app" action gated on `verification.status === 'model_supported'`, which re-derives and checks the evidence digest server-side rather than trusting the client.

Evidence is bound to complete captured text, exact passages and content digests in both paths. Failures remain unresolved or unsupported and are never silently treated as success.

Saved pilot reports (from the original operator-run pipeline) cover:

- *Broken Country*: 10 complete reviews; two supported candidates and one blocked candidate.
- *The Family Upstairs*: 10 complete reviews; one supported revised candidate plus blocked/unresolved examples.
- *The Unbearable Lightness of Being*: eight complete reviews; staged synthesis produced one supported candidate.

All three of those candidates (Kundera's ideas-and-felt-life, Broken Country's beth-characterisation and prose-style) are live in the `research_promotions` table and admissible from the Admin Briefing's **Use verified wording in draft** control.

[RESEARCH_MILESTONE.md](RESEARCH_MILESTONE.md) defines the source-fidelity gate and the current trust boundary in full. [CLAUDE_SETUP.md](CLAUDE_SETUP.md) documents all operator commands, the in-app Reviews pipeline, and file formats.

## Research pipeline is now a background job (12 September)

`app/api/research/run-profile/[bookId]`'s `POST` handler used to run `discover -> propose -> verify` synchronously inside one Vercel request. In production on the Hobby plan this reliably hit a `504 FUNCTION_INVOCATION_TIMEOUT` after exactly 300 seconds (confirmed live in Vercel Logs) — the earlier "it works" impression came from the panel showing an old cached draft, not a genuinely completed run. Fixed by moving the pipeline to [Upstash Workflow](https://upstash.com/docs/workflow), chosen over a Vercel Pro upgrade or hand-splitting the pipeline into multiple UI-driven requests because the research is user-initiated and non-real-time (no periodicity, checked back on later), which is exactly what a background job is for:

- `app/api/research/run-profile/[bookId]/route.ts`'s `POST` now just records `run_status = 'queued'` and calls the Upstash `Client`'s `trigger()`, returning in well under a second. `GET` also returns `runStatus`/`runError`/`runUpdatedAt` alongside the last completed report.
- `app/api/research/run-profile/[bookId]/workflow/route.ts` is the actual pipeline, using `serve()` from `@upstash/workflow/nextjs`. Each stage (`load-book`, `mark-running`, `discover`, `propose`, `verify`, `save-success`/`save-failure`) is its own `context.run()` step — a separate short Vercel invocation QStash orchestrates between calls, so no single call has to run all three stages back to back.
- `components/BookProfileResearch.tsx` polls `GET` every 5 seconds while a run is `queued`/`running` instead of awaiting one long request, and shows a "Research completed successfully" banner specifically when a run it watched transitions to `done` (not on every page load of an already-researched book).
- Requires `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` (free Upstash account) as env vars, both locally (`.env.local`, gitignored) and in Vercel.
- `supabase/migrations/0005_book_profile_run_status.sql` adds `run_status`/`run_error`/`run_updated_at` to `book_profile_drafts` and makes `report`/`status` nullable (a queued run has no report yet). `0006_reset_stale_research_runs.sql` was a one-off cleanup for rows stuck by the bugs below.

**Three real bugs only surfaced by testing this for real in production — worth knowing before touching this again:**

1. `middleware.ts` gates every route behind a signed-in browser session, but QStash's callback into `.../workflow` carries no session cookie at all — it was getting redirected to `/login` and rejected with a `405` (a POST redirected to a GET-only page) before the pipeline ever ran a single step. Fixed with an explicit `isResearchWorkflowRoute` exemption in `middleware.ts`, safe because that route verifies QStash's own request signature and can only ever be triggered by `../route.ts`'s `POST` handler after it already ran `requireAuthorizedUser()`.
2. The workflow route was using `getDbClient()` (the RLS-respecting, cookie-based client) — but QStash's callback has no session, so RLS silently returned nothing for any query. A fixture book (hardcoded in `lib/books.ts`) looked fine; an in-app-added book (a real row in the `books` table) failed at the very first step with "Unknown book." Fixed by switching every DB call in the workflow route to `createAdminClient()` (service-role, bypasses RLS) — safe here because authorization was already checked before the job was ever queued.
3. When a run fails before its own step-level error handling ever gets a chance to run (exactly what both bugs above caused), `run_status` gets stuck at `'queued'`/`'running'` forever, and the button stays disabled with no way to retry. Fixed in `components/BookProfileResearch.tsx`: a run still showing `queued`/`running` after 15 minutes (`STALE_AFTER_MS`) is treated as abandoned, re-enabling the button, rather than trusted as genuinely in flight.

Debugging this relies on two places, not one: Vercel Logs (as before) and the Upstash Console's **Workflow → Logs** tab, which shows a step-by-step trace of exactly where a run is or failed — essential for diagnosing anything in this pipeline going forward.

## Lessons from real use this session (worth reading before changing the research pipeline)

- **A failed re-run must never overwrite a successful one.** `book_profile_drafts` holds one row per book; an early version of `run-profile`'s `POST` handler unconditionally saved every run's outcome, so a single flaky re-run (e.g. too few sources found) silently destroyed a previously `model_supported` draft with no way back. Fixed: a total-failure run (`proposal: null`) is now only persisted when there was no usable prior draft to protect.
- **Don't assume every added book is fiction.** `discoverReviewSources`'s prompt originally asked for reviews "of the novel" — a real problem once books can be added in-app with no genre metadata (a memoir, for instance). Changed to genre-neutral "the book".
- **Watch agency in generated summaries.** The propose step once wrote that a book's author "admits" something a source actually attributed to a reviewer's own investigation, not the author's own words — verification correctly caught this (`summaryFidelity: unsupported`) and blocked publishing, but the prompt now explicitly distinguishes "a reviewer found/argued X" from "the author personally admitted X" to reduce how often this needs catching after the fact.
- **The heaviest thing this app does is the Reviews research run** (discover → propose → verify, holding 8–15 full review pages in memory). On the original Windows development machine this has twice crashed the local dev server with `RangeError: Array buffer allocation failed` — genuine OS-level memory exhaustion, not an app bug, and it cleared on restart both times. Worth checking free memory before a research run on a resource-constrained machine, and worth treating as a real capacity question (not just a dev annoyance) if this pipeline runs on a memory-constrained production host too.
- **`npm test` must not rely on shell glob expansion.** It previously ran `node --test .test-build/tests/*.test.js`, which only works where the shell expands the wildcard (works under `device_bash`'s Linux shell, silently fails under Windows' default `cmd.exe` even from a PowerShell prompt — "Could not find ...*.test.js"). Changed to `node --test .test-build/tests`, which lets Node's own test runner find the files regardless of shell.

## Work that remains

The most valuable next work is:

1. Author a real opinion-map question skeleton (or a guided in-app way to build one) for a book added via "Add a book", so it can use Draft Opinion Map, Candidate Collisions, Chair, Meeting and Round-up like the three fixture books do — currently that's an explicit, honestly-labelled scope gap.
2. Replace remaining simulated fixture collisions with source-researched, independently verified collisions.
3. Apply the editorial specification during synthesis rather than trying to repair vague wording after generation.
4. Evaluate candidate wording manually for logic and clarity even after source verification passes.
5. Run the broad acceptance evaluation listed in `RESEARCH_MILESTONE.md`.
6. Keep overall Goodreads/StoryGraph appreciation separate from critical-sample counts and collision coverage. Never compute a median or consensus for a discussion polarity.

Resolved since the list above was written:

- ~~Confirm `app/api/research/run-profile/[bookId]` actually completes within Vercel's real serverless execution ceiling in production.~~ It didn't (confirmed 504 in production); the pipeline now runs as an Upstash Workflow background job instead of inline. See "Research pipeline is now a background job" above.

Deliberately not pursuing (a decision, not a gap):

- **Custom SMTP for Supabase Auth.** The user considered Resend/Postmark/SendGrid and chose to stay on Supabase's default sender, accepting its ~2 emails/hour rate limit as a workable constraint rather than add a custom domain. Don't reopen this unless the user raises it again.

## Non-negotiable safeguards

- Do not relabel fixture content as researched.
- Do not accept an isolated quotation without checking its complete captured review.
- Do not infer a position from silence, plot summary, star rating or general praise.
- Do not treat different URLs as proof of independent authorship.
- Do not publish unsupported or unresolved collision coverage or book-profile content.
- Do not let an editorial checkbox override source-fidelity failure.
- Do not expose an Anthropic key or the Supabase service-role key to client code, or use a `NEXT_PUBLIC_` variable for either.
- Do not remove Python parity fixtures without documenting an intentional change to the selection contract.
- Do not let editing a book's title/author change its id — every related table references books by id.

## Validation and local run

```powershell
npm ci
npm run typecheck
npm test
npm run build
npm run dev -- --port 3001
```

The current suite contains 83 passing checks. Webpack is deliberately selected in the package scripts because Turbopack exhausted memory on the original Windows development machine.

## Key files

- `README.md`: current product, setup, deployment and architecture.
- `EDITORIAL_SPEC.md`: binding prose, collision and provenance requirements.
- `RESEARCH_MILESTONE.md`: implemented source safeguards, current trust boundary and production blockers.
- `CLAUDE_SETUP.md`: Anthropic configuration and research commands, operator and in-app.
- `data/books.json`: curated simulated fixture content for the three original books.
- `data/*research-preview.json`: concise research reports shown in the app.
- `lib/editorial-policy.ts`: application-level wording and evidence checks.
- `lib/claude-research.ts`: proposal and independent audit prompts, both research paths.
- `lib/books-db.ts`: merges fixture books with in-app-added books; create/update/delete for the latter.
- `lib/book-profile-db.ts`: published book profiles/review points, and saved Reviews-step research drafts.
- `lib/research-promotions.ts` / `lib/research-promotions-db.ts`: candidate admission logic and its live database-backed source of truth.
- `scripts/research-book.ts`: whole-book research-map prompt (operator-run collision path).
- `app/api/research/run-profile/[bookId]/workflow/route.ts`: the actual discover/propose/verify pipeline, run as an Upstash Workflow background job (see above). `../route.ts` only queues it and reports status.
- `supabase/migrations/`: `0001_init.sql` (auth whitelist, workspaces, research tables), `0002_book_profiles.sql`, `0003_book_profile_drafts.sql`, `0004_books.sql` (in-app-added books), `0005_book_profile_run_status.sql` / `0006_reset_stale_research_runs.sql` (background-job run-status tracking).

## Database migrations: use the Supabase CLI, not the SQL Editor

As of 12 September this project is linked via the Supabase CLI (`npx supabase link --project-ref kuzpvtmzccskjvxudout`, already done on the user's machine). Migrations 0001–0004 were originally applied by hand in the SQL Editor and then marked as already-applied via `npx supabase migration repair --status applied <version>` so the CLI's history matches reality without re-running them. **From here on, a new migration file just needs `npx supabase db push`** — the user has no local Postgres/SQL experience and should not be asked to paste SQL into the dashboard again. Sanity-check with `npx supabase migration list` if local/remote history ever looks like it might have drifted.

## Transfer hygiene

Transfer source, data, tests and documentation. Exclude `node_modules`, `.next`, `.test-build*`, cache folders, development logs, `*.tsbuildinfo`, `.vercel` and all `.env*` files. Configure the Anthropic key and Supabase credentials independently in the destination environment.

The JSON source and result files in the project root may contain complete review text. Include them only if the destination should receive that evidence and the user is entitled to transfer it.
