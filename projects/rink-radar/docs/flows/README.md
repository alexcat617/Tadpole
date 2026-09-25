# Flow maps — Rink Radar

Structured maps for building and QA. Each file covers **happy paths**, **alternates**, **errors**, and **recovery** so implementation and testing do not stop at the golden path.

**Branch:** `rink-radar/user-testing-build`  
**Related:** [Personas](../personas.md) · [UI patterns](../ui-patterns.md) · [UX principles](../ux-principles.md) · [User testing feedback](../user-testing-feedback.md) (when created)

## How to use these maps

1. **Build:** Implement states and copy from the map before adding UI polish.
2. **Test:** Walk every row in **Error & recovery** tables for each flow.
3. **Feedback:** Link new tester quotes to a flow ID in the feedback log.

## Flow index

| ID | Document | Priority | Personas | Feedback theme |
| --- | --- | --- | --- | --- |
| Core | [flow-00-core-session-discovery.md](./flow-00-core-session-discovery.md) | Baseline | Chris, Jordan | — |
| H | [flow-h-search-by-date.md](./flow-h-search-by-date.md) | P0 | Jordan | Mobile search / empty date |
| G | [flow-g-rink-filter.md](./flow-g-rink-filter.md) | P1 | Jordan, Chris | “Just Dover Ice Arena” |
| F | [flow-f-find-next-five-days.md](./flow-f-find-next-five-days.md) | P1 | Chris, Jordan | “More than one result” |
| I | [flow-i-programs-audience.md](./flow-i-programs-audience.md) | P1 | Jordan, Chris | “Where are the kids programs?” |
| E | [flow-e-schedules-companion.md](./flow-e-schedules-companion.md) | P2 | Chris | Wildcats + Bruins calendar |

Suggested build order: **H → G → F → I → E** (after core regression on Core).

## Document template

New flows should copy this skeleton:

```markdown
# Flow {ID} — {Title}

## Summary
## Entry & preconditions
## States (diagram)
## Happy path
## Alternate paths
## Empty states
## Error & recovery
## Copy inventory
## Acceptance criteria
## Dependencies
```

## Overlay exclusivity (global rule)

Only one of these may be open at a time: **Search by date panel**, **My rinks drawer**, **Schedules drawer**. Opening one closes the others. Documented in [ui-patterns.md](../ui-patterns.md).
