# Editorial acceptance criteria — V1.1

Status: binding specification. Reviewed 8 September 2026.

The product’s value is the accurate, crisp expression of researched opinions and critical writing. A collision must express a substantive difference found in sources. It must not invent disagreement merely to produce a discussion question.

## Applies to all visible editorial text

These rules apply to Admin Briefing summaries, context lenses, collision positions, Opinion Map propositions, supporting prompts, every tone variant, curator suggestions, Chair/member copy and Round-up observations.

1. **Name the subject.** Identify the relevant character, event, relationship, technique, action or consequence.
2. **Make every referent explicit.** Words such as “choice”, “link”, “escape”, “feelings”, “it” and “too much” must have an unmistakable object or meaning.
3. **Explain the connection.** Readers should debate whether an interpretation is persuasive; they should not have to supply missing reasoning.
4. **Name the agent.** Attribute a character’s action to the character and an authorial construction to the author. Avoid passive phrasing that leaves “shaped by whom?” unanswered.
5. **Use logical causal language.** State that one event produces another only when the evidence establishes direct causation. Use “contributes to”, “helps explain” or similarly qualified wording when that is the supported claim.
6. **Compare the same issue.** Both sides of a collision must assess the same named matter and genuinely differ. Believable and predictable, for example, are compatible and cannot serve as automatic opposites.
7. **Use natural English.** Prefer direct, precise sentences. Avoid slang, academic jargon, vague abstractions, euphemisms and forced informality in every tone.
8. **Preserve meaning and evidence strength.** Shortening, rewording or changing tone must retain material qualifications and must not strengthen a source’s claim.
9. **Keep evidence traceable.** Every researched position needs a named source, URL, complete captured context, exact supporting passage and explanation of how the passage supports the position.
10. **Do not imply unsupported prevalence.** Never invent consensus, a dominant view, a worldwide response or a reception claim. Simulated material must remain explicitly labelled.

## Question construction

- A five-point proposition states one supported position clearly; disagreement on the scale represents the supported opposing position.
- A supporting prompt may use an either/or form when both alternatives are explicit, logically parallel and supported.
- The proposition and prompt must be understandable without opening source notes or remembering an earlier paragraph.
- Rewording retains the same collision. Replacement selects a different collision.
- Tone changes may alter sentence style but may not alter the topic, agency, causal claim, qualifications or strength of either position.
- A locked card cannot be edited by manual, reword, replace or tone controls. A documented wording migration may update old test-locked fixture text while preserving the previous draft in history.

## Reception and discussion polarities

- Keep overall critical reception, reader-platform reception and issue-specific source coverage separate.
- Use an explicit critic score only when a source publishes one. Otherwise show the critical sample size and transparent positive, mixed, negative and unclear counts; do not turn those labels into a synthetic average or median.
- Show each reader platform’s published average, rating volume, retrieval date and source link. Do not combine platforms with different populations or rating systems into a worldwide score.
- For a verified collision, classify every sampled review as View A, mixed/qualified, View B, not addressed or unresolved. Silence, plot summary and general praise do not establish a position.
- Present these classifications only as source coverage. They show how often the research encountered the issue and keep minority views visible.
- Do not calculate a median, consensus, dominant side or viability score for a collision. A collision exists to support discussion; frequency does not determine whether a sourced interpretation is worth considering.
- If a collision fails source verification, do not publish its coverage counts as a research finding.

## Research accuracy and AI responsibility

Claude is used in the operator-run research pipeline to propose wording and to perform a separate source-context audit. No live model writes text in the browser. Fixture wording and tone variants are curated static content; Curator Chat is a simulation.

## Provenance labels

Every collision and member-facing question must have one of these traceable origins:

- **Simulated fixture:** drafted with ChatGPT/Codex during prototype development and revised through human editorial feedback. It is not a claim about what reviewers said and must display **Simulated — not researched** or an equally explicit label.
- **Research report candidate:** generated from captured reviews and shown with its supported, unsupported or unresolved verification outcome. Appearance in Admin Briefing does not place it in the Opinion Map.
- **Admitted verified research:** a supported candidate whose exact source digest and wording match an authorised promotion record. Editing the wording expires that status.

The app must never infer provenance from polished wording. The status must come from explicit fixture metadata or a valid research-admission record.

Accurate representation of the sources is the AI pipeline’s responsibility. Human editorial judgement selects useful collisions and improves expression, but it must not compensate for inaccurate synthesis. A polished sentence cannot pass when its source interpretation is wrong.

Research synthesis must:

- retain contrary details and qualifications that materially change a view;
- distinguish general praise from approval of a specific technique or event;
- distinguish a reviewer’s personal reaction from a claim about artistic success;
- avoid treating different subjects as opposing positions;
- use exact source passages as evidence while considering the full captured review;
- report missing or ambiguous support as unresolved.

Source-fidelity release requirements and the current implementation boundary are defined in [RESEARCH_MILESTONE.md](RESEARCH_MILESTONE.md).

## Review and enforcement

App validation checks structure, known rejected phrases, declared fixture/research status, required evidence fields and current research-admission state. It also checks questions, lenses, collisions and fixture findings for recorded wording regressions.

Finalisation requires the editor to acknowledge the checklist for the exact draft and book context. Changing wording, collision evidence or relevant book context changes the review fingerprint and invalidates that acknowledgement. Editing admitted research wording also changes its state to **Verification expired** and blocks finalisation.

Mechanical checks cannot determine whether prose is insightful or whether every sentence is elegant. Editorial review remains mandatory after tests pass.

## Recorded examples

Rejected: “Sympathy may soften judgement without removing responsibility.”

Reason: it omits the person, conduct and competing reasons.

Preferred: “Beth’s grief over Bobby makes her secrecy with Frank and her affair with Gabriel more understandable. A different view holds her responsible for deceiving Frank despite her grief.”

Rejected: “Pushes for tears.”

Reason: it is casual and does not identify what the prose does.

Preferred: “Repeated explanations of Beth’s grief and longing make some scenes less moving.”

Rejected: “Gabriel gives Beth a link to her former life.”

Reason: “link” does not say what Gabriel revives or why it matters.

Preferred: “Being with Gabriel revives the future Beth and Gabriel imagined together at seventeen, which may partly explain why she returns to him.”

Rejected: “Their feelings were shaped mainly to sustain the love triangle.”

Reason: it does not say whether the characters shaped their conduct or the author shaped the plot.

Preferred: “Hall makes Beth, Gabriel and Frank act implausibly in order to keep the love triangle going.”

Rejected: “Bobby’s death produces Beth’s secrecy.”

Reason: the causal claim is illogical as written and too direct for the stated interpretation.

Preferred: “Grief over Bobby may contribute to Beth’s renewed attachment to Gabriel; the question is whether the novel develops that connection convincingly.”

## Change requirements

For any content, tone, research or curator change:

1. Review every affected visible copy variant against this specification.
2. Add a regression check when feedback identifies a repeatable failure.
3. Keep simulated and researched material visibly distinct.
4. Preserve the exact-content editorial acknowledgement and source-verification gates.
5. Report what was implemented, what was mechanically checked and what still requires editorial judgement.
6. Preserve the original Python parity cases unless the selection contract deliberately changes and that change is documented.
