# ASGC Orbital Mechanics — UI/UX Design Specification

**Status:** Ready for implementation
**Companion to:** `SPEC.md` (functional requirements) · **Mockups:** [`mockups/`](mockups/)
**Target runtime:** school Chromebooks, 1366×768 minimum, projector-friendly, offline
**Tech constraint:** Canvas 2D + React DOM panels only. No 3D, no WebGL, no CDN, no web fonts.

Reference mockups (rendered at exact target viewports):

| File | Viewport | Shows |
|---|---|---|
| [`mockups/mockup-desktop-kepler.png`](mockups/mockup-desktop-kepler.png) | 1366×768 | Full app shell, Module 1 (Kepler) active, dual canvas, bottom dock |
| [`mockups/mockup-desktop-hohmann.png`](mockups/mockup-desktop-hohmann.png) | 1366×768 | Module 5 (Hohmann): transfer ellipse, burn arrows, Δv readouts |
| [`mockups/mockup-narrow-circular.png`](mockups/mockup-narrow-circular.png) | 480×768 | Narrow layout: stacked views, view toggle, Module 2 (Circular) |

---

## 1. Design principles

1. **Play-first.** The orbit is the interface. Text is limited to labels, values, and one dismissible hint line per module. No paragraphs, no quizzes, no modals.
2. **Projector-readable.** Default demo context is a school/symposium room: labels legible at ~10 ft. Dark space background, high-contrast strokes, minimum canvas label size 16 px, key values 18–20 px.
3. **One consistent control language.** Every module uses the same transport, slider, readout, and unit-toggle patterns. A student who touched one module can use every module.
4. **Honest physics, honest scale.** Real constants (μ = 398 600 km³/s², R⊕ = 6371 km), real units, on-canvas scale bar. Earth-vs-orbit scale is always to scale; only the overall zoom is adaptive.
5. **Accessible by construction.** Full keyboard operation, `prefers-reduced-motion` respected, WCAG AA contrast everywhere (all pairs in §3 verified ≥ 4.5:1), colorblind-safe encoding (§9).

---

## 2. App shell & layout

### 2.1 Shell zones (desktop)

```
┌────────────────────────────────────────────────────────────────────┐
│ HEADER 60px │ wordmark · module tabs (6) · unit toggle (km/s|km/min)│
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  STAGE  flex-1 (580px @768)   padding 12 · gap 12                  │
│  ┌──────────────────────────┐  ┌──────────────────────────┐        │
│  │ CANVAS TOP-DOWN  (665px) │  │ CANVAS SIDE VIEW (665px) │        │
│  │ badge · scale bar        │  │ badge · scale bar · SUN  │        │
│  └──────────────────────────┘  └──────────────────────────┘        │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│ DOCK 128px │ transport (238) · module sliders (flex) · readouts    │
│            │                                            (330, 6chips)│
└────────────────────────────────────────────────────────────────────┘
```

Vertical budget @ **1366×768**: 60 + 580 + 128 = 768 exactly. Canvas cards: (1366 − 2×12 padding − 12 gap) / 2 = **665 × 556** inside 12 px padding + 10 px radius cards.

- **Header (60 px):** wordmark left, tab bar center (flex, `margin: 0 auto`), unit toggle right.
- **Stage (flex-1):** two equal flex cards, side by side, gap 12 px, padding 12 px. Each card is a borderless canvas fill; badge and scale bar are canvas-drawn (not DOM), so they scale with the canvas.
- **Dock (128 px):** three zones left→right — transport (fixed 238 px), module sliders (flex), readout grid (fixed 330 px, 3×2 chips).

### 2.2 Breakpoints (exact)

| Range | Name | Canvas arrangement | Dock | Tabs |
|---|---|---|---|---|
| **≥ 1200 px** | desktop | side-by-side, equal width | one row, 3 zones (128 px) | number + full label, 14 px |
| **800–1199 px** | tablet | side-by-side, equal width | two rows (min 156 px): row 1 = transport + readouts, row 2 = full-width sliders | number + short label |
| **360–799 px** | narrow | **stacked**: top-down above side view; **view toggle** (Both / Top / Side) appears above the stage; “Both” = 50/50 stage split, single = selected canvas fills stage | 170 px: row 1 transport, row 2 slider(s), row 3 readouts (3 chips) | horizontal, number + 3–6 char label, 11 px, scrollable if < 6 fit |

