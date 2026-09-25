# Data model — Rink Radar

All times are stored in **ISO 8601** with offset (e.g. `2026-09-24T13:30:00-04:00`). Display in `America/New_York` unless rink specifies otherwise.

## `rinks.json` — Rink

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes | Stable slug, e.g. `dover-arena` |
| `name` | string | yes | Display name |
| `address` | string | yes | Street address |
| `city` | string | yes | |
| `region` | string | yes | US state or province code |
| `postal_code` | string | yes | |
| `country` | string | yes | `US` or `CA` |
| `lat` | number | yes | WGS84 |
| `lng` | number | yes | WGS84 |
| `timezone` | string | yes | IANA, e.g. `America/New_York` |
| `phone` | string | no | E.164 or local format |
| `website` | string | yes | Homepage |
| `schedule_sources` | array | yes | See below |
| `adapter` | string | yes | Scraper key, e.g. `dover-pdf`, `recdesk` |
| `status` | enum | yes | `active`, `pilot`, `paused` |
| `operations` | object | no | Curated facility status for UI, e.g. `{ "status": "closed_for_season" }` — overrides feed badge in **Rinks in search** |
| `notes` | string | no | Maintainer notes |
| `profile` | object | no | Optional curated profile (see [Rink profile](#rink-profile-optional)) |

### `schedule_sources[]`

| Field | Type | Description |
| --- | --- | --- |
| `url` | string | Page or PDF URL |
| `kind` | enum | `html`, `pdf`, `ics`, `api`, `recdesk` |
| `activity_hints` | string[] | Which activities this URL covers |

## `health.json` — Scraper health (optional client fetch)

| Field | Type | Description |
| --- | --- | --- |
| `generated_at` | string | ISO datetime of last scrape |
| `rinks` | object | Keys = rink `id` |
| `rinks[id].ok` | boolean | Scraper succeeded |
| `rinks[id].session_count` | number | Sessions written for that rink |
| `rinks[id].error` | string | Present when `ok` is false |

Copied to `app/public/data/health.json` on each scrape for the **Rinks in search** panel.

## `bruins-schedule.json` — Bruins NHL schedule (companion)

Fetched from NHL’s public schedule API during scrape; copied to `app/public/data/bruins-schedule.json`. Not rink session data.

| Field | Type | Description |
| --- | --- | --- |
| `season_label` | string | Display, e.g. `2026–27` |
| `season_slug` | string | API season id, e.g. `20262027` |
| `generated_at` | string | ISO datetime of last fetch |
| `source_url` | string | Official Bruins schedule page |
| `games` | array | Full season list |
| `games[].id` | string | NHL game id |
| `games[].starts_at` | string | ISO in `America/New_York` |
| `games[].opponent_abbr` | string | e.g. `TOR` |
| `games[].opponent_name` | string | Display name |
| `games[].is_home` | boolean | BOS home vs away |
| `games[].venue` | string | Arena name |
| `games[].game_state` | string | e.g. `FUT`, `FINAL` |
| `games[].tv_networks` | string[] | Curated US TV labels (e.g. `NESN`, `TNT`, `NHL Network`); may be empty |

See [`data/bruins-schedule.example.json`](../data/bruins-schedule.example.json).

## `wildcats-schedule.json` — UNH Wildcats companion

Same **`games[]` shape** as Bruins companion. Optional `team_label` for drawer heading. Fetched in scrape from UNH’s [text schedule](https://unhwildcats.com/sports/mens-ice-hockey/schedule/text) HTML table (Sidearm NextGen SSR); retains last good file on failure. Copied to `app/public/data/wildcats-schedule.json`.

## `programs.json` — Arena programs (editorial)

Multi-week leagues and drop-in **programs** (not day-by-day scrape rows). Copied to `app/public/data/programs.json`. Maintained manually from rink program pages.

| Field | Type | Description |
| --- | --- | --- |
| `generated_at` | string | ISO when file last edited |
| `source_url` | string | Canonical listings page |
| `programs` | array | Program entries |

Each program: `id`, `rink_id`, `title`, `kind` (`drop_in`, `league`, `skills`), optional `audience` (`youth`, `adult`, `family`; defaults to `adult`), `description`, `offerings[]` …

See [`data/programs.example.json`](../data/programs.example.json).

## Rink profile (optional)

Curated content for future profile pages; not used by scrapers. May live inline on the rink object or in `data/rinks/{id}.profile.json`.

| Field | Type | Description |
| --- | --- | --- |
| `tagline` | string | One-line summary for UI |
| `hero_image` | string | URL or site-relative path, e.g. `/rinks/dover-arena.jpg` |
| `gallery` | string[] | Additional image URLs |
| `sheets` | number | Ice sheets (e.g. `1`) |
| `capacity` | number | Approximate spectator capacity |
| `amenities` | string[] | e.g. `Skate rental`, `Pro shop` |
| `public_description` | string | Visitor-facing description (plain text or markdown) |
| `history` | string | Short history blurb (markdown) |
| `profile_updated_at` | string | ISO date when editorial content last changed |

Sessions and `schedule_sources` remain the source of truth for **times**; profile fields are editorial only.

## `sessions.generated.json` — Session list

Top-level:

```json
{
  "generated_at": "2026-09-24T12:00:00-04:00",
  "region_label": "Seacoast NH (Dover pilot)",
  "sessions": []
}
```

### Session object

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes | Hash or slug: `dover-arena-2026-09-24T1330-public` |
| `rink_id` | string | yes | FK to rink |
| `activity` | enum | yes | `public_skate`, `adult_hockey`, `stick_puck`, `other` |
| `subtype` | string | no | e.g. `recreational`, `instructional`, `rock_night`, `adult_stick`, `youth_stick`, `parent_tot`, `drop_in`, `league` |
| `starts_at` | string | yes | ISO datetime |
| `ends_at` | string | yes | ISO datetime |
| `price` | object | no | See below |
| `raw_label` | string | no | Text from schedule |
| `source_url` | string | yes | Where this row was parsed |
| `fetched_at` | string | yes | ISO datetime |
| `confidence` | enum | no | `high`, `medium`, `low` (parser certainty) |

### `price` object

| Field | Type | Description |
| --- | --- | --- |
| `summary` | string | Human text, e.g. `Dover resident adult $9 / youth $7` (see [Dover public skate](./dover-public-skate.md)) |
| `amount_cents` | number | Nullable; single representative adult price |
| `currency` | string | `USD` |
| `is_free` | boolean | True only if admission is $0 for typical adult |

## Activity normalization

| `activity` | Include when rink says… |
| --- | --- |
| `public_skate` | Public skate, recreational PS, instructional PS, family skate, homeschool skate |
| `adult_hockey` | Adult shinny, drop-in, 18+ hockey, pick-up, adult league **games** (tag `subtype: league`) |
| `stick_puck` | Stick & puck, skate & shoot |
| `other` | Everything else (hidden from MVP filters) |

## Distance calculation (client)

Haversine from user `(lat, lng)` to rink `(lat, lng)`; round to 0.1 km for display.

## Example

See [`data/sessions.example.json`](../data/sessions.example.json).
