# UI patterns — Rink Radar

Concrete layout and component rules for the web app (`app/`). Pair with [UX principles](./ux-principles.md).

## Responsive strategy

**Primary surface:** Mobile browser (PRD). **Desktop:** Same content column, centered—not a wide multi-column schedule grid unless explicitly designed.

### Breakpoints

| Token | Width | Use |
| --- | --- | --- |
| Default | &lt; 640px | Single column; full-width CTAs; wrapped activity tabs |
| `--bp-md` | ≥ 640px | Optional: date row + secondary actions on one line |
| `--bp-lg` | ≥ 1024px | Slightly reduced base type (see `index.css`); extra horizontal margin only |

Prefer **`rem`**, **`%`**, and **`max-width`** for layout. Avoid fixed pixel widths for the main column.

### Layout ownership

- **Product column:** `.app` in `App.css` (`max-width: 32rem`, horizontal padding). This is the source of truth for readable width.
- **Shell:** `#root` in `index.css` may use a wider max width from the Vite template; do not let shell styles widen cards or controls beyond `.app` without updating this doc.

### Viewport checks

Before shipping UI changes, sanity-check at **320px**, **390px**, and **1280px** width:

- No horizontal scroll at 320px (except deliberate overflow, none in MVP).
- Primary actions remain tappable without precision zoom.
- Long rink names and URLs wrap; no clipped accordion content.

## Pattern catalog

### Page shell

- Centered column, light page background (`--rr-page` / `#f0f0f2`), white card surfaces (`--rr-surface`).
- **Sticky top bar:** dark ink background (`--rr-ink`), 2px gold bottom border (`--rr-gold`); region title on white text, app name and updated line on `--rr-on-dark-muted`.
- Main content below the bar uses the light page fill; session cards and loading/empty blocks stay white.

### Activity tabs

- Two equal-weight options: **Public skate**, **Stick & puck** (adult leagues/programs live under **Programs**, not the slider).
- **Layout:** Primary filter control—larger track padding and tab type (`~0.88rem`) so session type dominates the controls block.
- **States:** Selected = ink fill (`--rr-ink`) + gold label (`--rr-gold`); unselected = transparent on gray track + dark text.
- **Responsive:** `flex-wrap` on narrow screens; `min-width` on each tab so labels stay readable.
- **A11y:** `role="tablist"` / `role="tab"`, `aria-selected`.

### Filter row (date)

- **Progressive disclosure:** Default shows **Search by date** only; tap to reveal date input, **Search**, and **Clear**. Panel stays open after **Search** or **Clear** when the user opened it; **Find Ice** does not expand the date panel.
- Native date input uses **`min` / `max`** from scraped session dates for the current activity; gap days inside that range are rejected on pick with an **inline error** (not a modal).
- Label above control (small caps tone via label styling).
- Date input uses native `type="date"` for mobile pickers.
- **Responsive:** Full width of column on mobile; may sit beside future secondary controls at `≥ 640px`.

### Rinks in search

- **Header control:** **My rinks · N** in the sticky top bar (upper right, above or beside **Updated**).
- **Right drawer:** Opens over the full page (~**80%** viewport width from the right); the left strip is a dimmed backdrop.
- **Close:** Tap backdrop, **×** in drawer header, or **Escape**; body scroll is locked while open.
- List pilot/active rinks within the search radius (nearest first); health badge under each name.
- **Status badges** from `health.json`: Schedule available / No times listed yet / Scrape issue — unless `operations.status` is set on the rink (e.g. **Closed for the season**).
- Paused registry rinks: muted “coming soon” count only (not in search list).
- Opening rinks closes Search by date and Bruins schedule (and vice versa); changing session type closes all overlays.

### Programs (editorial)

- **Header:** Plain-text **Programs** (when `programs.json` has entries) swaps the main column away from session search; label stays **Programs** while viewing (underlined); **×** on the Programs panel returns to session search.
- **Filter:** Programs whose `rink_id` is in the **My rinks · search** radius set; empty state prompts to widen rinks.
- **Cards:** Accordion like session cards — title, rink name, kind badge (Drop-in / League / Skills), teaser; expanded shows description, season offerings, registration copy, optional links.
- **Footer:** Not affiliated with host facilities; link to official program listings.
- **My rinks** stays in the header on the Programs view so users can adjust which rinks appear.

### Bruins schedule (companion)

