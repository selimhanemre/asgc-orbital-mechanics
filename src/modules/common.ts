// Shared helpers for the learning modules: view mapping, unit formatting,
// phase computation.

import { fitScale, drawEarth, drawOrbitPath } from '../sim/scene'
import type { CanvasInfo } from '../sim/scene'
import type { Unit } from './types'

/** Format a speed in the selected display unit. */
export function fmtVel(vKms: number, unit: Unit): string {
  return unit === 'kms' ? `${vKms.toFixed(3)} km/s` : `${(vKms * 60).toFixed(1)} km/min`
}

export function fmtKm(km: number): string {
  return `${Math.round(km).toLocaleString('en-US')} km`
}

export function fmtPeriod(sec: number): string {
  const min = sec / 60
  if (min < 60) return `${min.toFixed(1)} min`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${h} h ${m} m`
}

export function meanAnomaly(time: number, phasePeriod: number, offset = 0): number {
  const f = (time / phasePeriod) % 1
  return 2 * Math.PI * (f < 0 ? f + 1 : f) + offset
}

export interface View {
  c: CanvasInfo
  scale: number
  cx: number
  cy: number
  /** km -> canvas px */
  X: (xKm: number, yKm: number) => readonly [number, number]
}

/** Build a view mapping for one canvas. rMaxKm = largest radius to fit. */
export function makeView(c: CanvasInfo, rMaxKm: number): View {
  const scale = fitScale(c.w, c.h, rMaxKm)
  const cx = c.w / 2
  const cy = c.h / 2
  return {
    c,
    scale,
    cx,
    cy,
    X: (xKm, yKm) => [cx + xKm * scale, cy + yKm * scale],
  }
}

/** Earth + orbit path in a view (focus at Earth center). */
export function drawBaseScene(
  v: View,
  orbit: { a: number; e: number; color?: string; dashed?: boolean; width?: number },
): void {
  const earthPx = Math.max(5, R_EARTH_PX(v))
  drawEarth(v.c, v.cx, v.cy, earthPx)
  drawOrbitPath(v.c, v.cx, v.cy, v.scale, orbit.a, orbit.e, {
    color: orbit.color,
    dashed: orbit.dashed,
    width: orbit.width,
  })
}

/** Pixel radius of Earth consistent with the km scale of the view. */
export function R_EARTH_PX(v: View): number {
  return 6371 * v.scale
}
