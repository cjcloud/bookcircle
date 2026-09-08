# Source-fidelity milestone — SF-1

Status: partially implemented; production release remains blocked. Reviewed 8 September 2026.

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
- one controlled local admission for the exact verified Kundera proposition;
- immediate expiry and finalisation blocking after any change to admitted wording.

All generated research reports retain `releaseApproved: false`. Unsupported and unresolved candidates remain visible only as research outcomes and cannot enter the Opinion Map through the controlled admission route.

## Current trust boundary

Research commands run locally outside the browser. The Next.js app displays concise saved reports; it does not call Claude live, discover reviews or retrieve pages.

The Kundera admission manifest proves the desired interaction locally. It binds candidate ID, book, target question, collision, category, exact proposition, exact supporting prompt, evidence digest, source IDs and verification date. Because that manifest and its checks are shipped to the browser, it is not a trusted production security boundary.

Simulated fixture maps—drafted with ChatGPT/Codex during prototype development rather than extracted from reviews—may be finalised after their editorial checks pass. The exact locally admitted Kundera candidate may also be finalised while its manifest binding remains valid. No other saved research result is automatically admissible.

## Work still required for production release

- Move research admission and finalisation enforcement to a trusted server.
- Store immutable source snapshots, verification records and promotion manifests outside client-controlled state.
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
