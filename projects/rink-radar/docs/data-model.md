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
| `notes` | string | no | Maintainer notes |

### `schedule_sources[]`

| Field | Type | Description |
| --- | --- | --- |
| `url` | string | Page or PDF URL |
| `kind` | enum | `html`, `pdf`, `ics`, `api`, `recdesk` |
| `activity_hints` | string[] | Which activities this URL covers |

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
| `subtype` | string | no | e.g. `recreational`, `instructional`, `rock_night`, `drop_in`, `league` |
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
| `summary` | string | Human text: “$9 adult (Dover resident)” |
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
