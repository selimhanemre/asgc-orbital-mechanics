# ASGC Orbital Mechanics — Interactive 2D Learning Tool

**Project:** ASGC (Arkansas Space Grant Consortium) NASA educational outreach
**Audience:** High-school / early-college students

## Goal

Interactive 2D web-based orbital mechanics learning tool for HS/early-college students (play-first MVP; quizzes/courses deferred to later phase, architecture must keep that layer pluggable).

## Stack

Vite + React + TypeScript, static build, GitHub Pages.

## Repo / Deploy

- **Repo:** `selimhanemre/asgc-orbital-mechanics` (public)
- **Pages:** deployed from the `gh-pages` branch
- **Base path:** `/asgc-orbital-mechanics/`
- **Live URL:** https://selimhanemre.github.io/asgc-orbital-mechanics/

## Modules (6)

1. **Kepler's laws** — visual equal-area sweep + T²∝a³
2. **Circular orbits** — altitude↔velocity↔period
3. **Elliptical orbits** — eccentricity slider, live velocity/altitude readouts
4. **Altitude–period relationship** — interactive curve
5. **Hohmann transfer** — two-arc animation, Δv₁/Δv₂ + total displayed
6. **Launch/insertion mechanics** — prograde/retrograde burns shaping apogee/perigee

## Explicitly OUT of MVP (stretch)

- Free-play impulse sandbox
- 3D view

## Visualization

- 2D only, single top-down canvas (side view removed in ASGC-2.1)
- Canvas 2D; Earth pinned at canvas center at a fixed pixel radius (`EARTH_PX`) — it never moves or rescales while sliders are dragged
- **Fixed scene scale** (ASGC-2.2): km→px scale is computed once per canvas size as `fixedScale(w, h) = (min(w,h)/2 × (1 − FRAME_MARGIN)) / MAX_ORBIT_KM` (FRAME_MARGIN = 0.14, `src/sim/scene.ts`). `MAX_ORBIT_KM = 81,900 km` is the largest slider-reachable a·(1+e) across all modules (elliptical at a = 42,000, e = 0.95). Ellipses draw at `a·scale`, `b·scale` from the fixed Earth center, so orbits grow/shrink with the sliders and the largest orbit always fits the canvas with margin — no per-frame refit
- Real constants (μ=398600 km³/s², R⊕=6371 km)
- Real units with km/s↔km/min toggle
- Sliders clamped to physical ranges (e.g. altitude 200–36,000 km)

## Exercises (MVP)

None — pure simulation/exploration.

## QA Acceptance Criteria

- Clean static build with zero network deps (verified with network disabled)
- All 6 modules' controls interactive with numerically correct readouts vs closed-form mechanics (v=√(μ/r) circular, T=2π√(a³/μ))
- Runs at 1366×768 mid-range hardware at 60fps
- Keyboard-operable, prefers-reduced-motion respected, high-contrast large labels readable at projector distance
- Deployed Pages URL works offline
