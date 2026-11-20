/**
 * Module 2 — Circular Orbits
 * Altitude slider → live velocity/period readouts.
 */

import { circularRadius, circularVelocity, periodFromSemiMajor } from '../sim/engine'
import type { ModuleDef, Params, ReadoutLine, DrawInput } from './types'
import { meanAnomaly, makeView } from './common'
import {
  drawEarth, drawOrbitPath, drawCraft, drawLabel, drawViewTag,
} from '../sim/scene'

const defaults: Params = { altitude: 400 }

export const module: ModuleDef = {
  id: 'circular',
  title: 'Circular Orbits',
  short: '2 Circular',
  blurb: 'Altitude ↔ velocity ↔ period',
  defaults,
  params: [
    { key: 'altitude', label: 'Altitude', min: 200, max: 36000, step: 100, unit: 'km' },
  ],
  phasePeriod: (p) => periodFromSemiMajor(circularRadius(p.altitude)),
  readout(p: Params, unit: 'kms' | 'kmin'): ReadoutLine[] {
    const alt = p.altitude
    const r = circularRadius(alt)
    const v = circularVelocity(r)
    const T = periodFromSemiMajor(r)
    return [
      { label: 'altitude', value: `${alt.toLocaleString()} km` },
      { label: 'r', value: `${r.toLocaleString()} km` },
      { label: 'v', value: unit === 'kms' ? `${v.toFixed(3)} km/s` : `${(v * 60).toFixed(1)} km/min` },
      { label: 'T', value: `${(T / 60).toFixed(1)} min` },
      { label: '', value: '' },
      { label: '', value: '' },
    ]
  },
  draw(inp: DrawInput, p: Params): void {
    const rKm = circularRadius(p.altitude)
    const T = periodFromSemiMajor(rKm)
    const nu = meanAnomaly(inp.time, T)

    // TOP-DOWN
    const topV = makeView(inp.top, rKm)
    drawEarth(inp.top, topV.cx, topV.cy, 6371 * topV.scale)
    drawOrbitPath(inp.top, topV.cx, topV.cy, topV.scale, rKm, 0, { color: '#4dd0e1' })

    // Altitude line
    const { ctx: ctxT } = inp.top
    ctxT.save()
    ctxT.strokeStyle = 'rgba(255,255,255,0.5)'
    ctxT.lineWidth = 2
    ctxT.setLineDash([6, 6])
    ctxT.beginPath()
    ctxT.moveTo(topV.cx, topV.cy - 6371 * topV.scale)
    ctxT.lineTo(topV.cx, topV.cy - rKm * topV.scale)
    ctxT.stroke()
    ctxT.setLineDash([])
    drawLabel(inp.top, `${p.altitude} km`, topV.cx + 8, topV.cy - (6371 + rKm) / 2 * topV.scale, { color: '#fff', size: 14 })
    ctxT.restore()

    const sx = topV.cx + rKm * topV.scale * Math.cos(nu)
    const sy = topV.cy + rKm * topV.scale * Math.sin(nu)
    drawCraft(inp.top, sx, sy, nu + Math.PI / 2)

    const vLabel = inp.unit === 'kms' ? `${circularVelocity(rKm).toFixed(3)} km/s` : `${(circularVelocity(rKm) * 60).toFixed(1)} km/min`
    drawLabel(inp.top, `v=${vLabel}`, sx + 14, sy - 14, { color: '#ffd60a', size: 16, bold: true })
    drawViewTag(inp.top, 'TOP-DOWN')

    // SIDE VIEW
    const sideV = makeView(inp.side, rKm)
    drawEarth(inp.side, sideV.cx, sideV.cy, Math.max(5, 6371 * sideV.scale), 0.5)
    drawOrbitPath(inp.side, sideV.cx, sideV.cy, sideV.scale, rKm, 0, { color: '#4dd0e1' })
    drawCraft(inp.side, sideV.cx + rKm * sideV.scale * Math.cos(nu), sideV.cy + rKm * sideV.scale * Math.sin(nu) * 0.5, nu + Math.PI / 2)
    drawLabel(inp.side, '☀ SUN →', sideV.cx + sideV.scale * rKm + 20, sideV.cy, { color: '#ffd60a', size: 14 })
    drawViewTag(inp.side, 'SIDE VIEW')
  },
}