Media queries to use: `@media (min-width: 1200px)`, `@media (min-width: 800px) and (max-width: 1199.98px)`, `@media (max-width: 799.98px)`. Minimum supported width **360 px**. No horizontal scroll at any supported size.

### 2.3 View toggle (narrow only)

Segmented control, full width, 34 px tall: `Both | Top | Side`. Default **Both**. “Top”/“Side” give one canvas the full stage (useful when the teacher wants a single big view on a phone/tablet). Keyboard: it is a native `role=group` of buttons, arrow-key navigable.

---

## 3. Design tokens

### 3.1 Color (WCAG-verified)

Dark space theme. All text/pair combinations below were computed; weakest pair is 5.77:1 (AA pass, all others ≥ 9:1).

| Token | Hex | Use | Contrast on bg |
|---|---|---|---|
| `--bg-space` | `#0B1020` | canvas + page background (deep navy, **not pure black** — avoids projector banding) | — |
| `--bg-panel` | `#131A2E` | dock, chips, badges | — |
| `--bg-header` | `#0E1425` | header bar | — |
| `--border` | `#2A3555` | 1 px dividers, tracks, card borders | — |
| `--text-hi` | `#FFFFFF` | canvas labels, values, active text | 18.9:1 on space (AAA) |
| `--text-mid` | `#C3CBE0` | slider labels, inactive tabs, secondary text | 10.7:1 on panel (AAA) |
| `--text-dim` | `#8A94B8` | chip keys, hint text | 5.8:1 on panel (AA) |
| `--cyan` | `#4DD0E1` | primary orbit line, active states, focus rings, slider fill | 10.3:1 on space (AAA) |
| `--yellow` | `#FFD60A` | spacecraft, key values (Total Δv, v labels) | 13.4:1 on space (AAA) |
| `--amber` | `#FFB300` | transfer orbit, burn arrows, warning chips | 10.6:1 on space (AAA) |
| `--blue-accent` | `#5B9BF8` | Earth atmosphere rim | 6.8:1 on space |
| `--ocean` | `#2D7DD2` | Earth base | — |
| `--land` | `#7BC67E` | stylized continents | — |
| `--night` | `#05070F` | terminator shade @ 55% opacity | — |

**Rules:** never encode meaning with red/green (none exists in this palette). Every semantic difference is also carried by geometry (solid vs dashed, arrow direction) and text (labels on all markers).

### 3.2 Typography

**Offline-only font stacks** (no web fonts — zero network dependency):

```css
--font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--mono: ui-monospace, "Roboto Mono", "SF Mono", Consolas, "DejaVu Sans Mono", monospace;
```

(Chromebook ships Roboto + Roboto Mono, so the stacks resolve to native faces.)

| Context | Size / weight | Notes |
|---|---|---|
| Wordmark | 18 px / 700 | 16 px narrow |
| Module tabs | 14 px / 600, numbers in mono 12 px | 11 px narrow |
| Slider label | 14 px / 600, UPPERCASE, letter-spacing .06em | |
| Slider value | **18 px / 700 mono**, `font-variant-numeric: tabular-nums` | |
| Chip key | 11 px / 600 UPPERCASE letter-spacing .08em, `--text-dim` | |
| Chip value | **16 px / 700 mono**, `tabular-nums` | 15 px narrow |
| Speed segments | 13 px mono | |
| Hint line | 14 px / 400 `--text-dim` | one line, dismissible |

**Canvas-drawn labels** (drawn with the canvas font stack, sizes in CSS px before DPR scaling):

