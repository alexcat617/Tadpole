# Rink Radar — Project Overview & Reference Document

**Product Name:** Rink Radar  
**Live Site:** [seacoastice.com](https://seacoastice.com/)  
**Repository:** `Tadpole` (`projects/rink-radar/`)  
**Deployment:** GitHub Pages via GitHub Actions (deploying from `main`)  
**Pilot Geographic Anchor:** Dover, NH 03820 (Seacoast NH / Southern ME radius ~25–30 min)  
**Primary Stack:** Vite/Vanilla JS frontend, Node.js scrapers, static JSON data storage  

---

## 1. Executive Summary & Vision

**Rink Radar** is a lightweight, mobile-first web app that answers a simple, everyday question:  
> *“Where and when can we get on the ice near Dover today, what does it cost, and can I easily pass those details along to someone else?”*

Rather than replacing rink websites, Rink Radar acts as a **reliable regional companion**. It aggregates fragmented schedules (PDFs, city web pages, RecDesk portals), normalizes ice sessions into scannable cards with transparent pricing and age/session rules, and links every listing back to its official municipal or arena source.

---

## 2. The Problem & Community Context

### The Challenge
* **Fragmented Information:** Rink schedules live across disparate municipal websites, monthly PDF calendars, and separate registration pages.
* **Jargon & Ambiguity:** Sessions like "Instructional Public Skate," "Parent/Tot," "Youth Stick," and "Adult Drop-in" are often mixed into single tables with unclear equipment or age rules.
* **Hidden Costs:** Adult admission prices often hide what a child or resident actually pays.
* **Mobile Friction:** City portals and PDF flyers require pinching, zooming, and hunting on mobile phones.

### The Community Reality
Ice skating in the Seacoast region is a **tight-knit community**:
* Skaters plan together via group chats, SMS, and carpools (“Anyone going to stick tonight?” or “Sunday family skate?”).
* Planning is often done on phones between errands or after work.
* **Coordination need:** Skaters need shareable, bite-sized facts (session type, start/end time, youth cost) to text to family and friends—without needing new accounts, feeds, or walled-garden apps.

---

## 3. User Personas

### Persona 1: Chris — The Hockey Juggler (Primary · Demand Side)
* **Demographics:** Age 42 · Married · Son Leo (9, youth hockey) · Dover, NH
* **Skates:** Often with Leo (youth stick / parent-tot); plays adult stick when schedule allows.
* **Key Goals:**
  * Find the right ice for Leo and himself without decoding PDF color codes.
  * Know per-person pricing ($8 youth stick vs. $12 adult) before driving.
  * See equipment and age rules up front so nobody arrives unprepared.
  * Maximize routine efficiency with multi-day views across busy weeks.
  * Share session details with spouse, carpool, or team parents via one tap.
* **Key Frustrations:**
  * Mixed session types on PDFs; showing up for the wrong session.
  * Pricing that hides youth tiers; simple planning turning into a chore.

### Persona 2: Jordan — The Social Planner (Primary · Demand Side)
* **Demographics:** Age 36 · Partner · Maya (7) & Noah (4) · Rochester, NH (~25 min to Dover)
* **Skates:** Recreational public skate with kids; avoids hockey jargon.
* **Key Goals:**
  * Find recreational public skate that fits family routines (weekends/early evenings).
  * Stay price-conscious (e.g. Dover youth resident $7).
  * Maximize time and efficiency in daily planning on mobile.
  * Coordinate group outings: share time, youth price, and end time with friends.
* **Key Frustrations:**
  * Websites that aren’t mobile-friendly (pinch-and-zoom PDFs).
  * Simple checks that take too long and become chores.

---

## 4. Product Scope & Non-Goals

### In Scope (MVP & Pilot)
1. **Activity Discovery:** Filter by Public Skate vs. Stick & Puck / Adult Hockey.
2. **Date Flexibility:** Default to "Today" with multi-day scanning (Find Ice across upcoming days).
3. **Transparent Pricing & Rules:** Show youth vs. adult rates, resident fees, and equipment requirements.
4. **Focused Rink Filtering:** "My Rinks" toggle to lock into Dover Arena or expand to regional rinks.
5. **Audience-Targeted Programs:** Separate tab/filter for Kids programs (learn-to-skate) vs. Adult leagues.
6. **One-Tap Coordination:** Native OS share sheet payload with exact facts (time, end time, price, rink).
7. **Official Attribution:** Direct link to the official rink schedule on every session accordion.

### Explicit Non-Goals (Out of Scope)
* **No User Accounts:** No logins, passwords, profiles, or stored personal data.
* **No In-App Social Graph:** No friends lists, chat rooms, comments, or activity feeds.
* **No Direct Booking / Payments:** Rink Radar does not sell ice time or process league registrations.
* **No Nationwide Crawl:** Kept strictly regional and verified.

---

## 5. Feature Architecture & Flow Mapping

| Flow ID | Feature Name | Priority | Primary Persona | User Impact |
|---|---|---|---|---|
| **FLOW-00** | Core Discovery | Baseline | Chris, Jordan | Filter by activity and date; view scannable session cards with inline accordions. |
| **FLOW-H** | Search by Date | **P0** | Jordan | Solved mobile empty-date overlay bug; provides touch-friendly date selection. |
| **FLOW-G** | Rink Filter ("My Rinks") | **P1** | Jordan, Chris | Quick toggle for "Just Dover Ice Arena" without clutter from other venues. |
| **FLOW-F** | Find Ice (Next 5 Days) | **P1** | Chris, Jordan | Shows upcoming days (Today, Tomorrow, etc.) so users don't have to search one date at a time. |
| **FLOW-I** | Programs by Audience | **P1** | Jordan, Chris | Segment multi-week arena programs into **Kids** vs. **Adult** vs. **All**. |
| **FLOW-E** | Schedules Companion | **P2** | Chris | Dedicated drawer for UNH Wildcats and Bruins game nights alongside rink ice. |
| **FLOW-D** | Share Session | Phase 3 | Chris, Jordan | Formats clean text for SMS/WhatsApp: session name, date/time, youth fee, and end time. |

---

## 6. Technical Architecture & Data Pipeline

```
┌────────────────────────┐      ┌─────────────────────────┐      ┌───────────────────────┐
│     Municipal PDFs     │      │   Scheduled Scraper     │      │      Static Data      │
│  (Dover Arena, etc.)   │ ───► │    (Node.js / CI)       │ ───► │ `data/sessions.json`  │
│   Web / RecDesk APIs   │      │ runs 3x/wk via Actions  │      │   `data/rinks.json`   │
└────────────────────────┘      └─────────────────────────┘      └──────────┬────────────┘
                                                                            │
                                                                            ▼
┌────────────────────────┐      ┌─────────────────────────┐      ┌───────────────────────┐
│  End User Experience   │      │      GitHub Pages       │      │     Vite Web App      │
│  (Mobile Browser /     │ ◄─── │    (seacoastice.com)    │ ◄─── │ `projects/rink-radar/ │
│   OS Share Sheet)      │      │  Deploys from `main`    │      │         app/`         │
└────────────────────────┘      └─────────────────────────┘      └───────────────────────┘
```