- **Header:** Plain-text **Schedules** (when at least one companion JSON has games), same gold link style as **Programs** / **My rinks**; opens the game-schedules drawer.
- **Hype FAB:** Fixed bottom-right (`z-index: 28`), ink + gold label **Hype**; plays `public/sounds/hype.wav` on tap; hidden while Schedules drawer is open.
- **Right drawer:** Same **side drawer** pattern as My rinks (`z-index: 40`, ~80% width, backdrop, Escape, scroll lock).
- **Content:** Games grouped by month; home/away badge, venue, **TV · NESN / national** line when data exists; past games muted.
- **Disclaimer:** Not affiliated with NHL/Bruins; link to official schedule.
- **Exclusion:** Only one overlay at a time (My rinks, Search by date panel, Schedules drawer).
- **Shell:** `.app-shell--bottom-fab` adds extra bottom padding on `.app` so content clears the Hype FAB.

### Primary CTA — Find Ice

- Full width of `.app` at all breakpoints; stacked above **Search by date** with tight vertical spacing.
- Primary style: white surface, **ink** label (`--rr-ink`, medium weight), **gold** border; hover uses `--rr-gold-muted` fill.
- **Compact secondary stack:** `0.875rem` type, `0.75rem` vertical padding, `min-height: 3rem` (~48px touch); full `.controls` gap between Find Ice and Search by date (no overlap).
- **Search by date** trigger shares compact metrics; neutral 1px border distinguishes it from the primary control.
- **States:** Default; disabled (searching or locked after results); label **Searching…** while loading.

### Secondary — Clear sessions

- Full width outline button below CTA when results are showing.
- Resets results only; does not reset activity/date drafts.

### Results region

- **Day header:** Uppercase kicker with relative day only (`Today`, `Tomorrow`, `In N days`) + bold full date title. **Today:** light blue-muted block fill (`--rr-blue-muted`), ink kicker; no left stripe.
- **Loading:** White card, centered spinner + message.
- **Pre-search:** Empty state prompt to use Find Ice or Search by date.
- **No matches:** Empty state with suggestion to change date or activity.
- **List:** Vertical stack of session items with consistent gap.
- **A11y:** `aria-live="polite"` on results section; `aria-busy` while searching.

### Session accordion item

**Collapsed (summary)**

| Element | Content |
| --- | --- |
| Row 1 | Start–end time (emphasis) · distance (secondary, top-right) |
| Row 2 | Rink name (emphasis) |
| Row 3 | Activity subtype + price summary (muted) |
| Chrome | Expand **caret** top-right (decorative; not sole indicator of state) |

**Expanded (detail)**

- Optional raw schedule label.
- Full postal address.
- Phone (tel link) when present.
- Open in maps (external).
- Official schedule source (external).
- **Share with friend** — last in details; full-width blue **action** button (`--rr-action`, white label + icon); Web Share or copy; text opens with **Want to join me?**

**Interaction**

- One item expanded at a time (toggle same item to collapse; opening another closes the previous).
- Entire summary row is one button; `aria-expanded`, `aria-controls` point to detail panel id.

**Responsive**

- Summary button: full width; padding reserves space for chevron.
- Detail panel: full width; links wrap; no side-by-side columns in MVP.

### Typography & color

- **Tokens** (see `App.css` `:root`): `--rr-ink` body text, `--rr-gold` accents (header, tabs), `--rr-action` / `--rr-action-hover` for filled CTAs, `--rr-gold-muted` soft highlights (OK health badge, recreational badge, share notice), `--rr-blue-muted` Today results block, `--rr-muted` secondary copy, `--rr-border` dividers.
- Body and controls: explicit `--rr-ink` on white/light surfaces; muted labels use slate grays or `--rr-muted` where aligned.
- Links in session details: `--rr-ink` with semibold weight (not gold-on-white).
- Header-on-dark: `--rr-surface` for the region title; `--rr-on-dark-muted` for meta; rinks control uses gold text and light border.
- Bruins-inspired palette only (black + gold accents)—no team logos or marks in UI.
- Do not rely on inherited `color` alone for `button` elements when background is hard-coded white.

## Styling approach (MVP)

- Plain CSS in `App.css` + global tokens in `index.css`.
- No component library unless explicitly requested; extend existing class names before inventing parallel systems.

## Agent checklist (quick)

1. Read [ux-principles.md](./ux-principles.md) and this file before UI edits.
2. Mobile-first; verify 320 / 390 / 1280.
3. Preserve search → loading → results → clear flow unless asked otherwise.
4. New buttons/inputs: set explicit `color` when `background` is light.
5. User-visible strings: follow **ux-writing** skill tone (concise, clear, conversational).
