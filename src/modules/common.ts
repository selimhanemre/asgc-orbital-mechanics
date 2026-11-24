// Shared helpers for the learning modules: view mapping, unit formatting,
// phase computation.

import { fixedScale, drawEarth, drawOrbitPath, EARTH_PX } from '../sim/scene'
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

/**
 * Build a view mapping for one canvas.
 * The scale is FIXED (see fixedScale / MAX_ORBIT_KM in sim/scene): it does
 * NOT depend on the current orbit, so Earth stays pinned at the center and
 * orbital lines grow/shrink with the sliders instead of the scene refitting.
 */
export function makeView(c: CanvasInfo): View {
  const scale = fixedScale(c.w, c.h)
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
  drawEarth(v.c, v.cx, v.cy, EARTH_PX)
  drawOrbitPath(v.c, v.cx, v.cy, v.scale, orbit.a, orbit.e, {
    color: orbit.color,
    dashed: orbit.dashed,
    width: orbit.width,
  })
}
