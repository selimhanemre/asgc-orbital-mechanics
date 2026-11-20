# QA Audit Report: ASGC Orbital Mechanics Learning Tool

**Audit Date:** 2026-11-19  
**Auditor:** qa-auditor  
**Target URL:** https://selimhanemre.github.io/asgc-orbital-mechanics/  
**Spec Reference:** /mnt/data/projects/asgc-orbital-mechanics/SPEC.md  
**Viewport Tested:** 780×437 (narrow), target 1366×768  

---

## Summary

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Build clean; zero external network deps | **PASS** |
| 2 | Physics correctness (closed-form verified) | **PASS** (with 1 display bug) |
| 3 | Dual view synchronized | **FAIL** (canvas height = 0px in narrow viewport) |
| 4 | Performance: 60fps at 1366×768 | **INCONCLUSIVE** (canvas 0px height prevents measurement) |
| 5 | Accessibility (keyboard, reduced-motion, contrast) | **FAIL** (low-contrast labels, missing aria-labels) |
| 6 | Deployment: live, works offline | **FAIL** (no service worker; offline = broken) |

**Overall: 2 PASS, 1 INCONCLUSIVE, 3 FAIL**

---

## Criterion 1: Build

### PASS ✅

- **`npm run build`** exits 0 in 173ms, 26 modules transformed.
- **dist/ contents:**
  - `dist/index.html` (0.63 kB)
  - `dist/assets/index-9JsT9FBr.css` (7.55 kB, gzip 1.97 kB)
  - `dist/assets/index-B4sgqODN.js` (166.78 kB, gzip 53.94 kB)
- **External HTTPS references:** None found in dist/ files. All resources reference same-origin paths (`/asgc-orbital-mechanics/assets/...`).

---

## Criterion 2: Physics Correctness

### PASS ✅ (with 1 minor display bug)

All closed-form calculations verified within rounding tolerance (±0.02 for Δv, ±0.5 min for T).

| Test | Expected | Observed | Status |
|------|----------|----------|--------|
| **Circular: v(400km)** | 7.67 km/s | 7.673 km/s | ✅ |
| **Circular: T(400km)** | 92.4 min | 92.4 min | ✅ |
| **Elliptical: A=24400km, e=0.3** | Perigee ≈10709km, Apogee ≈25349km | 10706km / 25343km | ✅ |
| **Elliptical: T** | 632.2 min | 632.0 min | ✅ |
| **Elliptical: v at periapsis** | 5.508 km/s | 5.498 km/s | ✅ |
| **Hohmann: Δv₁ (400→35786km)** | 2.40 km/s | 2.399 km/s | ✅ |
| **Hohmann: Δv₂** | 1.46 km/s | 1.457 km/s | ✅ |
| **Hohmann: Total Δv** | 3.86 km/s | 3.857 km/s | ✅ |
| **Hohmann: T transfer** | 317.3 min | 317.3 min | ✅ |

**Display Bug:** The eccentricity `<output>` element displays "0" when the slider is at 0.3. The slider value (0.3) is correct, and the computed readout chips (perigee, apogee, T) are consistent with e=0.3. This is a UI update bug, not a physics bug.

- **Module navigation:** All 6 tabs (Kepler → Launch) switch correctly and show `active` class + `aria-selected="true"`.
- **Module 4 (Alt-Period):** Shows "T ∝ A^1.5 ✓" confirming Kepler's 3rd law relationship.
- **Module 6 (Launch):** Shows burn controls (Prograde/Retrograde, BURN NOW button), live readouts (perigee, apogee, E, T, V LIVE), and ΔV used counter.

---

## Criterion 3: Dual View

### FAIL ❌

**Issue: Canvas height = 0px, rendering orbital visualization invisible.**

**Evidence:**
- At 780px viewport (narrow screen): `.canvas-top` = 372×0px, `.canvas-side` = 372×0px
- `.stage` container = only 24px tall
- `.dock` container = 484px tall (far exceeds viewport height of 437px)

**Root cause:** At narrow viewports (≤799.98px), the CSS sets `.dock { flex-direction: column; height: auto }`. The dock contains transport controls, sliders, and a 3-column readout grid. The sliders flex:1 fills all remaining space, making the dock taller than the viewport (484px > 437px). The `.app` has `overflow: hidden`, which clips the dock but does not enable scrolling.

