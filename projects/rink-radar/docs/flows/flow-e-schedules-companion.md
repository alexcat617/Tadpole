# Flow E — Schedules companion (Bruins, UNH Wildcats, Dover varsity)

**Feedback:** “It would be nice to see the wildcats schedule too.”  
**Priority:** P2 · **Persona:** Chris (primary)

## Summary

Bottom **Schedules** FAB opens a drawer with text tabs for each companion source that has data (**Bruins**, **Wildcats**, **Dover Varsity**). One source’s content shown at a time (not stacked across tabs). **Dover Varsity** uses **Boys | Girls** inner tabs when both squads have games. **Hype** lives in the drawer footer.

## Entry & preconditions

| Precondition | If false |
| --- | --- |
| At least one companion JSON (`bruins-schedule.json`, `wildcats-schedule.json`, `dover-varsity-schedule.json`) has games | Hide Schedules FAB entirely |
| User on sessions view (not Programs) | Schedules FAB hidden on Programs |

## Happy path

1. User taps **Schedules** FAB.
2. Drawer opens; scroll locked on body.
3. If **≥ 2** sources have data: tab bar lists each available source; default **Bruins** when present, else Wildcats, else Dover Varsity.
4. Active tab shows that source’s games by month (TV line for Bruins when present); past games muted.
5. Dover tab: **Boys | Girls** inner tabs when both squads have games; otherwise single squad list. Footer links to each Arbiter page.
6. User closes drawer → returns to prior view.

## Tab bar

| Sources with games | Tabs shown |
| --- | --- |
| 1 | No tab bar; section heading only |
| 2+ | One tab per non-empty source |

## Copy inventory (additions)

| Element | Copy |
| --- | --- |
| Dover tab | Dover Varsity |
| Dover squad headings | Boys varsity · Girls varsity |
| Dover disclaimer | Not affiliated with NHIAA or Dover School District. |
| Dover footer links | Boys schedule · Girls schedule |

## States

```mermaid
stateDiagram-v2
  direction TB
  closed: Drawer_closed
  open: Drawer_open
  bruinsOnly: Bruins_section_populated
  wildcatsOnly: Wildcats_section_populated
  both: Both_sections

  closed --> open: Tap_Schedules_FAB
  open --> closed: Backdrop_Escape_close
  open --> bruinsOnly: Wildcats_JSON_empty
  open --> wildcatsOnly: Bruins_JSON_empty
  open --> both: Both_JSON_present
```

## Happy path

1. User taps **Schedules** FAB (bottom-right; shell padding clears FAB).
2. Drawer opens; scroll locked on body.
3. If both teams have data: **Bruins | Wildcats** text tabs (muted inactive, ink active); default **Bruins** when opening.
4. Active tab shows that team’s games by month (TV line for Bruins when present); past games muted.
5. User taps **Official … schedule** footer for the active team.
6. User closes drawer → returns to prior view.

## Alternate paths

| Path | Behavior |
| --- | --- |
| Open My rinks while drawer open | Not allowed — open drawer closes others first |
| Only Bruins data | Wildcats section shows “Schedule unavailable” + UNH official link |
| Only Wildcats data | Bruins section omitted or same unavailable pattern |

## Empty states

| State | UI |
| --- | --- |
| Section JSON empty after failed scrape | Muted: Schedule unavailable. Check official site. + link |
| Entire companion empty | No Schedules FAB |
| No Bruins/UNH game today or tomorrow (ET) | No game-day banner |
| Game today or tomorrow | Compact left-aligned pill above session controls (not tappable) |

## Error & recovery

| Trigger | User sees | Recovery |
| --- | --- | --- |
| Bruins API fail (scrape) | Last good JSON retained | User may not notice; Updated not shown for companion optionally |
| Wildcats fetch fail | Empty section + link | Open official UNH schedule |
| Drawer open, rotate device | Drawer remains; scroll restored on close | Close and reopen |
| User expects rink sessions | Companion is separate from session search | Drawer title **Game schedules** only; no lede copy |

## Copy inventory

| Element | Copy |
| --- | --- |
| Schedules FAB | Schedules |
| Drawer Hype | Hype |
| Bruins title | Bruins {season_label} |
| Wildcats title | UNH Wildcats men's hockey |
| Disclaimer (each) | Not affiliated with {league/team}. |
| Footer link | Official schedule |

## Acceptance criteria

- [ ] One Schedules FAB, one drawer; Hype in drawer footer.
- [ ] FAB hidden when both JSON game arrays empty.
- [ ] Escape, backdrop, × close drawer; scroll unlock.
- [ ] No NHL/UNH logos in UI (palette only).
- [ ] Scraper retains last-good file per league on failure.

## Dependencies

- `wildcats-schedule.mjs` + data file
- `dover-varsity-schedule.mjs` + `dover-varsity-schedule.json`
- Refactor Bruins-only UI in `App.tsx` to shared drawer
- `scraping-policy.md` + `data-model.md` updates
- Candidate sources: [companion-schedule-intake.md](../companion-schedule-intake.md)
