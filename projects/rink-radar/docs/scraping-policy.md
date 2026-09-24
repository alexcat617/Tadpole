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
- Cache aggressively; schedules are monthly or weekly, not per-second.

## NHL public schedule API (Bruins companion)

- One request per scrape run to `api-web.nhle.com` for BOS club schedule (season slug in scraper).
- Same User-Agent and timeout defaults; on failure, **retain last good** `bruins-schedule.json`.
- `tv_networks` on each game is derived from NHL `tvBroadcasts` (NESN normalized to `NESN`, plus US national feeds); simplified labels, not blackout or rights advice.
- Drawer footer links to the official Bruins schedule; not a substitute for NHL apps or tickets.

## Third-party platforms (RecDesk, league sites)

- Prefer stable program URLs over authenticated areas.
- League schedules (e.g. adult league game nights) may be **league property** — attribute the league in UI.

## Errors

| Situation | Action |
| --- | --- |
| HTTP 4xx/5xx | Log, keep last good `sessions.generated.json`, set health flag |
| Parse 0 sessions unexpectedly | Alert maintainer; do not publish empty overwrite without review |
| CAPTCHA / bot block | Pause adapter; fall back to manual entry |

## Disclaimer (shown in app)

Schedules are subject to change. Rink Radar is not responsible for cancellations, sold-out public skates, or price changes. Call the rink when in doubt.