### Key Technical Patterns
* **Frontend:** Static, zero-heavy-framework client built with Vite in `projects/rink-radar/app/`. Highly optimized for instant loading on cellular networks.
* **Scraper Engine:** Modular TypeScript/Node scrapers in `projects/rink-radar/scraper/` parsing PDF schedules and HTML tables into normalized JSON.
* **Data Schema:** 
  * `rinks.json`: Canonical venue data (coordinates, address, homepage, scrapers).
  * `sessions.json`: Normalized slots with `activity_type`, `subtype`, `start_time`, `end_time`, `price`, `source_url`.
* **CI/CD:** Automated GitHub Actions run scrapers on a cron schedule and push static builds to GitHub Pages.

---

## 7. UX & Design System Principles

* **Nielsen Norman & Shneiderman Guardrails:**
  * **Recognition over Recall:** Prominent venue badges, session subtypes, and prices on collapsed cards; secondary details in inline accordions.
  * **User Control & Freedom:** Explicit search and clear actions; no jarring auto-submits or unexpected page reloads.
  * **Consistency:** Gold-accented primary actions ("Find Ice"), distinct blue for "Share", and unified card anatomy.
* **Accessibility (WCAG 2.2 AA):**
  * Touch targets $\ge 44 \times 44\text{px}$.
  * Explicit contrast styling (ensuring legibility in high-glare outdoor/rink conditions).
  * Semantic HTML with dynamic `aria-live` regions and proper `aria-expanded` states.

---

## 8. Project Roadmap

* **Phase 0 (Discovery & Research):** PRD, requirements, personas, Dover public/stick fee analysis — *(Completed)*
* **Phase 1 (Manual Data & UI Shell):** Vite app, mobile-first cards, local distance filtering — *(Completed)*
* **Phase 2 (Automated Ingestion & CI):** Dover PDF scraper, GitHub Actions deploy, domain setup (`seacoastice.com`) — *(Completed)*
* **Phase 3 (Experience Elevation):** 
  * Flow H, G, F, I implementations from pilot user testing — *(Current/Completed)*
  * Native OS session sharing — *(Completed)*
  * Adult programs & schedules drawer (Bruins/UNH) — *(In Progress/Active)*

---

## 9. Key Documentation Directory

* **Product Requirements:** `projects/rink-radar/docs/PRD.md` & `requirements.md`
* **User Research & Personas:** `projects/rink-radar/docs/personas.md`
* **Tester Feedback Log:** `projects/rink-radar/docs/user-testing-feedback.md`
* **Flow Specifications:** `projects/rink-radar/docs/flows/`
* **Design & UX Principles:** `projects/rink-radar/docs/ux-principles.md` & `ui-patterns.md`
* **Rink Directory & Rules:** `projects/rink-radar/docs/rink-registry.md`
