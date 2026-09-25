# Product requirements — Rink Radar

## Problem

Seacoast-area skaters who want **public ice** or **adult hockey** today must visit many rink websites, open monthly PDFs, or call front desks. Schedules differ by venue, naming is inconsistent, and prices are easy to miss. People also **relay times informally** (texts, group chats), which spreads wrong days, fees, or session types.

## Vision

1. **One place to answer:** “What can I do on ice near Dover today?” — with times, approximate cost, distance, and a link to the official schedule.
2. **Help skaters pass that answer on** — shareable session facts tied to official sources — for a **small, tight regional community** of individuals (not a platform social graph).

## Primary user

- Recreational skater / pickup hockey player in **Dover, NH (03820)** and typical drive radius (~25–30 minutes).
- Uses phone browser; may add to home screen later (PWA).
- Values accuracy over completeness; will tap through to the rink site to confirm.
- Often plans **with others** (family, carpool, friends); the OS share sheet is a natural way to coordinate.

## Goals (MVP)

1. Filter by **activity** (public skate vs adult hockey) and **date** (default: today).
2. Show sessions from a **curated regional rink list** with provenance (source URL, last updated).
3. Sort by **start time** or **distance** from saved location (03820 default).

## Goals (post-MVP / Phase 3)

- **Share session** from expanded card (Web Share API + copy fallback).

## Non-goals (MVP)

- Ice rental booking, league registration, learn-to-skate enrollment.
- Youth program discovery (document for later).
- Nationwide rink search or generic web crawl.
- User accounts, in-app messaging, follower feeds, or user-generated schedule edits.

**Clarification:** **Share / copy session details** via the OS share sheet is **coordination**, not “social features” in the feed/profile sense. **Add to calendar** is not a current product goal.

## MVP user flows

### Flow A — Public skate today

1. Open app → location defaults to Dover 03820 (or browser geolocation).
2. Select **Public skate** (includes paid public sessions; see [open questions](./open-questions.md)).
3. See list: rink, time, price hint, distance, session subtype (recreational vs instructional).
4. Tap row → detail with address, phone, map link, official schedule link, disclaimer.

### Flow B — Adult hockey today

1. Same location step.
2. Select **Adult hockey** (shinny, drop-in, stick & puck, league skates — normalized labels).
3. List + detail as above; clearly distinguish **drop-in** vs **registered league** when known.

### Flow C — Empty / errors

- No sessions: suggest wider radius, tomorrow, or open rink registry links.
- Stale data: show `last_fetched_at` prominently.

### Flow D — Share a session (Phase 3)

1. User expands a session row → **Share session**.
2. System share sheet or copied text: activity, rink, local date/time, and price if known (no official schedule URL in the payload).
3. Recipient uses the facts to plan; they can confirm with the rink on their own. No Rink Radar account required. Official sources remain in expanded session details in the app.

## Success metrics (personal / MVP)

- You use the app instead of calling for **Dover Arena** + **3 other rinks** for one week.
- Adding a new rink takes &lt; 2 hours once adapter patterns exist.
- Parse failures surface within 24h of a site change (CI or manual check).

## Pilot geography

**Anchor:** Dover, NH 03820 (43.1979° N, 70.8737° W).

**Initial radius:** ~30 km — Dover, Rochester, Somersworth, Portsmouth, Exeter, Durham, Sanford ME, Berwick ME, etc. Exact list in [`data/rinks.json`](../data/rinks.json).

## Content disclaimer (product copy)

> Schedules change. Always confirm with the rink before you go. Rink Radar links to official sources and is not affiliated with any facility.

Share payloads are session facts only (type, rink, time, price). Official `source_url` stays in expanded session details in the app, not in shared text.
