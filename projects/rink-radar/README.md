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
| [Dover public skate](./docs/dover-public-skate.md) | Official fees & session types (Dover Ice Arena) |
| [Dover stick practice](./docs/dover-stick-practice.md) | Youth / parent-tot / adult stick fees & PDF types |
| [Personas](./docs/personas.md) | Primary users for pilot UX decisions |
| [Flow maps](./docs/flows/README.md) | Happy path, error, and recovery specs per feature |
| [User testing feedback](./docs/user-testing-feedback.md) | Pilot tester quotes and status |
| [Scraping policy](./docs/scraping-policy.md) | Fetch rules, attribution |
| [Roadmap](./docs/roadmap.md) | Phases & acceptance criteria |
| [Open questions](./docs/open-questions.md) | Decisions still to make |
| [UX principles](./docs/ux-principles.md) | Usability guardrails (Shneiderman + NN/g) |
| [UI patterns](./docs/ui-patterns.md) | Components, responsive layout, agent checklist |

## Run locally

The UI is a **Vite dev server** — it does not open if you double‑click `index.html`. Start the server first, then open the URL it prints.

```powershell
cd "projects/rink-radar/app"
npm ci
npm run dev
```

Then open **http://127.0.0.1:5173/** (or the `Local:` URL from the terminal). Leave that terminal window open while you test.

From the repo root you can also run:

```powershell
cd projects/rink-radar
npm run dev
```

Optional: refresh session JSON before testing:

```powershell
cd projects/rink-radar/scraper
npm ci
npm run scrape
```

### Troubleshooting

| Symptom | What to do |
| --- | --- |
| Browser says **can’t connect** / blank | Dev server not running — run `npm run dev` in `projects/rink-radar/app` and use the printed URL. |
| Stuck on **Loading…** | Check DevTools → Network: `data/rinks.json` should be **200**. If 404, you may be on the wrong URL or an old build. |
| **GitHub Pages** blank or old UI | Pages deploys from **`main`** via Actions. Merge your branch and wait for the workflow; URL is `https://<user>.github.io/Tadpole/` (note the `/Tadpole/` path). |

Dover monthly PDFs are discovered from the city public-skate and stick-practice HTML pages.

## Live site

Enable GitHub Pages (source: GitHub Actions). URL: `https://<user>.github.io/Tadpole/`
