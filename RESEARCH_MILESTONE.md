# Source-fidelity milestone — SF-1

Status: partially implemented; production release remains blocked, though less remains blocked than before — see "Work still required for production release" below. Reviewed 8 September 2026, updated 10 September 2026.

SF-1 governs any wording presented as the result of review research. Accurate distillation is a fundamental product requirement. Human review may judge usefulness and expression, but it must not be used to excuse inaccurate representation of a source.

## Release condition

Before live researched wording can be released in production, a trusted server workflow must:

1. discover candidate reviews without treating search results as evidence;
2. retrieve complete, versioned source text with surrounding context;
3. establish explicit authorship and check for copying or syndication;
4. extract attributed positions and retain material qualifications;
5. identify a genuine disagreement about the same issue across reasonably independent sources;
6. verify every synthesized position and member-facing question in a separate pass against the complete captured texts;
7. return supported, unsupported or unresolved with specific reasons;
8. bind a supported result to exact source digests, wording, book, collision and target card;
9. invalidate verification whenever bound evidence or wording changes;
10. enforce admission and finalisation on the trusted server.

Missing or ambiguous evidence cannot pass. Complete citations and an editorial checkbox cannot confer verified status.

## Implemented now

The local operator pipeline implements:

- Claude web-search discovery with URL deduplication and private/local-address rejection;
- deterministic initial page screening;
- full article retrieval with JSON-LD article extraction where available;
- separate Claude screening for correct book, substantive criticism, completeness, authorship and overall reception;
- source snapshots with SHA-256 text digests and optional first-party authorship evidence;
- exact-passage attribution checks against complete captured review text;
- duplicate-text detection;
- proposal and independent verification calls;
- five verification dimensions: attribution, qualifications, genuine disagreement, faithful member wording and reasonable evidence of source independence;
- fail-closed handling of HTTP errors, timeouts, truncation, malformed JSON, incomplete checks and changed evidence;
- safe staged synthesis for long source sets;
- per-review source-coverage classification without viewpoint ranking;
- editorial prompting for explicit referents, named agency, logical causal language and natural English;
- saved Admin Briefing reports for all three fixture books;
- controlled local admission for three exact verified propositions: one Kundera candidate and two Broken Country candidates;
- immediate expiry and finalisation blocking after any change to admitted wording.

All generated research reports retain `releaseApproved: false`. Unsupported and unresolved candidates remain visible only as research outcomes and cannot enter the Opinion Map through the controlled admission route.

## Current trust boundary

