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

### Automated review discovery — execution window and fallback positions

`app/api/research/run-profile/[bookId]`'s `POST` handler runs discovery, proposal and verification synchronously inside one HTTP request, and can genuinely take several minutes (discovery alone involves the model searching and fetching multiple pages). The route declares `export const maxDuration = 300` to ask Vercel for as long an execution window as it can, but **that number is a request, not a guarantee**: Vercel serverless functions have a plan-dependent real ceiling, and a plan whose ceiling is shorter than 300 seconds (for example, a Hobby plan) will still cut the function off, regardless of what `maxDuration` asks for. This has only been exercised in local/dev testing so far (via the `device_bash` sandbox used in development) — it has not yet been run against an actual Vercel deployment, so whether it completes in production is currently unverified.

If it does time out in production, the fallback positions, in order of preference, are:

1. **Upgrade to a Vercel plan with a longer function-duration ceiling** (Pro or higher) and confirm `maxDuration = 300` (or whatever value fits) is actually honored under that plan. This requires no code change, only a plan/billing decision plus a production smoke test.
2. **Split the pipeline into separate, shorter requests.** Break `discoverReviewSources` → `proposeBookProfile` → `verifyBookProfile` into three round trips from the client (or three route calls), persisting intermediate state (the discovered sources, then the proposal) to `book_profile_drafts` or a similar row between steps, so each individual request fits inside a shorter timeout even on a constrained plan.
3. **Move the run off the request/response cycle entirely.** Queue the run as a background job (a Vercel Background Function / Cron-triggered worker, or an external worker process) that writes its result to `book_profile_drafts` when finished, and have the "Reviews" admin panel poll that table for completion instead of awaiting one long HTTP call end to end. This is the most robust option but the largest change, and is the natural next step if option 1 isn't available and option 2 proves awkward in practice.

Whoever picks this back up should treat "confirm this route actually completes on the deployed Vercel plan" as the first verification step before relying on it in production, since local testing cannot exercise Vercel's real timeout behavior.

Simulated fixture maps—drafted with ChatGPT/Codex during prototype development rather than extracted from reviews—may be finalised after their editorial checks pass. The exact locally admitted candidates (Kundera's ideas-and-felt-life, and Broken Country's beth-characterisation and prose-style) may also be finalised while their manifest bindings remain valid. No other saved research result is automatically admissible.

## Work still required for production release

- Move research admission and finalisation enforcement to a trusted server. **Done** for both paths: `app/api/research/promote` (collision candidates) and `app/api/research/publish-profile` (book profiles) both run server-side, re-check authorization and re-derive/verify the evidence digest rather than trusting the client.
- Store immutable source snapshots, verification records and promotion manifests outside client-controlled state. **Done for what's been promoted/published** — `research_promotions`, `book_profiles` and `review_points` are Supabase tables, not client state. Note this doesn't yet cover the *un-promoted* saved research runs and evidence: `book_profile_drafts` and `research_sources`/`research_candidates` are writable by any authorized user and aren't immutable audit records in the same sense.
- Confirm `app/api/research/run-profile/[bookId]` actually completes within Vercel's real serverless execution ceiling — see "Automated review discovery — execution window and fallback positions" below. Not yet verified against a live deployment.
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
