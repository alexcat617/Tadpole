# Companion schedule intake

Backlog of **game schedules** for the **Schedules** drawer (Flow E). These are **not** local rink public-skate sessions — those belong in `[rink-registry.md](./rink-registry.md)` and `sessions.generated.json`.

**Implementation path (each row):** scraper module → `data/*-schedule.json` → copy to `app/public/data/` → drawer tab in `App.tsx`. See [Flow E](./flows/flow-e-schedules-companion.md), `[data-model.md](./data-model.md)`, `[scraping-policy.md](./scraping-policy.md)`.

## How to use

Add a row (or paste a URL in **Notes** and fill the rest later). Set **Status** to `idea` until someone picks it up.


| Status | Label (UI tab)       | Official schedule URL                                                                              | Source type                      | Notes                                                                                 |
| ------ | -------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------- |
| live   | Bruins               | [NHL Bruins schedule](https://www.nhl.com/bruins/schedule)                                         | NHL public schedule API          | `bruins-schedule.mjs`                                                                 |
| live   | UNH Wildcats         | [UNH men's hockey schedule](https://unhwildcats.com/sports/mens-ice-hockey/schedule)               | Sidearm NextGen HTML (text view) | `wildcats-schedule.mjs`                                                               |
| live   | Dover Varsity        | [Boys](https://arbiterlive.com/Teams/Schedule/8855637?activeEntityId=6087) · [Girls](https://arbiterlive.com/Teams/Schedule/11761173?activeEntityId=6087) | Arbiter Live (web) | `dover-varsity-schedule.mjs`; one drawer tab, boys + girls sections |




## Status values


| Status      | Meaning                                         |
| ----------- | ----------------------------------------------- |
| idea        | Link captured; not scoped or built              |
| researching | Source type, legal, and JSON shape under review |
| in dev      | Scraper + UI in progress                        |
| live        | Shipped in Schedules drawer                     |


