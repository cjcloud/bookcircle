/** Named step indices for the admin workflow sidebar (components/AdminApp.tsx's
 * `steps` array) and the view indices ResearchViews.tsx renders. Every
 * `go(n)` / `step===n` / `view===n` comparison across the app should use
 * these instead of a bare number — inserting or reordering a step is a
 * one-line change here instead of an easy-to-miss renumbering sweep. */
export const STEP_BRIEFING = 0;
export const STEP_REVIEWS = 1;
export const STEP_CONTEXT = 2;
export const STEP_COLLISIONS = 3;
export const STEP_DRAFT = 4;
export const STEP_CHAIR = 5;
export const STEP_MEETING = 6;
export const STEP_ROUNDUP = 7;

/** View indices within ResearchViews.tsx, which renders the first three
 * workflow steps (Admin Briefing, Reviews, Context & Interpretation,
 * Candidate Collisions are actually four views — see STEP_* above; the
 * view index passed to ResearchViews is just `step` for step<4). */
export const VIEW_BRIEFING = STEP_BRIEFING;
export const VIEW_REVIEWS = STEP_REVIEWS;
export const VIEW_CONTEXT = STEP_CONTEXT;
export const VIEW_COLLISIONS = STEP_COLLISIONS;
