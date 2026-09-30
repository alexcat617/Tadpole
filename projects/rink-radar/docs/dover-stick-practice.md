# Dover Ice Arena — stick practice

Official schedule and fee source: [Stick Practice (City of Dover)](http://dover.nh.gov/government/city-operations/recreation/arena/stick-practice/)

Times are posted in **monthly PDFs** linked from that page. The scraper merges the **two newest distinct months** on the stick-practice page (same as public skate). Schedules change — call **603-516-6060** to confirm before you go.

Dover uses **“stick practice”** session names on the calendar (e.g. **Adult stick**, **Youth stick**, **Parent/tot**). Other rinks may say “stick & puck” or “skate & shoot”; Rink Radar groups these under the **Stick & puck** activity tab.

## Session types on the stick calendar

| Calendar label | Who it’s for | Rink Radar subtype |
| --- | --- | --- |
| **Youth stick** | Grade 8 and below (as of season start); full equipment; no parents on ice; cap 20 skaters / 2 goalies | `youth_stick` |
| **Parent/tot** | Children 10 and under with a parent; recreational hockey (not team practice); full equipment for kids, helmet for parents | `parent_tot` |
| **Adult stick** | 18+; helmets required; cap 20 skaters / 2 goalies | `adult_stick` |

Not every month lists all three types on the grid. If a type is missing from the PDF for that month, it will not appear in scraped data until the city publishes those times.

## Fees (from stick calendar PDF legend)

Fees are read from each PDF’s colored legend (**YOUTH –ORANGE**, **PARENT/TOT –RED**, **ADULT-BLUE**). They can change month to month (e.g. October 2026 lists **$6 / $6 / $10** where September listed **$8 / $8 / $12**). Punch passes on the PDF are not modeled on session rows.

## How Rink Radar uses this

The scraper (`scraper/lib/dover-pdf.mjs`) reads each day cell for **Youth stick**, **Parent/tot**, and **Adult stick** lines plus times. The monthly grid often abbreviates **Adult stick** as **ADULT** (time on the next line). Parent/tot times may appear as **`9-1020a`** (hour without a colon on the end time). **`parseDoverStickFees`** sets per-session `price` and `stick_fee_legend` from that PDF’s legend (fallback: $8 / $8 / $12 if the legend is missing).

Expanded session details at Dover show **`stick_fee_legend`** for the calendar month tied to that session’s PDF.

Regenerate data after parser changes:

```bash
cd projects/rink-radar/scraper && npm run scrape
```
