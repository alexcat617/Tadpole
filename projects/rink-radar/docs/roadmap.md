# Roadmap — Rink Radar

## Phase 0 — Discovery (current)

**Goal:** Document product, schema, and pilot rinks for Dover / Seacoast.

| Deliverable | Status |
| --- | --- |
| PRD, requirements, data model | Done (docs) |
| Starter `rinks.json` | Done — needs your URL verification |
| List of adult hockey sources per rink | **You** — see open questions |

**Exit criteria:** You confirm 4–6 rinks + schedule URLs you actually use.

---

## Phase 1 — Manual data + UI shell

**Goal:** Use the app weekly with hand-maintained JSON.

| Task | Notes |
| --- | --- |
| Vite + React (or Astro) static app under `projects/rink-radar/app` | Mobile-first list/detail |
| Read `data/sessions.manual.json` or example file | No scraper yet |
| Location: default 03820 + geolocation | Haversine distance |
| Deploy to GitHub Pages | From `main` or `gh-pages` branch |

**Exit criteria:** You pick public skate vs hockey for **today** and see Dover Arena sessions you typed or copied from PDF.

---

## Phase 2 — First scrapers + CI

**Goal:** Automate your two highest-value rinks.

| Priority | Rink | Likely adapter |
| --- | --- | --- |
| P0 | Dover Arena | `dover-pdf` — discover current month PDF from public skate page |
| P1 | Rochester Arena | `recdesk` — program schedule API/HTML |
| P2 | Rochester Ice Center | Site-specific / RecTimes |

| Task | Notes |
| --- | --- |
| `scripts/scrape.ts` | Outputs `data/sessions.generated.json` |
| GitHub Action cron (Mon/Wed/Fri) | Commit artifact or deploy-only build |
| `data/health.json` | Per-rink last success / error |

**Exit criteria:** 48h without manual edits for P0 rink.

---

## Phase 3 — Adult hockey + polish

- Adapters for drop-in / league pages (Rochester Beacons, Dover adult programs).
- **Rink directory in UI** — “Rinks in search” panel + `health.json` badges (done in app).
- **Bruins schedule companion** — FAB + side drawer from `bruins-schedule.json` (palette only; not NHL-affiliated).
- **Rink profiles (later)** — optional `profile` on rink records: hero image, capacity, amenities, history; link from session accordion (see [data model](./data-model.md)).
- **Share session** — expanded card action (Web Share + copy); done in app (see [PRD](./PRD.md) Flow D).
- Filters: instructional vs recreational; hide league games unless “league” toggle on.
- PWA install, “open in maps”, phone `tel:` links.
- Map view (optional).

---

## Phase 4 — Scale & community

- Template adapter for new RecDesk cities.
- “Report wrong time” → GitHub issue template.
- Optional LLM assist for one-off PDF layouts (human review gate).
