# Dover Ice Arena — stick practice

Official schedule and fee source: [Stick Practice (City of Dover)](http://dover.nh.gov/government/city-operations/recreation/arena/stick-practice/)

Times are posted in **monthly PDFs** linked from that page. Schedules change — call **603-516-6060** to confirm before you go.

Dover uses **“stick practice”** session names on the calendar (e.g. **Adult stick**, **Youth stick**, **Parent/tot**). Other rinks may say “stick & puck” or “skate & shoot”; Rink Radar groups these under the **Stick & puck** activity tab.

## Session types on the stick calendar

| Calendar label | Who it’s for | Rink Radar subtype |
| --- | --- | --- |
| **Youth stick** | Grade 8 and below (as of season start); full equipment; no parents on ice; cap 20 skaters / 2 goalies | `youth_stick` |
| **Parent/tot** | Children 10 and under with a parent; recreational hockey (not team practice); full equipment for kids, helmet for parents | `parent_tot` |
| **Adult stick** | 18+; helmets required; cap 20 skaters / 2 goalies | `adult_stick` |

Not every month lists all three types on the grid. If a type is missing from the PDF for that month, it will not appear in scraped data until the city publishes those times.

## Fees (from stick calendar PDF legend)

| Type | Fee |
| --- | --- |
| Youth stick | $8.00 |
| Parent/tot | $8.00 per skater |
| Adult stick | $12.00 |
| Adult stick punch pass | $65.00 (not modeled in session rows) |

## How Rink Radar uses this

The scraper (`scraper/lib/dover-pdf.mjs`) reads each day cell for **Youth stick**, **Parent/tot**, and **Adult stick** lines plus times.

Per-session card pricing in `sessions.generated.json`:

| Subtype | Summary on card |
| --- | --- |
| `youth_stick` | Youth stick $8 |
| `parent_tot` | Parent/tot $8 per skater |
| `adult_stick` | Adult stick $12 |

Expanded details for **youth stick** sessions at Dover also show the full fee line (youth vs parent/tot vs adult) for parents comparing options.

Regenerate data after parser changes:

```bash
cd projects/rink-radar/scraper && npm run scrape
```