| Label | Size / weight |
|---|---|
| View badge (“TOP-DOWN” / “SIDE VIEW”) | 18 px / 700, letter-spacing 1.5 px, in pill `#131A2E` @85% |
| Apogee / perigee / burn labels | 16 px / 700 mono |
| Live “v = …” label at spacecraft | 16 px / 700 mono `--yellow` |
| “A₁ = A₂” annotation | 16 px / 600 |
| Scale-bar caption | 14 px mono |
| SUN / N markers | 14 px / 700 |

Hard floor: **no canvas label below 14 px**, no key value below 16 px. Canvas text gets a 2 px dark halo (`strokeText` in `--bg-space` under `fillText`) so it stays readable over orbit lines.

### 3.3 Spacing / radii / targets

- Spacing scale: 4 / 8 / 12 / 16 / 24 px.
- Radii: cards 10, buttons 10, chips/tabs/segments 8.
- **Touch/keyboard target minimum 44×44 px** for every interactive control (buttons, speed segments, unit buttons, view toggle).
- Focus style: `outline: 3px solid var(--cyan); outline-offset: 2px` on all focusable elements.

---

## 4. Module navigation

- Six tabs in the header, left→right in learning order: **1 Kepler’s Laws · 2 Circular · 3 Elliptical · 4 Alt · Period · 5 Hohmann · 6 Launch**.
- Tab anatomy: `number (mono, dim) + label`. Active tab: cyan 14% background, cyan 55% border, 2 px cyan top inset bar, white text.
- Selection is instant (no transition > 120 ms); the canvas re-renders immediately with the module’s defaults.
- Switching modules preserves global settings (unit, speed, play state) but resets that module’s parameters to its defaults.
- **Keyboard:** keys **1–6** jump directly; `←`/`→` move focus across tabs (roving tabindex); `Enter`/`Space` activates. Tab order: header (wordmark → tabs → unit toggle) → dock (transport → sliders → readouts).

### Per-module panel specification

Each module defines: sliders (in dock center), readout chips (dock right, 6 slots), canvas annotations (both views), and one hint line. Defaults are chosen to be physically illustrative.

**M1 — Kepler’s Laws** (mockup: desktop-kepler)
- Sliders: `a` 7,000–42,000 km, step 100, default 12,000 · `e` 0–0.5, step 0.01, default 0.30.
- Readouts: `a` · `T` · `T²` · `a³` · **`T²/a³` (highlighted yellow — the invariant)** · `e`.
- Canvas: orbit ellipse; two filled equal-area sectors from the focus (yellow @22% near perigee, cyan @22% near apogee) swept continuously; label “A₁ = A₂ — equal areas in equal times”; apoapsis/periapsis ticks.
- Hint: “The shaded areas are equal — the orbit trades distance for speed.”

**M2 — Circular Orbits** (mockup: narrow-circular)
- Slider: `altitude` 200–36,000 km, **log scale**, default 400.
- Readouts: `altitude` · `r` · `v` · `T`.
- Canvas: single circle; dashed altitude line Earth-surface→orbit labeled “400 km”; velocity vector at spacecraft; live v label.
- Hint: “Raise the altitude. Speed and period both drop.”

**M3 — Elliptical Orbits**
- Sliders: `a` 7,000–42,000 km, step 100, default 24,395 · `e` 0–0.95, step 0.01, default 0.30, **clamped so perigee ≥ 200 km** (i.e. `e ≤ 1 − (R⊕+200)/a`; thumb stops and value shows the clamp).
- Readouts: `altitude (live)` · `r (live)` · `v (live)` · `apogee` · `perigee` · `T`.
- Canvas: ellipse with focus cross; APOGEE/PERIGEE markers with altitude labels (side view); live v label grows/shrinks visibly near perigee/apogee.
- Hint: “Fastest at perigee, slowest at apogee — watch v change.”

**M4 — Altitude–Period**
- Sliders: none — the **side-view canvas becomes the graph**: T (min) vs altitude (0–40,000 km) with grid lines, curve `T = 2π√((R⊕+h)³/μ)`; a draggable point (mouse/touch, arrow keys = 100 km, Shift = 1,000 km). **Top-down canvas shows the live orbit** matching the point. Preset chips: LEO 400 · MEO 20,000 · GEO 35,786 (snap).
- Readouts: `altitude` · `T` · `r` · `v` · (2 empty slots show `a` and a “T ∝ a^1.5” invariant note).
- Hint: “Drag the dot up the curve — double the radius, more than double the time.”

