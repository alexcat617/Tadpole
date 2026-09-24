# UX principles — Rink Radar

Guardrails for product UI, prototyping, and agent-assisted changes. Complements the [PRD](./PRD.md) and [requirements](./requirements.md); does not replace them.

**Related:** [UI patterns](./ui-patterns.md) (layout, components, responsive behavior).

## References

- [Shneiderman’s eight golden rules](https://www.cs.umd.edu/users/ben/goldenrules.html)
- [Nielsen Norman Group — ten usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)

Shneiderman and Nielsen overlap (feedback, control, consistency, errors, memory). This doc uses **one guardrail set** mapped to both where useful.

## Prototype conventions (v2 branch)

These reflect the current app behavior. The PRD still describes geolocation, radius, and tap-to-modal flows in places—treat this section as **active prototype intent** until product docs are updated.

| Area | Current prototype |
| --- | --- |
| Search | User picks activity + date, then taps **Find sessions** (no auto-run on filter change). |
| Loading | Spinner + copy while schedule JSON is fetched; CTA shows **Searching…** and is disabled. |
| Results lock | **Find sessions** disabled after a successful search with ≥1 result; use **Clear sessions** to reset. |
| Clear | **Clear sessions** removes results and returns to the pre-search prompt; keeps draft filters. |
| Deferred UI | **Within** (radius) and **Use my location** hidden until designed (fixed 40 km + Dover anchor). |
| Session detail | Inline **accordion** on the card (not a modal). |
| Card summary | Time, distance, rink name, activity/price line—no city/state on collapsed card. |
| Trust | Persistent disclaimer: confirm with the rink; every session links to official source. |

## Unified guardrails

| Theme | What we enforce in Rink Radar | Shneiderman | NN/g heuristic |
| --- | --- | --- | --- |
| Status & feedback | Search loading state; results region `aria-live`; show schedule **Updated** when data exists; disabled buttons reflect state | Informative feedback | Visibility of system status |
| User control | Explicit search and clear; expand/collapse session details; no surprise navigation or auto-submit | Locus of control; easy reversal | User control and freedom |
| Closure | Search completes → list or empty state; clear → back to “pick and search” prompt | Dialog yields closure | (supports status) |
| Consistency | Primary search CTA (**Find next session**: gold-outline on white); blue fill only for **Share with friend**; secondary outline buttons elsewhere; one card/accordion pattern. Chrome uses Bruins-inspired ink + gold (header, tabs)—reference colors only, no logos. | Strive for consistency | Consistency and standards |
| Errors | Plain language; recover by retrying search or changing date/activity; do not show wrong times (NFR-1) | Simple error handling | Help recover from errors; error prevention |
| Recognition | Collapsed cards show recognizable fields (rink name, time); details on expand | Reduce memory load | Recognition rather than recall |
| Real-world language | “Public skate”, “Adult hockey”, rink names; avoid internal schema labels in UI | — | Match between system and real world |
| Minimalism | Hide unfinished controls; avoid extra chrome; one primary action per step | — | Aesthetic and minimalist design |
| Efficiency | Power features (geolocation, radius, sort) ship when specified—not half-exposed in UI | Shortcuts for experts | Flexibility and efficiency of use |
| Help | Expanded session: address, maps, official schedule, rink site; maintainer docs in `docs/` | — | Help and documentation |

## Accessibility (NFR-4)

Target **WCAG 2.2 AA** for list and detail interactions.

- **Contrast:** Explicit text colors on controls with forced light backgrounds (dark `color-scheme` can make button text invisible otherwise).
- **Touch:** Interactive targets ≥ 44×44 CSS px where practical.
- **Semantics:** Activity control as tabs; session expanders use `aria-expanded` and `aria-controls`.
- **Motion:** Respect `prefers-reduced-motion` if adding animations beyond the search spinner.
- **Focus:** Visible focus styles on buttons, links, and date input; logical tab order (controls → results).

For copy audits, use the repo **ux-writing** skill. For substantive UI reviews, use **accessibility-audit** or **design-critique** skills.

## Out of scope (MVP UI)

From PRD non-goals: booking, accounts, social, nationwide search, youth program discovery UI. Do not add these in prototype passes without an explicit product decision.

## When to update this doc

- New user-facing flow or control (especially if it changes search, clear, or detail behavior).
- PRD/requirements change that affects UI.
- Repeated agent or human mistakes (add a row to the guardrail table or a note under prototype conventions).
