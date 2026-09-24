# Rink registry — how to add a rink

The registry is [`data/rinks.json`](../data/rinks.json). Every session in the app must trace back to a rink id and a **schedule source URL**.

## Checklist for a new rink

1. **Verify identity** — Official name, address, phone, homepage (not only a third-party listing).
2. **Find schedule sources** — Separate URLs for public skate vs adult hockey if needed.
3. **Classify source type** — HTML table, monthly PDF, RecDesk program, RinkTime/RecTimes embed, league portal (e.g. Crossbar, SportsEngine).
4. **Pick adapter** — Reuse an existing adapter if the platform matches; otherwise add `adapters/<name>.ts`.
5. **Add to `rinks.json`** — Set `status: "pilot"` until one successful scrape.
6. **Run scraper locally** — Inspect output JSON; spot-check 3 dates against the official site.
7. **Mark `active`** — When you trust it for daily use.

## Adapter naming

| Adapter | When to use |
| --- | --- |
| `dover-pdf` | Dover Arena monthly public skate PDF pattern |
| `recdesk` | Rochester RecDesk program schedule tables |
| `generic-html` | Simple static HTML tables (fragile) |
| `manual` | You paste weekly CSV until automation exists |

## Seacoast pilot rinks (starter list)

Statuses below are **documentation only** — confirm URLs before scraping.

| id | Venue | City | Notes |
| --- | --- | --- | --- |
| `dover-arena` | Dover Ice Arena | Dover NH | City site + monthly PDFs; [public skate fees](./dover-public-skate.md) |
| `churchill-rink-durham` | Churchill Rink | Durham NH | SportsEngine live public skate + hockey schedule page |
| `rochester-arena` | Rochester Arena | Rochester NH | RecDesk public skate; separate from Rochester Ice Center |
| `rochester-ice-center` | Rochester Ice Center | Rochester NH | Distinct facility; RecTimes / site embed |
| `exeter-rinks` | The Rinks at Exeter | Exeter NH | Verify current branding/URLs |
| `hammond-arena` | The Rinks at Exeter (Hammond) | Exeter NH | May share parent org — dedupe in registry |
| `portsmouth-ice` | Portsmouth area rinks | Portsmouth NH | TBD — user to supply |
| `sanford-ice` | Sanford Ice Arena | Sanford ME | Common drive from Dover |
| `york-ice` | York Ice Arena | York ME | |

**Your input needed:** Fill in rinks you actually visit; remove rows you do not care about.

## URL hygiene

- Prefer **HTTPS** city or rink domains.
- Store **direct PDF links** when schedules are PDF-only; update monthly when the city posts a new file (or teach scraper to discover “current month” link from [public skate page](http://dover.nh.gov/government/city-operations/recreation/arena/public-skate/)).
- Record `phone` for “call to confirm” rinks (Dover publishes this prominently).

## Deduplication

Some brands operate multiple sheets under one website (e.g. two surfaces). Use one `rink_id` per physical address unless sessions are surface-specific and users care — then use `name` suffix “— East rink”.