**M5 — Hohmann Transfer** (mockup: desktop-hohmann)
- Sliders: `start altitude` 200–35,000 km, log, default 400 · `target altitude` 300–36,000 km, log, default 35,786. Constraint `target ≥ start + 100 km` enforced by auto-clamp with an amber warning chip.
- Readouts: `Δv₁` · `Δv₂` · **`Total Δv` (yellow)** · `transfer time` · `v start` · `v target`.
- Canvas: two cyan circles + dashed amber transfer ellipse; amber prograde burn arrows at both ends labeled Δv₁/Δv₂ (top-down) and BURN 1/BURN 2 (side); transfer-time label at the transfer ellipse’s midpoint; spacecraft animates circle → arc → circle over the transfer duration.
- Hint: “Two small pushes beat one big one — see the total Δv.”

**M6 — Launch / Insertion**
- Controls (replace slider zone): `Δv` slider 0.1–5.0 km/s, step 0.05, default 0.5 · direction segment **Prograde | Retrograde** · **Burn now** primary button (44 px, cyan).
- Readouts: `perigee` · `apogee` · `e` · `T` · `v (live)` · `Δv used` (cumulative).
- Canvas: live orbit; each burn draws the **previous orbit as a white dashed ghost @35%** so the shape change is visible; burn arrow at spacecraft; APOGEE/PERIGEE markers update. Start state: 200 km circular orbit.
- Hint: “Burn prograde at perigee to raise apogee. Build a bigger orbit one push at a time.”

---

## 5. Control system (global, identical in every module)

### 5.1 Transport group (dock left, 238 px)

Row 1 — four 44 px buttons:
1. **Play/Pause** (primary cyan, `❚❚`/`▶`) — `Space`, `aria-pressed`.
2. **Step back** `◀` — `←` (pauses if running).
3. **Step forward** `▶` — `→` (pauses if running). Steps = 2% of the current period.
4. **Reset** `↺` — `R` (module params → defaults, `t = 0`, paused state preserved).

Row 2 — speed segments (mono 13 px): `0.5× | 1× | 2× | 5× | 10×`, default `1×`. Keys `[` / `]` step down/up.

**Time scale:** `1×` = **60 simulated seconds per real second** (LEO ≈ 1.5 s/orbit, GEO ≈ 103 s/orbit; 5–10× for GEO work).

### 5.2 Unit toggle (header right)

Segmented `km/s | km/min`, default `km/s`, key `U`. Affects every velocity readout (canvas + DOM) simultaneously; values are converted, never re-simulated. Chip/canvas velocity labels update live; period is always shown in min (h mm for ≥ 60 min, e.g. “5 h 17 m” for transfer time).

### 5.3 Sliders (DOM, native `<input type="range">` restyled)

Anatomy: label (14 px, `--text-mid`, uppercase) left + value (18 px mono bold, white) right, track below.
- Track: 6 px tall, `--border` unfilled, `--cyan` filled.
- Thumb: 20 px circle, cyan fill, 2 px white border, 4 px cyan 25% halo. (22 px on narrow/touch.)
- **Scale types:** altitude sliders are **logarithmic** (200–36,000 km spans 2.3 decades; linear would make LEO unusable) — slider position `p = (log10(v) − log10(min)) / (log10(max) − log10(min))`; `a` and `Δv` are linear; `e` linear.
- Keyboard: arrow = 1 step, `Shift`+arrow = 10 steps; value readout is the slider’s `aria-valuetext` (e.g. “400 kilometers”).
- Physical clamps are hard: the thumb cannot leave the range; module-level clamps (perigee ≥ 200 km; Hohmann target ordering) clamp silently and flash the value in amber for 600 ms.

