/**
 * Module 1 — Kepler's Laws
 * Equal-area sweep visualization + T²∝a³ demonstration.
 */

import { TWO_PI, periodFromSemiMajor } from '../sim/engine'
import type { ModuleDef, Params, ReadoutLine, DrawInput } from './types'
import { meanAnomaly, makeView } from './common'
import {
  drawEarth, drawOrbitPath, fillSweptSector, drawCraft, drawLabel, drawViewTag,
  drawMarker,
} from '../sim/scene'

const defaults: Params = { a: 12000, e: 0.3 }

function solveKepler(M: number, e: number): number {
  const m = ((M % TWO_PI) + TWO_PI) % TWO_PI
  if (e < 1e-9) return m
  let E = m + e * Math.sin(m)
  for (let i = 0; i < 30; i++) {
    const f = E - e * Math.sin(E) - m
    const fp = 1 - e * Math.cos(E)
    E -= f / fp
    if (Math.abs(f / fp) < 1e-13) break
  }
  return E
}

function trueAnomalyFromEccentric(E: number, e: number): number {
  return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2))
}

export const module: ModuleDef = {
  id: 'kepler',
  title: "Kepler's Laws",
  short: '1 Kepler',
  blurb: 'Equal-area sweep + T²∝a³',
  defaults,
  params: [
    { key: 'a', label: 'Semi-major axis (a)', min: 7000, max: 42000, step: 100, unit: 'km' },
    { key: 'e', label: 'Eccentricity (e)', min: 0, max: 0.5, step: 0.01, unit: '' },
  ],
  phasePeriod: (p) => periodFromSemiMajor(p.a),
  readout(p: Params, unit: 'kms' | 'kmin'): ReadoutLine[] {
    const T = periodFromSemiMajor(p.a)
    void unit // unit available for future velocity display
    return [
      { label: 'a', value: `${Math.round(p.a).toLocaleString()} km` },
      { label: 'T', value: `${(T / 60).toFixed(1)} min` },
      { label: 'T²', value: `${(T * T / 1e6).toFixed(2)}e6` },
      { label: 'a³', value: `${(p.a ** 3 / 1e9).toFixed(2)}e9` },
      { label: 'T²/a³', value: `${((T * T / p.a ** 3) * 1e5).toFixed(5)}e-5`, color: '#ffd60a' },
      { label: 'e', value: p.e.toFixed(2) },
    ]
  },
  draw(inp: DrawInput, p: Params): void {
    const { a, e } = p
    const T = periodFromSemiMajor(a)
    const maxR = a * (1 + e)
    const topV = makeView(inp.top, maxR)

    const M = meanAnomaly(inp.time, T)
    const E0 = solveKepler(M, e)
    const nu0 = trueAnomalyFromEccentric(E0, e)
    const r0 = a * (1 - e * Math.cos(E0))

    // TOP-DOWN
    drawEarth(inp.top, topV.cx, topV.cy, 6371 * topV.scale)
    drawOrbitPath(inp.top, topV.cx, topV.cy, topV.scale, a, e, { color: '#4dd0e1' })

    // Equal-area sectors
    const dnu = 0.18
    fillSweptSector(inp.top, topV.cx, topV.cy, topV.scale, a, e, nu0, nu0 + dnu, 'rgba(255,214,10,0.22)')
    fillSweptSector(inp.top, topV.cx, topV.cy, topV.scale, a, e, nu0 + Math.PI, nu0 + Math.PI + dnu, 'rgba(77,208,225,0.22)')

    const midNu1 = nu0 + dnu / 2
    const rMid1 = a * (1 - e * e) / (1 + e * Math.cos(midNu1))
    drawLabel(inp.top, 'A₁=A₂', topV.cx + rMid1 * topV.scale * Math.cos(midNu1) + 20, topV.cy + rMid1 * topV.scale * Math.sin(midNu1) - 10, { color: '#ffd60a', size: 16, bold: true })

    const sx = topV.cx + r0 * topV.scale * Math.cos(nu0)
    const sy = topV.cy + r0 * topV.scale * Math.sin(nu0)
    drawCraft(inp.top, sx, sy, nu0 + Math.PI / 2)

    drawMarker(inp.top, topV.cx + a * (1 - e) * topV.scale, topV.cy, 'PERI', '#4dd0e1')
    drawMarker(inp.top, topV.cx - a * (1 + e) * topV.scale, topV.cy, 'APO', '#ffd60a')
    drawLabel(inp.top, '⊕', topV.cx - 8, topV.cy, { color: '#4dd0e1', size: 14 })
    drawViewTag(inp.top, 'TOP-DOWN')
  },
}
