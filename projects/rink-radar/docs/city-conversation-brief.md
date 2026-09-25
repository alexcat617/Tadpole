# Rink Radar — one-page brief (city conversation)

**What it is:** A free, mobile-friendly web app that helps Seacoast residents find **public ice** and **adult hockey** sessions at nearby rinks—starting with **Dover Ice Arena** and a short list of regional facilities.

**Live pilot:** https://alexcat617.github.io/Tadpole/  
**Maintainer:** Independent community project (not a city system, not a booking vendor).

---

## The problem

People who want to skate or play pickup hockey today often have to:

- Open several rink websites or **monthly PDF calendars**
- Guess which session type they need (public skate vs stick & puck vs youth stick)
- Compare **fees** and drive times on their own
- Text friends wrong times after misreading a schedule

That friction hits families, adult players, and newcomers especially hard in a region where each arena posts schedules differently.

---

## Who it’s for

- **Recreational skaters** and **adult hockey** players around **Dover, NH (03820)** and roughly a **25–30 minute drive** (Rochester, Durham, Somersworth, and similar).
- People who plan in **text threads and carpools** and want accurate times to share—not another social network or login.

---

## What the app does (today)

| Feature | User benefit |
| -------- | ------------- |
| **Find Ice** | Shows upcoming public skate or stick & puck across the next few days for rinks the user selects. |
| **Search by date** | Pick a specific day when planning ahead. |
| **Rinks** | Turn rinks on/off (e.g. Dover only) within the pilot region. |
| **Session details** | Time, rink name, fee summary when known, phone, link to **official schedule** on the city or rink site. |
| **Share** | Copy or share session facts (type, rink, time, price)—recipients confirm with the facility. |
| **Programs** | Curated pointers to learn-to-skate and adult programs (links out for registration). |
| **Game schedules** | Optional Bruins / UNH companion drawer—separate from public ice at local rinks. |

**Data approach:** Rink Radar reads **public** schedule pages the city already publishes (for Dover, the **public skate** and **stick practice** HTML pages and linked PDFs). It refreshes on a **daily** automated check and always points users to the **official source** to confirm before they travel.

**Disclaimer shown in the app:** *Schedules change. Always confirm with the rink before you go.*

---

## What it is not

- Not ice rental, league registration, or payment processing  
- Not a replacement for Dover Recreation’s website or front desk (**603-516-6060**)  
- Not affiliated with the City of Dover, Dover Ice Arena, or any rink operator  
- Not scraping private or login-only systems—only public information meant for residents  

---

## Why talk with the city

Dover Ice Arena is the **anchor** of the pilot. Reliable public schedules help residents; Rink Radar aims to **amplify** what Recreation already posts—not compete with it.

**Helpful from the city (optional):**

- Heads-up when **new monthly PDFs** go live (public skate / stick practice)  
- Correction if session names or fees in the app misread a PDF  
- Whether linking to Rink Radar from a recreation page would be useful (city’s call)

**No access keys, contracts, or data sharing are required** for the current pilot—it uses the same public pages skaters already use.

---

## Contact / technical note

Schedule ingestion is documented in the project repo (`Tadpole` / `projects/rink-radar`). User-Agent identifies the fetcher; traffic is low (about once per day per source). Questions about accuracy should go through whoever maintains Rink Radar for the pilot.
