# Scraping & fetch policy

Rink Radar reads **public** schedule pages to reduce friction for skaters. This document guides implementers and sets expectations.

## Principles

1. **Link, don’t replace** — Always show the official source URL; users confirm before traveling.
2. **Polite traffic** — Low frequency (batch job), identifiable User-Agent, backoff on errors.
3. **Minimal retention** — Store only parsed session rows + fetch metadata, not full page archives (unless debugging locally).
4. **Fix adapters, don’t hammer** — If a site changes, pause the rink (`status: paused`) until fixed.

## Technical defaults (when scrapers exist)

| Setting | Value |
| --- | --- |
| User-Agent | `RinkRadar/1.0 (+https://github.com/YOUR_USER/Tadpole; contact: YOUR_EMAIL)` |
| Concurrent requests | Max 2 per domain |
| Interval between requests | ≥ 2 seconds same host |
| Timeout | 30s per request |
| Retries | 2 with exponential backoff |
| PDFs | Download only schedule PDFs linked from official rink/city pages |

## robots.txt

Before adding a rink adapter, check `robots.txt` for the host. If schedules are disallowed for automated access, use **manual JSON** or ask the rink for a feed / ICS.

## Municipal sites (Dover, Rochester)

City recreation pages are intended for public information. Still:

- Do not scrape unrelated citizen services.
- Cache aggressively; schedules are monthly or weekly, not per-second. **Rink Radar** runs a **daily** GitHub Actions scrape (~12:00 UTC) plus deploys on `main` pushes.

## NHL public schedule API (Bruins companion)

- One request per scrape run to `api-web.nhle.com` for BOS club schedule (season slug in scraper).
- Same User-Agent and timeout defaults; on failure, **retain last good** `bruins-schedule.json`.
- `tv_networks` on each game is derived from NHL `tvBroadcasts` (NESN normalized to `NESN`, plus US national feeds); simplified labels, not blackout or rights advice.
- **`programs.json`** is manually curated from rink program pages (e.g. Dover adult leagues); attribute the facility/league in UI and link out for registration.
- Drawer footer links to the official Bruins schedule; not a substitute for NHL apps or tickets.

## Third-party platforms (RecDesk, league sites)

- Prefer stable program URLs over authenticated areas.
- League schedules (e.g. adult league game nights) may be **league property** — attribute the league in UI.

## Arbiter Live — Dover HS varsity (companion)

- **Sources:** Public boys and girls team schedule pages on `arbiterlive.com` (URLs in [companion-schedule-intake.md](./companion-schedule-intake.md)).
- **Frequency:** Two HTML fetches per daily scrape, **≥ 2 seconds** apart; same User-Agent and timeout defaults as other companions.
- **robots.txt:** Arbiter publishes `Disallow: /` for all crawlers. For the **Dover pilot**, Rink Radar still fetches these **public, link-out schedule pages** once per day with an identifiable UA and prominent official links in the drawer—not a substitute for Arbiter or school apps. Revisit manual JSON if the host objects.
- **TLS:** Node may require relaxed certificate verify for this host (same approach as UNH Sidearm); logged once per run.
- On failure, **retain last good** `dover-varsity-schedule.json`. UI: NHIAA / Dover School District disclaimer; separate boys and girls footer links.

## Errors

| Situation | Action |
| --- | --- |
| HTTP 4xx/5xx | Log, **retain last good sessions for that rink** in `sessions.generated.json`, set health flag |
| Parse 0 sessions unexpectedly | Retain that rink’s previous sessions when any existed; set health `retained_previous` / `warning` |
| CAPTCHA / bot block | Pause adapter; fall back to manual entry |

## Disclaimer (shown in app)

Schedules are subject to change. Rink Radar is not responsible for cancellations, sold-out public skates, or price changes. Call the rink when in doubt.
