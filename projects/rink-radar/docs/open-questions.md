# Open questions

Decisions that affect MVP scope. Update this file as you decide.

## Product

| # | Question | Default for now | Your decision |
| --- | --- | --- | --- |
| Q1 | Does **“public skate”** include paid sessions (~$7–$12)? | **Yes** — label “Public skate (paid)” vs free events | |
| Q2 | Include **instructional** public skate (Dover allows skills practice, no sticks)? | **Yes**, with subtype badge | |
| Q3 | **Adult hockey** — drop-in/shinny only, or include **league game nights** you could spectate/sub? | Show both; tag `drop_in` vs `league` | |
| Q4 | Max drive time / radius from 03820? | **25 km** default, 40 km extended | |
| Q5 | Maine rinks (Sanford, York) in v1? | In registry as `pilot`; scrape after NH rinks | |

## Data (need your local knowledge)

| # | Question | Action |
| --- | --- | --- |
| Q6 | Which rinks do you visit most? | Edit `data/rinks.json` — set others to `paused` or delete |
| Q7 | Where do you find **adult drop-in** (not league)? | Add URL to `schedule_sources` + note in registry |
| Q8 | Any rinks phone-only for schedule? | Set `adapter: "manual"` until you have a URL |
| Q9 | Stick & puck / skate & shoot in MVP? | Default **no** — phase 3 unless you want it |

## Technical

| # | Question | Notes |
| --- | --- | --- |
| Q10 | GitHub repo visibility | Public repo = public Pages site (fine for schedules) |
| Q11 | Contact email in User-Agent | Add when scrapers go live ([scraping policy](./scraping-policy.md)) |

## Resolved

_None yet._
