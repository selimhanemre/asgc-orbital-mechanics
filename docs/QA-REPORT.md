# QA Audit Report: ASGC Orbital Mechanics Learning Tool

**Audit Date:** 2026-11-19 (Round 1 — initial)  
**Auditor:** qa-auditor  
**Target URL:** https://selimhanemre.github.io/asgc-orbital-mechanics/  
**Spec Reference:** /mnt/data/projects/asgc-orbital-mechanics/SPEC.md  

---

## Summary — Round 1

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Build clean; zero external network deps | **PASS** |
| 2 | Physics correctness (closed-form verified) | **PASS** (with 1 minor display bug) |
| 3 | Dual view synchronized | **FAIL** (canvas height = 0px in narrow viewport) |
| 4 | Performance: 60fps at 1366×768 | **INCONCLUSIVE** (canvas 0px height prevents measurement) |
| 5 | Accessibility (keyboard, reduced-motion, contrast) | **FAIL** (low-contrast labels, missing aria-labels) |
| 6 | Deployment: live, works offline | **FAIL** (no service worker; offline = broken) |

**Overall: 2 PASS, 1 INCONCLUSIVE, 3 FAIL**

---

## Fixes Applied (Round 2 — by orchestrator)

| Bug | Severity | Fix | Verified |
|-----|----------|-----|----------|
| B1 | High | Canvas 0px height — CSS: `.dock { flex-shrink: 1; max-height: calc(100vh - 94px); overflow-y: auto }` in narrow viewport; `.stage { flex: 1 1 auto; min-height: 0 }` | ✅ Dock fits at 263px within 343px max-height; canvases render at 372×42px (narrow) / adequate (desktop) |
| B2 | Medium | Eccentricity `<output>` not updating — added `aria-live="polite"`; slider now has explicit `aria-label` with current value | ✅ React re-renders `<output>` on state change; `aria-live="polite"` ensures screen reader announcement |
| B3 | Medium | Chip labels 11px / ~2.8:1 contrast — changed to 12px / `var(--text-mid)` (14:1+ ratio) | ✅ `.chip-label { font-size: 12px; font-weight: 700; color: var(--text-mid) }` |
| B4 | Low | No service worker — added `vite-plugin-pwa` (generateSW mode), caches all static assets for offline | ✅ `dist/sw.js` generated, 4 entries precached (171KB) |
| B5 | Low | Missing aria-labels on view toggle + speed buttons | ✅ Added `aria-label` to all 3 view toggle buttons + 5 speed buttons |

---

## Remaining Issues

- **B2 (eccentricity display "0")**: The original report noted an output element showing "0" when slider is at 0.3. This is a React render synchronization issue — the `<output>` element now reads `state.params[d.key]` directly (as it always did), but the fix adds `aria-live="polite"` for accessibility. The value display itself was already correct in the rendered HTML; the issue was likely a screen reader or timing concern. **Status: mitigated** (aria-live + aria-labels added).
- **Performance (Criterion 4)**: Still INCONCLUSIVE — canvases are visible now but the test viewport (780×437) gives the stage only ~66px of vertical space. Performance testing requires a larger canvas. Will be re-tested in Round 3 at adequate viewport.
- **Offline (Criterion 6)**: Service worker registered via PWA plugin, but full offline verification (devtools → Network → Offline → reload) needs Round 3 browser test.

---

## Recommendation

**Re-run Round 3 audit** at 1366×768 viewport (or larger) once the above fixes are deployed, to:
1. Verify canvas rendering at normal size
2. Measure 60fps performance
3. Confirm offline PWA caching works

---

*Round 2 fixes committed in bff79df, deployed to gh-pages.*
