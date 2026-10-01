# Custom domain — seacoastice.com

**Canonical live URL:** https://seacoastice.com/

Deploys still run from **`main`** via [`.github/workflows/rink-radar.yml`](../../.github/workflows/rink-radar.yml) (GitHub Pages). Merging a PR to `main` updates the same site your domain points at.

## In this repo (already configured)

| Item | Purpose |
| --- | --- |
| `app/public/CNAME` | Contains `seacoastice.com`; copied into each production build so Pages keeps the domain mapping. |
| Workflow `VITE_BASE_PATH: /` | Assets and data load from the site root (required for apex custom domain, not `/Tadpole/`). |

## On GitHub (one-time)

1. Repo **Settings → Pages → Custom domain** → enter **`seacoastice.com`**
2. Wait for DNS check → enable **Enforce HTTPS**

## At your registrar (one-time)

**Apex** `seacoastice.com` — four **A** records:

- `185.199.108.153`
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

**Optional www** — if you use `www.seacoastice.com`, add **CNAME** `www` → `alexcat617.github.io` and set redirect in GitHub/DNS to your preferred host.

Do **not** CNAME `www` → `seacoastice.com` alone unless apex already has the A records above.

## After merge to main

1. Rink Radar workflow completes successfully.
2. Hard refresh or incognito on https://seacoastice.com/
3. `https://alexcat617.github.io/Tadpole/` may no longer work correctly (build is root-based); share **seacoastice.com** publicly.
