# Design unify, web and app (2026-11)

Goal: staseis.gr (this repo) and the Flutter app (`athens-transit-app`) look and feel like one
product. This file is the audit (what each does better) and the shared design decisions. Both repos
implement the decisions on the branch `design-unify-2026-11`.

Sources: the web on a local dev build (live API), Playwright at 390×844 (touch) and 1440×900; the
app's `docs/screenshots/` (v0.3.0, Android emulator) and its code (`lib/ui/theme.dart`,
`widgets.dart`, `map_screen.dart`, `docs/DESIGN-home.md`).

## 1. Audit

| Area | Web does better | App does better |
|---|---|---|
| Layout | One card stack with Back, desktop card on the left, phone sheet (`CardSheet`). «Κοντά σου» groups each stop in its own bordered card, so rows of one stop never mix with the next. | A calm full-screen map with one sheet and two tabs («Κοντά σου», «Αγαπημένα»); a floating search pill with the menu inside it. |
| Colours | Dark mode by tokens; operator colours on line badges (trolleys yellow, buses blue) — a rider recognises the line before reading it. | Warm neutral ground (`#FCFCFA`) instead of pure white; one deep blue accent (`#1A56C4`) that is not the generic system blue; text colours that pass AA. |
| Typography | Tabular numerals in ETAs. | Bigger body text (15) for older riders; one bold weight for names. |
| Icons | One SVG set, `currentColor` (`Icon.svelte`), no emoji. | Material icons, same weight everywhere. |
| Search | «Βρες τη στάση σου» first when there is no location (2026-11-24). | Search pill always on top, placeholder «Στάση, γραμμή ή μέρος». |
| Favourites | Stops first, then lines; the panel opens on a return visit (2026-11-24). | Smart card («Γυρνάς σπίτι»), places (home, work). |
| Stop / ETA cards | Status under the headsign in colour («αργεί 8′» / «στην ώρα του»); «μετά 23′» under the time. | Bell beside each row; «επόμενο 11′, 13′»; stops-away dots (●··◯). |
| Map | City layer by delay, followed lines in Okabe-Ito slots, rail estimates hollow. | Same model (ported). |
| Empty / loading | Short muted sentences. | A reason first, then one button («Χρήση της θέσης μου»); a spinner while locating. |
| Greek copy | Short forms («τώρα», «8′», «μετά»). | Same tone; «Βρίσκω τη θέση σου…». |

Gaps that broke the "one product" feel:

1. **Two blues, two greys.** Web: Apple system blue `#0071e3`, white, `#d2d2d7` borders. App: `#1A56C4`, warm `#FCFCFA`.
2. **Line badges.** Web: operator colour, radius 7–8, 13–14 px. App: grey (`#ECEEEA`) unless the line is one of «Οι γραμμές μου», radius 8 (rows) or 12 (pills).
3. **ETA.** Web: 22–24 px, «τώρα» 17 px; app: 26–32 px, «τώρα» as large as a number (it crowds the headsign, see the app's `stop.png`). Neither says whether a time is live (GPS) or from the timetable at a glance.
4. **"Late" text.** Web: red-orange `#d9480f`; app: brown `#7A4F00`.
5. **Cards and sheets.** Web cards radius 14, sheet 28; app sheet 20, smart card 14, no stop cards.

## 2. Shared decisions (tokens)

Platform font in both: SF on iOS, Roboto on Android (the web's `system-ui` stack gives the same),
so the web and the app match on each phone with no font download. Numbers are always tabular.

### Colours

| Token | Light | Dark | Use |
|---|---|---|---|
| `ground` | `#F7F7F4` | `#0F1113` | page, sheet background (warm paper) |
| `surface` | `#FFFFFF` | `#181B1E` | cards on the ground, search bar, sheet |
| `surface-2` | `#EFF0EC` | `#24282C` | controls, chips, bell, segmented control |
| `surface-3` | `#E4E6E1` | `#30353A` | hover / pressed |
| `ink` | `#16181B` | `#ECEDE9` | text |
| `muted` | `#5C626A` | `#A3A9B1` | secondary text (≥ 5.4:1 on every surface) |
| `rule` | `#E3E4DF` | `#2E3337` | borders, dividers |
| `accent` | `#1A56C4` | `#8AB4F8` | actions, links, a timetable «τώρα» |
| `on-accent` | `#FFFFFF` | `#0B1B3A` | text on an accent fill |
| `accent-soft` | `#E7EEFB` | `#1C2C47` | selected segment, focus wash |
| `ok` (text) | `#146C2E` | `#7DD99A` | «στην ώρα του» |
| `late` (text) | `#B4470B` | `#FFB25C` | «αργεί 8′» |
| `bad` (text) | `#C42B1C` | `#FF8A7A` | errors, stale |
| `star` | `#E8A100` | `#F5B83D` | a starred favourite |

All text pairs pass WCAG AA (checked: muted 5.4–6.2:1, late 4.8–5.5:1, accent 5.8–6.6:1).
The map's delay classes (vehicle dots, rings) do not change: `athens-transit-rt/docs/QUALITY.md` owns them.

### Type scale (px = Flutter logical px)

| Role | Size / weight | Where |
|---|---|---|
| `eta-xl` | 28 / 800, −0.02em | first arrival on a stop card (big) |
| `eta` | 24 / 800, −0.02em | first arrival in a list row |
| `eta-now` | 17 / 800, accent | «τώρα» (a word, not a number: smaller, in colour) |
| `title-lg` | 22 / 700 | card title (stop name) |
| `title` | 17 / 700 | section title, stop name in a list |
| `body-strong` | 15 / 600 | headsign («→ Ν. Ελβετία») |
| `body` | 15 / 400 | sentences |
| `meta` | 13 / 500 | «στάση λεωφορείων · 70 μ» |
| `note` | 12.5 / 600 | status under the headsign |
| `eyebrow` | 11.5 / 700, +0.06em, upper case | small labels («ΓΥΡΝΑΣ ΣΠΙΤΙ») |
| `badge` | 14 / 800, tabular | line badge |

### Radius and spacing

Radius: `xs 6` (micro chips), `sm 8` (line badge), `md 12` (buttons, inputs, bell = circle),
`lg 16` (cards), `xl 24` (sheet, floating search bar), `pill 999`.
Spacing: 4-point scale `4 8 12 16 20 24`; gutter 16; touch target ≥ 44 (web) / 48 (app).

### Card style

A card is `surface` on `ground`, 1 px `rule` border, radius 16, padding 12×14, no shadow. Only
floating things get a shadow (`0 6px 24px rgba(16,24,40,.14), 0 1px 3px rgba(16,24,40,.08)`): the
sheet, the search bar, map buttons. Inside a card, rows are separated by a 1 px `rule`.

### Line badge

Operator colour (`lines.json` `color` / `text_color`); a followed line (web detail lines, app
«Οι γραμμές μου») takes its Okabe-Ito slot instead, so the badge matches its route on the map.
Radius 8, min width 44, height 30, padding 0 8, `badge` type. In compact pills: min width 34,
height 24, radius 6, 13 / 800.

### ETA style (the signature)

A live time (from a vehicle's GPS) sits on a small dark **board plate** with amber digits, like the
LED board at a smart bus stop. A timetable time has no plate.

```
 [ 5′ ]       ← live: board plate, amber digits, eta 24/800 (28 on the stop card)
   μετά 12′   ← muted, 12 px
   5′         ← timetable: muted number, no plate
 [ τώρα ]     ← «τώρα»: same plate, the word in amber, 17/800
```

- **Plate**: fill `board` `#16181B` in both themes; in dark a 1 px `board-edge` `#30353A`
  (`box-shadow: 0 0 0 1px`). Radius 6, padding 2 8. Digits `board-digit` `#FFB000`, weight 800,
  tabular figures, the platform font. The prime «′» is 70 % of the digit size.
- **Amber** `#FFB000` appears nowhere else. Late/early notes («αργεί 8′») keep their note colours.
- **Timetable** times: `muted`, weight 700, no plate. The row note says «από το πρόγραμμα».
- **Compact ETA chip** (pills, favourites rows): `surface-2` pill, height 24, radius 999, 14/800;
  live: the plate look (fill `board`, amber text), same pill shape and height.
- **Flip**: when a live number changes (a new GPS fix) the digits flip once, 150 ms, `translateY` +
  opacity. Off under `prefers-reduced-motion`.
- The two-arcs live mark is gone: the plate is the live mark.

### Empty and loading states

Loading arrivals: two skeleton rows (badge block + two bars, `surface-2`), not a sentence. Empty:
one muted sentence, then at most one action (the app's pattern: the reason, then the button).

## 3. What each repo changes now

- **Web**: tokens in `src/app.css` (the old names keep working, values moved to the palette above);
  `LineChip`, «Κοντά σου», the stop card, favourites and the card shell use the badge, ETA, card
  and radius tokens; the board plate in `Eta.svelte` and `app.css` (`.eta.plate`); skeleton rows while a stop's arrivals load.
- **App**: `Tones` take the palette; one `Ds` (radius, type) in `theme.dart`; `LineBadge` and the
  home pills use operator colours (from `lines.json`) like the web; `ArrivalRow` and the home pills
  use the ETA style (the board plate is the live mark); stops on the home sheet sit in cards like the web.

## 4. Later (not in this branch)

- App: «Κοντά σου» rows like the web (two rows with headsign and status, then chips), instead of
  pills only. Web: the app's bell on every row of «Κοντά σου».
- Web: the app's smart card («Γυρνάς σπίτι») once places exist on the web.
- One search placeholder in both: «Στάση, γραμμή ή μέρος» (the web search does not find places yet).
