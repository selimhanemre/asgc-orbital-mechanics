/**
 * Module 3 — Elliptical Orbits
 * Eccentricity + semi-major axis sliders, live readouts at spacecraft.
 */

import { TWO_PI, periodFromSemiMajor, visViva, ellipseRadii, clampPerigee } from '../sim/engine'
import type { ModuleDef, Params, ReadoutLine, DrawInput } from './types'
import { meanAnomaly, makeView } from './common'
import {
  drawEarth, drawOrbitPath, drawCraft, drawLabel, drawViewTag, drawMarker,
} from '../sim/scene'

const defaults: Params = { a: 24395, e: 0.3 }

let _simTime = 0

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
  id: 'elliptical',
  title: 'Elliptical Orbits',
  short: '3 Elliptical',
  blurb: 'Eccentricity & semi-major axis',
  defaults,
  params: [
    { key: 'a', label: 'Semi-major axis (a)', min: 7000, max: 42000, step: 100, unit: 'km' },
    { key: 'e', label: 'Eccentricity (e)', min: 0, max: 0.95, step: 0.01, unit: '' },
  ],
  phasePeriod: (p) => periodFromSemiMajor(p.a),
  readout(p: Params, unit: 'kms' | 'kmin'): ReadoutLine[] {
    const a = p.a, e = p.e
    const T = periodFromSemiMajor(a)
    const M = meanAnomaly(_simTime, T)
    const E = solveKepler(M, e)
    const r = a * (1 - e * Math.cos(E))
    const v = visViva(a, r)
    const alt = r - 6371
    const { peri, apo } = ellipseRadii(a, e)
    return [
      { label: 'alt (live)', value: `${alt.toFixed(0).toLocaleString()} km` },
      { label: 'r (live)', value: `${r.toFixed(0).toLocaleString()} km` },
      { label: 'v (live)', value: unit === 'kms' ? `${v.toFixed(3)} km/s` : `${(v * 60).toFixed(1)} km/min` },
      { label: 'apogee', value: `${(apo - 6371).toFixed(0).toLocaleString()} km` },
      { label: 'perigee', value: `${(peri - 6371).toFixed(0).toLocaleString()} km` },
      { label: 'T', value: `${(T / 60).toFixed(1)} min` },
    ]
  },
  clampParam(key, value, p) {
    if (key === 'e') return clampPerigee(p.a, value).e
    return value
  },
  draw(inp: DrawInput, p: Params): void {
    _simTime = inp.time
    const { a, e } = p
    const T = periodFromSemiMajor(a)
    const maxR = a * (1 + e)
    const topV = makeView(inp.top, maxR)
    const sideV = makeView(inp.side, maxR)

    const M = meanAnomaly(inp.time, T)
    const E0 = solveKepler(M, e)
    const nu0 = trueAnomalyFromEccentric(E0, e)
    const r0 = a * (1 - e * Math.cos(E0))
    const v0 = visViva(a, r0)
    const vLabel = inp.unit === 'kms' ? `${v0.toFixed(3)} km/s` : `${(v0 * 60).toFixed(1)} km/min`

    // TOP-DOWN
    drawEarth(inp.top, topV.cx, topV.cy, 6371 * topV.scale)
    drawOrbitPath(inp.top, topV.cx, topV.cy, topV.scale, a, e, { color: '#4dd0e1' })

    const sx = topV.cx + r0 * topV.scale * Math.cos(nu0)
    const sy = topV.cy + r0 * topV.scale * Math.sin(nu0)
    drawCraft(inp.top, sx, sy, nu0 + Math.PI / 2)

    // Velocity vector
    const vLen = Math.min(60, Math.max(20, v0 * 5))
    const { ctx: ctxT } = inp.top
    ctxT.save()
    ctxT.strokeStyle = '#ffd60a'
    ctxT.lineWidth = 3
    ctxT.beginPath()
    ctxT.moveTo(sx, sy)
    ctxT.lineTo(sx - Math.sin(nu0) * vLen, sy + Math.cos(nu0) * vLen)
    ctxT.stroke()
    ctxT.restore()
    drawLabel(inp.top, `v=${vLabel}`, sx + 14, sy - 14, { color: '#ffd60a', size: 16, bold: true })

    const { peri, apo: apoR } = ellipseRadii(a, e)
    drawMarker(inp.top, topV.cx + peri * topV.scale, topV.cy, `PERI ${(peri - 6371).toFixed(0)}`, '#4dd0e1')
    drawMarker(inp.top, topV.cx - apoR * topV.scale, topV.cy, `APO ${(apoR - 6371).toFixed(0)}`, '#ffd60a')
    drawLabel(inp.top, '⊕', topV.cx - 8, topV.cy, { color: '#4dd0e1', size: 14 })
    drawViewTag(inp.top, 'TOP-DOWN')

    // SIDE VIEW
    drawEarth(inp.side, sideV.cx, sideV.cy, Math.max(5, 6371 * sideV.scale), 0.5)
    drawOrbitPath(inp.side, sideV.cx, sideV.cy, sideV.scale, a, e, { color: '#4dd0e1' })
    const sSx = sideV.cx + r0 * sideV.scale * Math.cos(nu0)
    const sSy = sideV.cy + r0 * sideV.scale * Math.sin(nu0) * 0.5
    drawCraft(inp.side, sSx, sSy, nu0 + Math.PI / 2)
    drawLabel(inp.side, '☀ SUN →', sideV.cx + sideV.scale * maxR + 20, sideV.cy, { color: '#ffd60a', size: 14 })
    drawViewTag(inp.side, 'SIDE VIEW')
  },
}
