# Dover Ice Arena — public skate

Official schedule and fee source: [Public Skate (City of Dover)](http://dover.nh.gov/government/city-operations/recreation/arena/public-skate/)

Times are posted in **monthly PDFs** linked from that page. Schedules change — call **603-516-6060** to confirm before you go.

## Session types on the schedule

| Type | Meaning |
| --- | --- |
| **Instructional public skate** | Skills practice; no sticks or pucks. Not a learn-to-skate program. |
| **Recreational public skate** | Exercise / fun skate to music; no lessons, figure moves, or hockey sticks. |

Rink Radar tags these as `instructional` and `recreational` subtypes on public skate sessions.

## Admission fees (from city site)

Prices below are **per the city public skate page** as of documentation; verify on the site before relying on them.

### Dover residents

| Category | Ages | Fee |
| --- | --- | --- |
| Adult | 18–61 | $9.00 |
| Youth | 4–17 | $7.00 |
| Senior | 62+ | $7.00 |
| Tot | 3 and under | Free |
| Skate rental | — | $5.00 |

### Non-Dover residents

| Category | Ages | Fee |
| --- | --- | --- |
| Adult | 18–61 | $12.00 |
| Youth | 4–17 | $9.00 |
| Senior | 62+ | $9.00 |
| Tot | 3 and under | Free |
| Skate rental | — | $5.00 |

## How Rink Radar uses this

The product anchor is **Dover, NH 03820**, so scraped Dover public skate sessions use **Dover resident** pricing in `sessions.generated.json`:

- Summary text: `Dover resident adult $9 / youth $7`
- Representative adult amount: `amount_cents: 900`

Stick & puck / stick practice fees are documented in [Dover stick practice](./dover-stick-practice.md) and applied per subtype in `scraper/scrape.mjs` (`DOVER_STICK_PRICE_BY_SUBTYPE`).

To change pricing assumptions (e.g. show non-resident rates), update the scraper defaults and regenerate data with `npm run scrape` in `projects/rink-radar/scraper`.
