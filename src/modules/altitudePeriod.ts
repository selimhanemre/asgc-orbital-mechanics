/**
 * Module 4 — Altitude–Period Relationship
 * Side-view canvas is the graph: T vs altitude.
 * Top-down canvas shows the live orbit matching the point.
 */

import { circularRadius, circularVelocity, periodFromSemiMajor } from '../sim/engine'
import type { ModuleDef, Params, ReadoutLine, DrawInput } from './types'
import { meanAnomaly, makeView } from './common'
import {
  drawSpaceBackground, drawEarth, drawOrbitPath, drawCraft, drawViewTag,
} from '../sim/scene'

const defaults: Params = { altitude: 400 }

const ALT_MAX = 40000
const GRAPH_PAD = 70
const GRAPH_TOP = 40

function drawGraph(c: CanvasRenderingContext2D, w: number, h: number, altKm: number): void {
  const plotW = w - GRAPH_PAD * 2
  const plotH = h - GRAPH_TOP - 50

  c.fillStyle = '#0b1020'
  c.fillRect(0, 0, w, h)

  c.strokeStyle = 'rgba(255,255,255,0.12)'
  c.lineWidth = 1
  c.fillStyle = '#8a94b8'
  c.font = '500 12px system-ui, sans-serif'
  c.textAlign = 'center'
  for (const a of [0, 5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000]) {
    const x = GRAPH_PAD + (a / ALT_MAX) * plotW
    c.beginPath(); c.moveTo(x, GRAPH_TOP); c.lineTo(x, GRAPH_TOP + plotH); c.stroke()
    c.fillText(`${a / 1000}k`, x, GRAPH_TOP + plotH + 18)
  }
  const T0 = periodFromSemiMajor(circularRadius(0))
  const T1 = periodFromSemiMajor(circularRadius(ALT_MAX))
  c.textAlign = 'right'
  for (const t of [0, 20, 40, 60, 80, 100]) {
    const frac = t / 100
    const y = GRAPH_TOP + plotH * (1 - frac)
    c.beginPath(); c.moveTo(GRAPH_PAD, y); c.lineTo(GRAPH_PAD + plotW, y); c.stroke()
    c.fillText(`${t}m`, GRAPH_PAD - 8, y + 4)
  }

  c.strokeStyle = '#4dd0e1'
  c.lineWidth = 3
  c.beginPath()
  let first = true
  for (let alt = 0; alt <= ALT_MAX; alt += 100) {
    const r = circularRadius(alt)
    const T = periodFromSemiMajor(r)
    const x = GRAPH_PAD + (alt / ALT_MAX) * plotW
    const frac = (T - T0) / (T1 - T0)
    const y = GRAPH_TOP + plotH * (1 - frac)
    if (first) { c.moveTo(x, y); first = false }
    else c.lineTo(x, y)
  }
  c.stroke()

  const px = GRAPH_PAD + (altKm / ALT_MAX) * plotW
  const r = circularRadius(altKm)
  const T = periodFromSemiMajor(r)
  const frac = (T - T0) / (T1 - T0)
  const py = GRAPH_TOP + plotH * (1 - frac)

  const glow = c.createRadialGradient(px, py, 0, px, py, 18)
  glow.addColorStop(0, 'rgba(255,220,110,0.5)')
  glow.addColorStop(1, 'rgba(255,220,110,0)')
  c.fillStyle = glow
  c.beginPath(); c.arc(px, py, 18, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#ffd60a'; c.strokeStyle = '#fff'; c.lineWidth = 2
  c.beginPath(); c.arc(px, py, 10, 0, Math.PI * 2); c.fill(); c.stroke()

  c.fillStyle = '#c3cbe0'
  c.font = '600 14px system-ui, sans-serif'
  c.textAlign = 'center'
  c.fillText('Altitude (km)', GRAPH_PAD + plotW / 2, h - 8)
  c.save()
  c.translate(16, GRAPH_TOP + plotH / 2)
  c.rotate(-Math.PI / 2)
  c.fillText('Period (min)', 0, 0)
  c.restore()
}

export const module: ModuleDef = {
  id: 'altitudePeriod',
  title: 'Alt–Period',
  short: '4 Alt–Period',
  blurb: 'Interactive altitude–period curve',
  defaults,
  params: [],
  phasePeriod: (p) => periodFromSemiMajor(circularRadius(p.altitude)),
  readout(p: Params, unit: 'kms' | 'kmin'): ReadoutLine[] {
    const alt = p.altitude
    const r = circularRadius(alt)
    const T = periodFromSemiMajor(r)
    const v = circularVelocity(r)
    return [
      { label: 'altitude', value: `${alt.toLocaleString()} km` },
      { label: 'T', value: `${(T / 60).toFixed(1)} min` },
      { label: 'r', value: `${r.toLocaleString()} km` },
      { label: 'v', value: unit === 'kms' ? `${v.toFixed(3)} km/s` : `${(v * 60).toFixed(1)} km/min` },
      { label: 'a', value: `${r.toLocaleString()} km` },
      { label: 'T ∝ a^1.5', value: '✓' },
    ]
  },
  draw(inp: DrawInput, p: Params): void {
    const alt = p.altitude
    const r = circularRadius(alt)
    const T = periodFromSemiMajor(r)
    const nu = meanAnomaly(inp.time, T)

    const topV = makeView(inp.top, r)
    drawSpaceBackground(inp.top)
    drawEarth(inp.top, topV.cx, topV.cy, 6371 * topV.scale)
    drawOrbitPath(inp.top, topV.cx, topV.cy, topV.scale, r, 0, { color: '#4dd0e1' })
    const sx = topV.cx + r * topV.scale * Math.cos(nu)
    const sy = topV.cy + r * topV.scale * Math.sin(nu)
    drawCraft(inp.top, sx, sy, nu + Math.PI / 2)
    drawViewTag(inp.top, 'TOP-DOWN')

    const info = inp.side
    drawGraph(info.ctx, info.w, info.h, alt)
    drawViewTag(inp.side, 'PERIOD GRAPH')
  },
}