### 5.4 Readout grid (dock right, 330 px, 3×2)

Chips: 8 px radius, `--bg-panel` on a slightly darker `#0E1526` fill, key (11 px uppercase dim) over value (16 px mono bold white). Live values (position-dependent) update at **≤ 10 Hz** (throttled) to avoid flicker; all use `tabular-nums`. One chip per module may carry the `.hot` (yellow value) treatment for the module’s “money” number (T²/a³, Total Δv). Empty slots render an empty chip (stable layout).

---

## 6. Canvas visual style

Both canvases share one coordinate pipeline: scene centered on Earth at (W/2, H/2). Zoom is **adaptive**: `scale = 0.8 × min(W,H)/2 ÷ r_max` where `r_max` is the largest radius in the scene (apogee for M1/M3, outer circle for M5, orbit radius for M2, etc.). Earth is drawn at `6371 km × scale` — **always to scale against the orbit**; only zoom changes.

### 6.1 Starfield

~20 static 1 px dots, white @25%, fixed seeded positions per canvas (no twinkle, no parallax — cheap and calm under `prefers-reduced-motion`).

### 6.2 Earth conventions

| | **Top-down (north polar)** | **Side (equatorial)** |
|---|---|---|
| Base disk | `#2D7DD2` | `#2D7DD2` |
| Continents | 4–6 stylized `#7BC67E` blobs (fixed canvas paths) | same, equatorial subset |
| Graticule | circles at 30°/60° lat (r·cos30, r·cos60) + 6 meridian diameters, white 1 px @22% | equator line white @22% |
| Orientation mark | “N” 14 px bold at top | — |
| Terminator | **none** (polar view, sun direction irrelevant) | **yes**: left half `#05070F` @55% + 14 px soft band; terminator line white @30%; “SUN” + yellow left-pointing arrow at right edge |
| Atmosphere | rim 2 px `#5B9BF8` @40% at R+2, 6 px halo @12% at R+5 | same |
| Simplification | if screen R⊕ < 28 px: solid ocean disk + rim only (no continents/graticule) | same |

### 6.3 Spacecraft & vectors

- Spacecraft: 8 px `--yellow` disk, 2 px white stroke, 14 px halo @25%.
- Velocity vector: tangential, 40–60 px, `--yellow` 3 px with arrowhead; length ∝ speed (clamped). Live `v = …` 16 px mono label beside it (M2/M3/M5/M6).

### 6.4 Line & marker vocabulary (consistent everywhere)

| Element | Style |
|---|---|
| Current/actual orbit | `--cyan` 3 px solid |
| Recent trail | `--cyan` alpha fade over last 20% of path; **disabled under reduced motion** |
| Transfer orbit (M5) | `--amber` 3 px dashed 10/7 |
| Ghost orbit (M6, pre-burn shape) | white 2 px dashed @35% |
| Altitude line (M2) | white 2 px dashed @50% + label |
| Burn arrow (M5/M6) | `--amber` 4 px with arrowhead, label Δv₁/Δv₂ |
| Apogee/perigee/burn-position marker | 4 px `--yellow` disk + 16 px mono label |
| Graph point (M4) | 10 px `--yellow` disk, 2 px white stroke; curve `--cyan` 3 px; grid white @12% |

### 6.5 Per-canvas chrome (canvas-drawn, scales with canvas)

- **Badge** top-left: pill 32 px tall, 14 px/1.5 px letter-spacing, “TOP-DOWN” / “SIDE VIEW” (18 px; 14 px on narrow).
- **Scale bar** bottom-left: 3 px white line with end ticks + 14 px mono caption; auto length from {500, 1,000, 2,000, 5,000, 10,000, 20,000} km so it renders 80–160 px.
- Canvas element: `role="img"` with `aria-label` refreshed at 1 Hz summarizing state (“Side view: circular orbit, altitude 400 km, velocity 7.67 km per second, period 92 minutes.”). All numeric data is also mirrored in DOM chips, so screen readers never depend on the canvas.

---

## 7. Motion & interaction behavior

