/**
 * Module 6 — Launch / Insertion Mechanics
 * Prograde/retrograde burn controls that shape apogee/perigee.
 */

import { periodFromSemiMajor, elementsFromState, applyImpulse, circularState } from '../sim/engine'
import type { ModuleDef, Params, ReadoutLine, DrawInput } from './types'
import { makeView } from './common'
import {
  drawEarth, drawOrbitPath, drawCraft, drawViewTag, drawMarker, drawInfoBox, EARTH_PX,
} from '../sim/scene'

const defaults: Params = { dv: 0.5, prograde: 1 }
let _state: ReturnType<typeof circularState> = circularState(200, 0)
let _cumulativeDv = 0
let _ghostOrbits: Array<{ a: number; e: number }> = []

export function launchApplyBurn(prograde: boolean): void {
  const dv = 0.5
  _state = applyImpulse(_state, dv, prograde)
  _cumulativeDv += dv
  const el = elementsFromState(_state)
  _ghostOrbits.push({ a: Math.hypot(_state.r.x, _state.r.y), e: el.e })
  if (_ghostOrbits.length > 5) _ghostOrbits.shift()
}

export function launchReset(): void {
  _state = circularState(200, 0)
  _cumulativeDv = 0
  _ghostOrbits = []
}

export const module: ModuleDef = {
  id: 'launch',
  title: 'Launch / Insertion',
  short: '6 Launch',
  blurb: 'Prograde & retrograde burns',
  defaults,
  params: [
    { key: 'dv', label: 'Δv', min: 0.1, max: 5.0, step: 0.05, unit: 'km/s' },
  ],
  phasePeriod: (_p: Params) => {
    const el = elementsFromState(_state)
    return el.T ?? periodFromSemiMajor(Math.hypot(_state.r.x, _state.r.y))
  },
  readout: (_p: Params, unit: 'kms' | 'kmin'): ReadoutLine[] => {
    const el = elementsFromState(_state)
    const vMag = Math.hypot(_state.v.x, _state.v.y)
    return [
      { label: 'perigee', value: `${(el.peri - 6371).toFixed(0).toLocaleString()} km` },
      { label: 'apogee', value: `${((el.apo as number) - 6371).toFixed(0).toLocaleString()} km` },
      { label: 'e', value: el.e.toFixed(3) },
      { label: 'T', value: el.T ? `${(el.T / 60).toFixed(1)} min` : '∞' },
      { label: 'v (live)', value: unit === 'kms' ? `${vMag.toFixed(3)} km/s` : `${(vMag * 60).toFixed(1)} km/min` },
      { label: 'Δv used', value: `${_cumulativeDv.toFixed(2)} km/s`, color: '#ffd60a' },
    ]
  },
  draw(inp: DrawInput, p: Params): void {
    const el = elementsFromState(_state)
    const rMag = Math.hypot(_state.r.x, _state.r.y)
    // Fixed scale: apoapsis shaped by burn buttons (not sliders) may exceed
    // the frame after many prograde burns — expected; Reset restores.
    const topV = makeView(inp.top)

    // Ghost orbits
    for (const ghost of _ghostOrbits) {
      drawOrbitPath(inp.top, topV.cx, topV.cy, topV.scale, ghost.a, 0.2, { color: '#ffffff', dashed: true, width: 2, alpha: 0.35 })
    }

    // TOP-DOWN
    drawEarth(inp.top, topV.cx, topV.cy, EARTH_PX)
    const orbitR = el.type === 'circular' ? el.peri : el.a
    const orbitE = el.type === 'circular' ? 0 : el.e
    drawOrbitPath(inp.top, topV.cx, topV.cy, topV.scale, orbitR, orbitE, { color: '#4dd0e1' })

    const nu = Math.atan2(_state.r.y, _state.r.x)
    const heading = Math.atan2(_state.v.y, _state.v.x)
    const sx = topV.cx + rMag * topV.scale * Math.cos(nu)
    const sy = topV.cy + rMag * topV.scale * Math.sin(nu)
    drawCraft(inp.top, sx, sy, heading + Math.PI / 2)

    // Burn direction arrow
    const prograde = p.prograde ?? 1
    const arrowLen = 30
    const arrowAngle = heading + (prograde > 0 ? 0 : Math.PI)
    const { ctx: ctxT } = inp.top
    ctxT.save()
    ctxT.strokeStyle = prograde > 0 ? '#4dd0e1' : '#ff8a5c'
    ctxT.lineWidth = 4
    ctxT.beginPath()
    ctxT.moveTo(sx, sy)
    ctxT.lineTo(sx + arrowLen * Math.cos(arrowAngle), sy + arrowLen * Math.sin(arrowAngle))
    ctxT.stroke()
    ctxT.restore()

    if (el.apo !== null && el.e > 0.01) {
      drawMarker(inp.top, topV.cx + el.peri * topV.scale, topV.cy, `PERI ${(el.peri - 6371).toFixed(0)}`, '#4dd0e1')
      drawMarker(inp.top, topV.cx - el.apo * topV.scale, topV.cy, `APO ${(el.apo - 6371).toFixed(0)}`, '#ffd60a')
    }

    drawInfoBox(inp.top, 14, 48, [
      { label: 'perigee', value: `${(el.peri - 6371).toFixed(0).toLocaleString()} km` },
      { label: 'apogee', value: `${((el.apo as number) - 6371).toFixed(0).toLocaleString()} km` },
      { label: 'Δv used', value: `${_cumulativeDv.toFixed(2)} km/s`, color: '#ffd60a' },
    ])
    drawViewTag(inp.top, 'TOP-DOWN')
  },
}