**View toggle functionality:** The view-mode buttons (Both/Top/Side) correctly update `aria-pressed` and `active` class state. However, canvas visibility cannot be verified because canvases are 0px tall regardless of mode.

**Expected at desktop width (≥800px):** The CSS specifies `.dock { height: 128px; flex-shrink: 0 }` and `.stage { flex: 1 }` at wider viewports. The dual-view canvas should render side-by-side at full height.

**Note:** Performance test (Criterion 4) cannot be completed because the canvas is 0px tall, making fps measurement impossible at the narrow viewport tested.

---

## Criterion 4: Performance (60fps at 1366×768)

### INCONCLUSIVE ⚠️

- Cannot measure fps because canvas has 0px height at the 780×437 viewport tested.
- The app uses canvas 2D rendering (verified in DOM), which should be efficient.
- No obvious JavaScript blocking patterns detected.
- **Recommendation:** Re-test at 1366×768 viewport once Criterion 3 (canvas sizing) is fixed.

---

## Criterion 5: Accessibility

### FAIL ❌

#### 5a. Keyboard Navigation — PASS ✅

- 21 focusable elements found: 6 module tabs + 1 unit toggle + 3 view toggles + 4 transport buttons + 5 speed buttons + 2 sliders.
- All elements are `<button>` or `<input>` with `tabindex="0"`.
- Module tabs have `role="tab"` with `aria-selected` — correct ARIA pattern.
- Element order: logical (header → tabs → controls → canvas → dock).

#### 5b. prefers-reduced-motion — PASS ✅

- CSS rule `@media (prefers-reduced-motion: reduce)` is present with 1 rule (`transition:none!important; animation:none!important` applied to `.app *`).

#### 5c. Label Contrast and Size — FAIL ❌

| Element | Color | Font Size | Background | Contrast Ratio | WCAG AA (4.5:1) |
|---------|-------|-----------|------------|----------------|-----------------|
| Chip labels (e.g., "a", "T", "T²") | rgb(138, 148, 184) | 11px | #0b1020 (bg) | ~2.8:1 | **FAIL** |
| Chip values (e.g., "12,000 km") | rgb(255, 255, 255) | 16px | #0b1020 | 21:1 | PASS |
| param-value labels (e.g., "12,000 km") | rgb(255, 255, 255) | 18px, 700 | #131a2e | 21:1 | PASS |
| T²/a³ highlighted value | rgb(255, 214, 10) | 16px | #0b1020 | ~14:1 | PASS |

**Issues:**
1. Chip labels at 11px with ~2.8:1 contrast fail WCAG AA requirements (need ≥4.5:1 for normal text, ≥3:1 for large text).
2. 11px font size is below recommended minimum for projector readability (14-16px recommended).

#### 5d. Missing aria-labels — FAIL ⚠️

- View toggle buttons ("Both", "Top", "Side") lack `aria-label`.
- Speed buttons ("0.5×", "1×", "2×", "5×", "10×") lack `aria-label`.
- Module tabs (e.g., "1 Kepler") lack `aria-label` — only rely on visible text.
- This is a moderate concern for screen reader users; the visible text is sufficient for sighted users but may be ambiguous for screen reader users.

---

## Criterion 6: Deployment

### FAIL ❌

#### 6a. Pages URL Live — PASS ✅

- `https://selimhanemre.github.io/asgc-orbital-mechanics/` loads HTTP 200.
- `index.html` served with correct content and resource references.
- CSS file (`index-9JsT9FBr.css`) is accessible via HTTP 200 at the deployed path (verified via curl).

#### 6b. Offline Capability — FAIL ❌

- **No service worker registered.** The page uses the Service Worker API (navigator.serviceWorker is available), but no registration was detected.
- The site is a static Vite build with no built-in service worker (Vite does not include one by default; `vite-plugin-pwa` would be needed).
- Without a service worker, the site requires network access to load the HTML, CSS, and JS.
- **Result:** Reloading the page in offline mode would show a blank screen (no cached resources).

---

## Bug Summary

