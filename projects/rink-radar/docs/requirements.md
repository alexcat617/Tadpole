# Requirements — Rink Radar

## Functional

### FR-1 Location

| ID | Requirement |
| --- | --- |
| FR-1.1 | Default search center: ZIP **03820** (Dover, NH). |
| FR-1.2 | Optional browser geolocation with fallback to ZIP. |
| FR-1.3 | Persist last-used location in `localStorage` (no account). |
| FR-1.4 | Filter sessions by max radius: 15 / 25 / 40 km (configurable). |

### FR-2 Activity & date

| ID | Requirement |
| --- | --- |
| FR-2.1 | Activity filter: `public_skate`, `adult_hockey` (MVP). |
| FR-2.2 | Date picker defaulting to **today** in America/New_York. |
| FR-2.3 | Optional “tomorrow” quick toggle (phase 1.1). |
| FR-2.4 | Sub-filters (phase 2): recreational vs instructional public skate; drop-in vs league hockey. |

### FR-3 Session list

| ID | Requirement |
| --- | --- |
| FR-3.1 | Each row: rink name, start–end time, normalized type, price summary, distance. |
| FR-3.2 | Sort: soonest start (default), distance, price. |
| FR-3.3 | Hide sessions that ended more than 30 minutes ago (local rink timezone). |
| FR-3.4 | Badge when session is **free admission** vs paid public skate. |

### FR-4 Session detail

| ID | Requirement |
| --- | --- |
| FR-4.1 | Full address, phone, link to rink homepage. |
| FR-4.2 | **Source URL** (schedule page or PDF) used for this session. |
| FR-4.3 | `last_fetched_at` / `last_verified_at` timestamps. |
| FR-4.4 | Original rink label (e.g. “Rock Night”, “Instructional PS”). |
| FR-4.5 | Notes: sticks/pucks allowed, helmet policy, age rules when known. |

### FR-5 Data pipeline

| ID | Requirement |
| --- | --- |
| FR-5.1 | Canonical rink list: [`data/rinks.json`](../data/rinks.json). |
| FR-5.2 | Published sessions artifact: `data/sessions.generated.json` (generated, not hand-edited). |
| FR-5.3 | Scheduled refresh: at least **3× per week** for pilot rinks (GitHub Actions). |
| FR-5.4 | On adapter failure: keep last good data; flag rink in `data/health.json` (future). |
| FR-5.5 | Manual override path: `data/sessions.manual.json` merged for emergencies (optional). |

### FR-6 Admin (maintainer)

| ID | Requirement |
| --- | --- |
| FR-6.1 | Documented process to add rink ([rink-registry](./rink-registry.md)). |
| FR-6.2 | CLI or script: `npm run scrape -- --rink dover-arena` (future). |
| FR-6.3 | Review queue not required for MVP if dataset is small and you spot-check. |

## Non-functional

| ID | Category | Requirement |
| --- | --- | --- |
| NFR-1 | Accuracy | Prefer omitting a session over showing a wrong time. |
| NFR-2 | Performance | First contentful paint &lt; 2s on 4G; data file &lt; 500 KB for pilot. |
| NFR-3 | Availability | Static hosting; no runtime dependency on scraper for reads. |
| NFR-4 | Accessibility | WCAG 2.2 AA target for list/detail (semantic list, focus order, contrast). |
| NFR-5 | Privacy | No PII collection; no analytics required for MVP. |
| NFR-6 | Maintainability | One adapter module per rink or per platform (RecDesk, PDF calendar, etc.). |
| NFR-7 | Legal | Polite fetch rate; respect robots.txt; link out; no full PDF republication in UI. |

## Acceptance criteria (MVP release)

- [ ] At least **4 pilot rinks** in registry with verified schedule URLs.
- [ ] UI shows public skates for **today** for Dover Arena from real data (scraped or manual JSON).
- [ ] At least **1 adult hockey** source represented (drop-in or league schedule).
- [ ] Every displayed session has a working **source URL**.
- [ ] README documents how to run scraper locally and deploy static site.