Two research paths now exist side by side. The original operator commands (`scripts/research*.ts`, `scripts/discover-reviews.ts`, etc.) still run locally outside the browser and write to local JSON files, as described below. Separately, `app/api/research/run-profile/[bookId]` is a server-side, in-app route that runs the same kind of pipeline for a book's summary/review profile (genre, spoiler-aware summaries, opinions, positive/negative points) live, on request, from the Admin app's Reviews step — no local command line involved. It calls `discoverReviewSources` (Claude's own `web_search`/`web_fetch` tools finding and capturing real review pages), then `proposeBookProfile` and `verifyBookProfile`, and saves whatever the run produces to the `book_profile_drafts` table via `requireAuthorizedUser()` + `getDbClient()`, the same auth/DB pattern as every other API route. Nothing this route produces is released automatically — publishing to `book_profiles`/`review_points` still requires a separate authorized "Publish to app" action, gated on `verification.status === 'model_supported'` and a server-side re-check of the evidence digest.

The admission manifest (Kundera, plus the two Broken Country candidates) uses the older collision-candidate workflow. Each entry binds candidate ID, book, target question, collision, category, exact proposition, exact supporting prompt, evidence digest, source IDs and verification date. **This is now a server-enforced trust boundary, not a demo**: the manifest lives in the `research_promotions` table, `app/api/research/promote` loads it live from Supabase, checks the requesting user against `authorized_emails` server-side, and writes the resulting workspace state itself — `lib/research-promotions.ts`'s exported array (`defaultResearchPromotions`) is now only a fallback used by tests and any call site that doesn't pass a live list, not what the deployed app actually admits against.

### Automated review discovery — execution window (resolved)

**Confirmed timed out in production.** `app/api/research/run-profile/[bookId]`'s `POST` handler originally ran discovery, proposal and verification synchronously inside one HTTP request. On the deployed Hobby plan this was hit directly: a real production run of `POST /api/research/run-profile/the-pirate-queen` returned `504 FUNCTION_INVOCATION_TIMEOUT`, with Vercel's own runtime log reading "Task timed out after 300 seconds" — exactly the `maxDuration` ceiling the route had asked for. An earlier apparent "success" for the same book turned out to be the panel rendering an old draft cached in the shared `book_profile_drafts` table from local dev testing, not a completed production run — a trap worth flagging for anyone re-verifying a similar route: check the run's actual `generatedAt` timestamp and the Vercel Logs entry for that specific `POST`, not just that the UI shows a result.

**Fix shipped:** the pipeline no longer runs inline in the request the "Run research now" click makes. It now runs as an [Upstash Workflow](https://upstash.com/docs/workflow) background job (`app/api/research/run-profile/[bookId]/workflow/route.ts`), triggered on demand (never on a schedule — this is user-initiated, not periodic) by the original route's `POST` handler via the Upstash `Client`. Each pipeline stage (`discover`, `propose`, `verify`, plus small book-load/status steps) runs as its own `context.run()` step — a separate short Vercel invocation orchestrated by QStash calling back into the workflow route between steps — so no single invocation has to run all three stages back to back the way the old handler did. `POST` now just records `run_status = 'queued'` on `book_profile_drafts` and triggers the workflow, returning in well under a second; `GET` reports `runStatus` (`idle` | `queued` | `running` | `done` | `failed`) alongside the last completed report, and `components/BookProfileResearch.tsx` polls it every 5 seconds while a run is in flight rather than awaiting one long request. This matches how the run is actually used: kicked off once, checked on later, not a live/real-time operation.

Requires `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY` and `QSTASH_NEXT_SIGNING_KEY` (a free Upstash account, no card required at time of writing) set as environment variables in Vercel; `supabase/migrations/0005_book_profile_run_status.sql` adds the `run_status`/`run_error`/`run_updated_at` columns this depends on and relaxes `report`/`status` to nullable (a queued run has no report yet). This is a first implementation against Upstash Workflow's documented API, exercised via its own docs rather than a local test run (no local shell access to this project during development) — treat the first real production run as the actual test, and check the Upstash Console's Workflow run log alongside Vercel Logs if a run seems to hang.

Simulated fixture maps—drafted with ChatGPT/Codex during prototype development rather than extracted from reviews—may be finalised after their editorial checks pass. The exact locally admitted candidates (Kundera's ideas-and-felt-life, and Broken Country's beth-characterisation and prose-style) may also be finalised while their manifest bindings remain valid. No other saved research result is automatically admissible.

## Work still required for production release

- Move research admission and finalisation enforcement to a trusted server. **Done** for both paths: `app/api/research/promote` (collision candidates) and `app/api/research/publish-profile` (book profiles) both run server-side, re-check authorization and re-derive/verify the evidence digest rather than trusting the client.
- Store immutable source snapshots, verification records and promotion manifests outside client-controlled state. **Done for what's been promoted/published** — `research_promotions`, `book_profiles` and `review_points` are Supabase tables, not client state. Note this doesn't yet cover the *un-promoted* saved research runs and evidence: `book_profile_drafts` and `research_sources`/`research_candidates` are writable by any authorized user and aren't immutable audit records in the same sense.
- ~~Confirm `app/api/research/run-profile/[bookId]` actually completes within Vercel's real serverless execution ceiling.~~ **Done** — see "Automated review discovery — execution window (resolved)" above. It didn't (confirmed 504 in production), and the pipeline now runs as a background job instead of inline in the request.
- Run a broad, documented acceptance evaluation across books, genres, favourable and critical reviews, and difficult qualification patterns.
- Demonstrate that faithful syntheses pass and that invented disagreement, omitted qualifications, misleading excerpts, wrong attribution, duplicate reviews and changed wording fail.
- Exercise inaccessible, changed and partially retrievable sources and confirm that they remain unresolved.
- Test adversarial source text and attempts to forge verification or admission fields.
- Define the operator approval and audit trail for promoting a newly verified candidate into the product.
- Decide how the production service lawfully stores or references review text while preserving enough context to audit each synthesis.

The production release block must remain until this work passes. A successful pilot candidate is evidence about the workflow, not completion of SF-1.

## Source independence

Independence means reasonable documented evidence of distinct authorship, not impossible proof that no undisclosed coordination occurred. Require named authorship, first-party origin evidence where necessary and comparison of the actual texts. Record observed copying, syndication and uncertainty. Different domains or the absence of obvious duplication alone are insufficient.

## Reception and polarity measurement

Overall reader appreciation and collision-level research serve different purposes:

- Goodreads and StoryGraph figures remain separate published platform averages with rating volumes, retrieval dates and links.
- The critical sample reports transparent positive, mixed, negative and unclear counts. It is not converted into a synthetic score.
- A verified collision reports View A, mixed/qualified, View B, not addressed and unresolved counts across the sampled reviews.
- Collision coverage does not produce a median, consensus, dominant view or viability score.
- Coverage for a failed collision is withheld.

## Pilot record

### Broken Country

- Discovery considered 16 items; 10 complete attributed critical reviews were analysed, five items were excluded and one review was retained as a coverage holdout.
- Two candidates passed all five model checks: Beth’s characterisation and the prose’s degree of restraint.
- A plot-twist candidate was blocked because it flattened qualifications.
- The earlier three-review attempt was unresolved because it compared different dimensions of response and lacked adequate independence evidence. The later expanded run supersedes it for the displayed briefing.
- On 8 September 2026, both candidates were independently re-collected and re-verified live (10 of the 11 target reviews retrieved fresh from source; the Kirkus review could not be re-scraped due to a page-structure change) and both again passed all five checks. Beth's characterisation (candidate `beth-characterisation`, targeting `bc-q1`) and prose restraint (candidate `prose-style`, targeting `bc-q4`) are now controlled local promotions in `lib/research-promotions.ts`, admissible from the Admin Briefing's **Use verified wording in draft** control.

### The Family Upstairs

- Discovery and a targeted extension considered 35 pages; 10 complete attributed critical reviews were analysed.
- Two initial candidates were blocked and one remained unresolved because they flattened qualifications or treated compatible observations as opposites.
- A revised disagreement about multiple viewpoints passed all five checks.
- Its displayed coverage is five View A, two mixed/qualified, two View B and one not addressed.

### The Unbearable Lightness of Being

- Discovery and targeted extension considered 41 pages; eight complete attributed critical articles were analysed.
- A combined long-review synthesis failed closed after incomplete structured responses.
- Staged analysis found and then corrected a polarity about whether philosophical and political material strengthens or displaces emotional life. A fresh audit supported the revised version on all five checks.
- Displayed coverage is three View A, one mixed/qualified, one View B, one not addressed and two unresolved because proposed passages did not exactly match captured text.
- The exact verified proposition “The novel’s philosophical and political ideas strengthen its emotional effect” is the sole candidate in the local promotion manifest.

## Required regression coverage

The test suite must continue to cover:

- faithful source-backed synthesis;
- invented or false disagreement;
- omitted material qualifications;
- misleading isolated excerpts;
- wrong attribution;
- duplicated or copied reviews;
- incomplete and malformed model responses;
- unknown or excerpt-only source scope;
- changed source text or member wording;
- source coverage that distinguishes silence from a position;
- forged or mismatched admission data;
- expiry of admitted research after an edit;
- plain-English wording regressions identified through editorial review.

See [CLAUDE_SETUP.md](CLAUDE_SETUP.md) for operator commands and [EDITORIAL_SPEC.md](EDITORIAL_SPEC.md) for the binding language rules.
