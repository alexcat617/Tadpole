# Rink Radar

Find **public skates** and **adult hockey** near you without calling every rink or digging through PDF schedules.

**Home base:** Dover, NH 03820 (Seacoast NH / southern ME pilot region).

## Status

| Phase | State |
| --- | --- |
| Discovery & docs | In progress |
| Manual `sessions.json` + UI | Not started |
| Scrapers + GitHub Actions | Not started |

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

## Run locally (future)

Once the app scaffold exists:

```bash
cd projects/rink-radar/app   # TBD
npm install && npm run dev
```

## Live site (future)

GitHub Pages / Cloudflare Pages URL will be linked here after first deploy.
