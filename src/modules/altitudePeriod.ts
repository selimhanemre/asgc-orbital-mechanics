/**
 * Module 4 — Altitude–Period Relationship
 * Top-down canvas shows the live orbit, with the T-vs-altitude graph
 * drawn as an inset panel in the top-right corner (the dedicated
 * side-view canvas was removed; a graph-only view is a known follow-up).
 */

import { circularRadius, circularVelocity, periodFromSemiMajor } from '../sim/engine'
import type { ModuleDef, Params, ReadoutLine, DrawInput } from './types'
import { meanAnomaly, makeView } from './common'
import type { CanvasInfo } from '../sim/scene'
import {
  drawEarth, drawOrbitPath, drawCraft, drawViewTag, EARTH_PX,
} from '../sim/scene'

const defaults: Params = { altitude: 400 }

const ALT_MAX = 40000

/**
 * T vs altitude graph, drawn as a rounded inset panel on the top-down
 * canvas. Panel is anchored top-left at (x, y) with size w×h.
 */
function drawGraph(c: CanvasInfo, x: number, y: number, w: number, h: number, altKm: number): void {
  const { ctx } = c
  // panel background
  ctx.save()
  ctx.globalAlpha = 0.94
  ctx.fillStyle = '#0b1020'
  ctx.strokeStyle = '#33406b'
  ctx.lineWidth = 1.5
  const rad = 10
  ctx.beginPath()
  ctx.moveTo(x + rad, y)
  ctx.arcTo(x + w, y, x + w, y + h, rad)
  ctx.arcTo(x + w, y + h, x, y + h, rad)
  ctx.arcTo(x, y + h, x, y, rad)
  ctx.arcTo(x, y, x + w, y, rad)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.globalAlpha = 1

  const padL = 40
  const padR = 10
  const padT = 26
  const padB = 26
  const plotW = w - padL - padR
  const plotH = h - padT - padB

  // grid + x ticks (altitude, km)
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 1
  ctx.fillStyle = '#8a94b8'
  ctx.font = '500 12px system-ui, sans-serif'
  ctx.textAlign = 'center'
  for (const a of [0, 10000, 20000, 30000, 40000]) {
    const gx = x + padL + (a / ALT_MAX) * plotW
    ctx.beginPath(); ctx.moveTo(gx, y + padT); ctx.lineTo(gx, y + padT + plotH); ctx.stroke()
    ctx.fillText(`${a / 1000}k`, gx, y + padT + plotH + 15)
  }
  // y ticks (period, min)
  const T0 = periodFromSemiMajor(circularRadius(0))
  const T1 = periodFromSemiMajor(circularRadius(ALT_MAX))
  ctx.textAlign = 'right'
  for (const t of [0, 25, 50, 75, 100]) {
    const gy = y + padT + plotH * (1 - t / 100)
    ctx.beginPath(); ctx.moveTo(x + padL, gy); ctx.lineTo(x + padL + plotW, gy); ctx.stroke()
    ctx.fillText(`${t}m`, x + padL - 6, gy + 4)
  }

  // curve T(h)
  ctx.strokeStyle = '#4dd0e1'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  let first = true
  for (let alt = 0; alt <= ALT_MAX; alt += 500) {
    const T = periodFromSemiMajor(circularRadius(alt))
    const gx = x + padL + (alt / ALT_MAX) * plotW
    const gy = y + padT + plotH * (1 - (T - T0) / (T1 - T0))
    if (first) { ctx.moveTo(gx, gy); first = false } else ctx.lineTo(gx, gy)
  }
  ctx.stroke()

  // current point at the selected altitude
  const r = circularRadius(altKm)
  const T = periodFromSemiMajor(r)
  const px = x + padL + (altKm / ALT_MAX) * plotW
  const py = y + padT + plotH * (1 - (T - T0) / (T1 - T0))
  const glow = ctx.createRadialGradient(px, py, 0, px, py, 14)
  glow.addColorStop(0, 'rgba(255,220,110,0.5)')
  glow.addColorStop(1, 'rgba(255,220,110,0)')
  ctx.fillStyle = glow
  ctx.beginPath(); ctx.arc(px, py, 14, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#ffd60a'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke()

  // axis titles
  ctx.fillStyle = '#c3cbe0'
  ctx.font = '600 14px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Altitude (km)', x + padL + plotW / 2, y + h - 7)
  ctx.save()
  ctx.translate(x + 11, y + padT + plotH / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('Period (min)', 0, 0)
  ctx.restore()
  ctx.restore()
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

    const topV = makeView(inp.top)
    drawEarth(inp.top, topV.cx, topV.cy, EARTH_PX)
    drawOrbitPath(inp.top, topV.cx, topV.cy, topV.scale, r, 0, { color: '#4dd0e1' })
    const sx = topV.cx + r * topV.scale * Math.cos(nu)
    const sy = topV.cy + r * topV.scale * Math.sin(nu)
    drawCraft(inp.top, sx, sy, nu + Math.PI / 2)
    drawViewTag(inp.top, 'TOP-DOWN')

    // T-vs-altitude graph as a top-right inset (single-view layout —
    // follow-up: dedicated graph canvas replaces this inset).
    const gw = Math.round(Math.min(280, Math.max(150, inp.top.w * 0.4)))
    const gh = Math.round(Math.min(180, Math.max(110, inp.top.h * 0.38)))
    drawGraph(inp.top, inp.top.w - gw - 12, 12, gw, gh, alt)
  },
}
