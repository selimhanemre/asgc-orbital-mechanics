/**
 * Module 5 — Hohmann Transfer
 * Two-arc animation between circular orbits with Δv₁, Δv₂, total Δv.
 */

import { circularRadius, periodFromSemiMajor } from '../sim/engine'
import type { ModuleDef, Params, ReadoutLine, DrawInput } from './types'
import { meanAnomaly, makeView } from './common'
import {
  drawEarth, drawOrbitPath, drawCraft, drawLabel, drawViewTag, drawInfoBox, EARTH_PX,
} from '../sim/scene'

const defaults: Params = { startAlt: 400, targetAlt: 35786 }

function getCircularV(r: number) { return Math.sqrt(398600 / r) }

export const module: ModuleDef = {
  id: 'hohmann',
  title: 'Hohmann Transfer',
  short: '5 Hohmann',
  blurb: 'Two-burn inter-orbit transfer',
  defaults,
  params: [
    { key: 'startAlt', label: 'Start altitude', min: 200, max: 35000, step: 100, unit: 'km' },
    { key: 'targetAlt', label: 'Target altitude', min: 300, max: 36000, step: 100, unit: 'km' },
  ],
  phasePeriod: (p) => periodFromSemiMajor(circularRadius(p.startAlt)),
  readout(p: Params, unit: 'kms' | 'kmin'): ReadoutLine[] {
    const r1 = circularRadius(p.startAlt)
    const r2 = circularRadius(Math.max(p.targetAlt, p.startAlt + 100))
    const aT = (r1 + r2) / 2
    const v1 = getCircularV(r1)
    const v2 = getCircularV(r2)
    const vTPeri = Math.sqrt(398600 * (2 / r1 - 1 / aT))
    const vTApo = Math.sqrt(398600 * (2 / r2 - 1 / aT))
    const dv1 = vTPeri - v1
    const dv2 = v2 - vTApo
    const tTransfer = Math.PI * Math.sqrt(aT ** 3 / 398600)
    return [
      { label: 'Δv₁', value: unit === 'kms' ? `${dv1.toFixed(3)} km/s` : `${(dv1 * 60).toFixed(1)} km/min` },
      { label: 'Δv₂', value: unit === 'kms' ? `${dv2.toFixed(3)} km/s` : `${(dv2 * 60).toFixed(1)} km/min` },
      { label: 'Total Δv', value: unit === 'kms' ? `${(dv1 + dv2).toFixed(3)} km/s` : `${((dv1 + dv2) * 60).toFixed(1)} km/min`, color: '#ffd60a' },
      { label: 't transfer', value: `${(tTransfer / 60).toFixed(1)} min` },
      { label: 'v start', value: unit === 'kms' ? `${v1.toFixed(3)} km/s` : `${(v1 * 60).toFixed(1)} km/min` },
      { label: 'v target', value: unit === 'kms' ? `${v2.toFixed(3)} km/s` : `${(v2 * 60).toFixed(1)} km/min` },
    ]
  },
  draw(inp: DrawInput, p: Params): void {
    const r1 = circularRadius(p.startAlt)
    const r2 = circularRadius(Math.max(p.targetAlt, p.startAlt + 100))
    const aT = (r1 + r2) / 2
    const eT = (r2 - r1) / (r1 + r2)
    const v1 = getCircularV(r1)
    const v2 = getCircularV(r2)
    const vTPeri = Math.sqrt(398600 * (2 / r1 - 1 / aT))
    const vTApo = Math.sqrt(398600 * (2 / r2 - 1 / aT))
    const dv1 = vTPeri - v1
    const dv2 = v2 - vTApo
    const tTransfer = Math.PI * Math.sqrt(aT ** 3 / 398600)
    const T1 = periodFromSemiMajor(r1)
    const cycle = T1 + tTransfer + periodFromSemiMajor(r2)
    const cycleTime = inp.time % cycle

    let phase: string, nu: number
    if (cycleTime < T1) {
      phase = 'initial'
      nu = meanAnomaly(cycleTime, T1)
    } else if (cycleTime < T1 + tTransfer) {
      phase = 'transfer'
      nu = ((cycleTime - T1) / tTransfer) * Math.PI
    } else {
      phase = 'final'
      nu = meanAnomaly(cycleTime - T1 - tTransfer, periodFromSemiMajor(r2))
    }

    const topV = makeView(inp.top)
    drawEarth(inp.top, topV.cx, topV.cy, EARTH_PX)
    drawOrbitPath(inp.top, topV.cx, topV.cy, topV.scale, r1, 0, { color: '#4dd0e1' })
    drawOrbitPath(inp.top, topV.cx, topV.cy, topV.scale, r2, 0, { color: '#4dd0e1' })
    drawOrbitPath(inp.top, topV.cx, topV.cy, topV.scale, aT, eT, { color: '#ffb300', dashed: true, width: 3 })

    drawLabel(inp.top, `Δv₁ →`, topV.cx + r1 * topV.scale + 8, topV.cy - 20, { color: '#ffb300', size: 16, bold: true })
    drawLabel(inp.top, `← Δv₂`, topV.cx - r2 * topV.scale - 55, topV.cy - 20, { color: '#ffb300', size: 16, bold: true })

    let sx: number, sy: number
    if (phase === 'initial') {
      sx = topV.cx + r1 * topV.scale * Math.cos(nu)
      sy = topV.cy + r1 * topV.scale * Math.sin(nu)
    } else if (phase === 'transfer') {
      const rT = aT * (1 - eT * eT) / (1 + eT * Math.cos(nu))
      sx = topV.cx + rT * topV.scale * Math.cos(nu)
      sy = topV.cy + rT * topV.scale * Math.sin(nu)
    } else {
      sx = topV.cx + r2 * topV.scale * Math.cos(nu)
      sy = topV.cy + r2 * topV.scale * Math.sin(nu)
    }
    drawCraft(inp.top, sx, sy, nu + Math.PI / 2)

    drawInfoBox(inp.top, 14, 48, [
      { label: 'Δv₁', value: `${dv1.toFixed(3)} km/s` },
      { label: 'Δv₂', value: `${dv2.toFixed(3)} km/s` },
      { label: 'Total Δv', value: `${(dv1 + dv2).toFixed(3)} km/s`, color: '#ffd60a' },
      { label: 't transfer', value: `${(tTransfer / 60).toFixed(1)} min` },
    ])
    drawViewTag(inp.top, 'TOP-DOWN')
  },
}
