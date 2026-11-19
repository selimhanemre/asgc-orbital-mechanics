# ASGC Orbital Mechanics

Interactive 2D orbital mechanics learning tool for high-school / early-college
students — ASGC (Arkansas Space Grant Consortium) NASA educational outreach.

See [SPEC.md](SPEC.md) for the full blueprint (modules, constants, QA
acceptance criteria).

## Stack

- Vite + React 18 + TypeScript
- Canvas 2D (no WebGL, no CDN — fully offline static build)
- Static build deployed to GitHub Pages

## Develop

```bash
npm install
npm run dev      # http://localhost:5173/asgc-orbital-mechanics/
```

## Build

```bash
npm run build    # emits dist/ (zero external URLs)
npm run preview  # serve dist/ locally
```

The build is fully offline: no CDN scripts, fonts, or stylesheets. Verify with:

```bash
grep -rE "https?://" dist/ || echo "OK: no external URLs"
```

## Deploy (GitHub Pages)

Pages is configured to serve the `gh-pages` branch. To publish:

```bash
./deploy.sh
```

which runs `npm run build` and pushes `dist/` to the `gh-pages` branch
(force). The site goes live at:

**https://selimhanemre.github.io/asgc-orbital-mechanics/**

GitHub usually needs 1-2 minutes after the push to finish building Pages.

The Vite `base` is set to `/asgc-orbital-mechanics/` (see `vite.config.ts`)
so all asset URLs resolve under the project subpath.