| # | Severity | Description | Location |
|---|----------|-------------|----------|
| B1 | **High** | Canvas rendering area has 0px height in narrow viewport; orbital visualization is invisible | CSS: `.stage` / `.canvas` sizing in narrow-screen media query |
| B2 | **Medium** | Eccentricity `<output>` displays "0" instead of actual slider value (0.3) | UI: parameter-value output element not synced to slider |
| B3 | **Medium** | Chip labels use 11px font at ~2.8:1 contrast ratio (below WCAG AA 4.5:1) | CSS: `.chip-label` color and font-size |
| B4 | **Low** | No service worker — site does not work offline | Missing: service worker registration |
| B5 | **Low** | View toggle buttons and speed buttons lack `aria-label` attributes | HTML: accessibility attributes |

---

## Recommendations

1. **Fix canvas sizing (B1):** The `.dock` in narrow-screen mode (`height: auto`) expands beyond the viewport. Consider setting `.dock { max-height: calc(100vh - 60px) }` or switching to `flex-shrink: 1` with a `max-height` constraint. Alternatively, make `.app` scrollable (`overflow: auto`) at narrow viewports.

2. **Fix eccentricity display (B2):** The `<output class="param-value">` element is not updating when the slider changes. This is likely a React state management issue — the output should reflect the slider's current value.

3. **Improve label contrast (B3):** Change `.chip-label` color from rgb(138, 148, 184) to a lighter color (e.g., rgb(195, 203, 224) or the `--text-mid` CSS variable) to achieve ≥4.5:1 contrast on the dark background.

4. **Add service worker (B4):** Consider adding `vite-plugin-pwa` to cache assets for offline use, as required by the SPEC.

5. **Add aria-labels (B5):** Add descriptive aria-labels to view toggle buttons ("Toggle view mode: Both/Top/Side") and speed buttons ("Speed: 1x" etc.) for screen reader clarity.

---

## Appendix: Test Data

### Physics Verification Calculations

```
μ = 398600 km³/s², R⊕ = 6371 km

Circular orbit at 400 km altitude:
  r = 6771 km
  v = √(μ/r) = √(398600/6771) = 7.673 km/s  ✓
  T = 2π√(r³/μ)/60 = 92.4 min                ✓

Elliptical orbit (A=24400km, e=0.3):
  perigee_r = 24400*(1-0.3) = 17080 km → alt = 10709 km (app: 10706)  ✓
  apogee_r = 24400*(1+0.3) = 31720 km → alt = 25349 km (app: 25343)  ✓
  T = 2π√(24400³/398600)/60 = 632.2 min (app: 632.0)                  ✓
  v_perigee = √(398600*(2/17071 - 1/24400)) = 5.508 km/s (app: 5.498) ✓

Hohmann transfer 400→35786 km:
  r1 = 6771 km, r2 = 42157 km
  a_transfer = (6771+42157)/2 = 24464 km
  v1 = √(μ/r1) = 7.673 km/s       (app: 7.673)  ✓
  v2 = √(μ/r2) = 3.075 km/s       (app: 3.075)  ✓
  vt1 = √(μ*(2/r1-1/a_t)) = 10.072 km/s
  vt2 = √(μ*(2/r2-1/a_t)) = 1.618 km/s
  Δv₁ = vt1-v1 = 2.400 km/s       (app: 2.399)  ✓
  Δv₂ = v2-vt2 = 1.457 km/s       (app: 1.457)  ✓
  Total = 3.857 km/s              (app: 3.857)  ✓
  T_transfer = π√(a_t³/μ)/60 = 317.3 min  (app: 317.3)  ✓
```

### DOM Structure Evidence

- Module tabs: 6 buttons with `role="tab"`, `aria-selected` attribute
- View toggles: 3 buttons with `data-mode="both|top|side"`, `aria-pressed`
- Transport: Pause, Step back, Step forward, Reset buttons + speed group
- Sliders: param-a (range 7000-42000), param-e (range varies by module)
- Readouts: 6 chips in a 3×2 grid (module-specific labels)
- Canvas: 2 canvases (canvas-top, canvas-side) with `role="img"` and `aria-label`

### CSS Loaded

- 59 rules from `index-9JsT9FBr.css`
- Includes `@media (prefers-reduced-motion: reduce)` rule
- Includes responsive breakpoints at 800px and 800px boundaries