- **Time:** single `requestAnimationFrame` loop; sim clock `t += dt × speed × 60 s/s` while playing. Canvas drawing is imperative (no per-frame React render).
- **Slider drags** update the scene live at frame rate; orbit geometry is derived (closed-form), so no re-simulation needed.
- **Burns (M6):** apply instantly; ghost orbit persists until the next burn.
- **Module switch:** instant re-render; no fade/zoom animations > 120 ms.
- **`prefers-reduced-motion: reduce`:** simulation **starts paused** with a hint chip “Press → to step”; trails off; step buttons visually emphasized; all CSS transitions ≤ 120 ms; no autoplay anywhere. Non-motion preferences (all colors, sizes) unchanged.

### Keyboard map (complete)

| Key | Action |
|---|---|
| `Space` | play / pause |
| `←` / `→` | step ∓2% of period (pauses); moves focus only when a tab has focus (roving tabindex) |
| `1`–`6` | switch module |
| `[` / `]` | speed down / up |
| `U` | toggle km/s ↔ km/min |
| `R` | reset module |
| `Tab` | DOM focus order: header → dock (natural order, all controls native elements) |

---

## 8. Accessibility summary (acceptance hooks)

- **Contrast:** all text/pair combinations in §3.1 verified ≥ 4.5:1 (min 5.77:1); canvas key labels are white/yellow on `#0B1020` (≥ 13:1) with halos.
- **Keyboard:** 100% of controls reachable and operable per §7; visible 3 px cyan focus.
- **Screen reader:** semantic DOM for everything interactive; canvas is `role=img` + 1 Hz label; readout chips are live text (use `aria-live="off"` — 10 Hz updates are not announcements; values remain focusable).
- **Reduced motion:** §7.
- **Touch:** 44 px targets, 22 px thumbs on narrow.

---

## 9. Colorblind safety

- Palette excludes red and green as **any** semantic carrier. Encoding relies on: hue triple (cyan / yellow / amber) **plus** luminance (all three ≥ 10:1 apart from background and well-separated from each other under protanopia/deuteranopia) **plus** geometry (dashed = “not the current orbit”, arrowheads = direction, filled sectors = area).
- Every color-cued element carries a text label (Δv₁, APOGEE, BURN 1, v = …), so hue is never the only channel.
- Velocity is encoded by **vector length + numeric value**, not by hue.
- No red/green “good/bad” states exist in the MVP; warnings use amber + icon.

---

## 10. Performance & implementation notes

- **Canvas:** two `<canvas>` elements, DPR = `min(devicePixelRatio, 2)`, sized by `ResizeObserver`; all drawing in one `draw(ctx, state)` per canvas inside a single rAF loop. Budget: ellipse + disk + ≤ 60 primitives — trivial for Canvas 2D at 1366×768; 60 fps target.
- **React:** owns controls/state only; renders on control changes; readout DOM throttled to 10 Hz. No state in the rAF loop (refs).
- **Physics:** pure-TS `sim-engine` module (per SPEC, unit-testable); renderer consumes closed-form state `(module, params, t)`.
- **Offline:** system fonts only, no images, no fetch — consistent with SPEC §Zero network deps.
- **Suggested component tree:**

```
App
├─ Header
│  ├─ Wordmark
│  ├─ ModuleTabs (roving tabindex, 1–6 keys)
│  └─ UnitToggle (km/s | km/min, key U)
├─ Stage
│  ├─ ViewToggle            (narrow only: Both | Top | Side)
│  ├─ CanvasCard "top"      (canvas + 1 Hz aria-label)
│  └─ CanvasCard "side"
└─ ControlDock
   ├─ TransportGroup (play/pause, step±, reset, speed segments)
   ├─ ModuleSliders (per §4)
   └─ ReadoutGrid (6 chips, 10 Hz)
```

---

## 11. Out of scope (matches SPEC)

No quizzes/exercises, no free-play impulse sandbox, no 3D, no theming beyond the dark space theme, no multi-user/sync. Architecture keeps the quiz layer pluggable (readout grid + sim state are already structured for it).
