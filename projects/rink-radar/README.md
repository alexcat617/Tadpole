# Rink Radar

Find **public skates** and **adult hockey** near you without calling every rink or digging through PDF schedules.

**Home base:** Dover, NH 03820 (Seacoast NH / southern ME pilot region).

## Status

| Phase | State |
| --- | --- |
| Discovery & docs | Done |
| Web app + scrapers | MVP |
| GitHub Pages deploy | Via `.github/workflows/rink-radar.yml` |

## Repository layout

```
projects/rink-radar/
├── README.md                 ← you are here
├── docs/                     ← product & engineering specs
├── data/
│   ├── rinks.json            ← curated rink directory (URLs, adapters)
│   └── sessions.example.json ← shape of generated session data
└── design/                   ← wireframes / Figma (optional)
```

## Docs

| Document | Purpose |
| --- | --- |
| [PRD](./docs/PRD.md) | Vision, users, MVP flows |
| [Requirements](./docs/requirements.md) | Functional & non-functional |
| [Data model](./docs/data-model.md) | Rink + session schema |
| [Rink registry](./docs/rink-registry.md) | How to add rinks & adapters |
| [Scraping policy](./docs/scraping-policy.md) | Fetch rules, attribution |
| [Roadmap](./docs/roadmap.md) | Phases & acceptance criteria |
| [Open questions](./docs/open-questions.md) | Decisions still to make |
| [UX principles](./docs/ux-principles.md) | Usability guardrails (Shneiderman + NN/g) |
| [UI patterns](./docs/ui-patterns.md) | Components, responsive layout, agent checklist |

## Run locally

```bash
cd projects/rink-radar/scraper && npm ci && npm run scrape
cd ../app && npm ci && npm run dev
```

Dover monthly PDFs are discovered from the city public-skate and stick-practice HTML pages.

## Live site

Enable GitHub Pages (source: GitHub Actions). URL: `https://<user>.github.io/Tadpole/`
