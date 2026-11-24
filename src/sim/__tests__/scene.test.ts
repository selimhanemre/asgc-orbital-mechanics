import { describe, expect, it } from 'vitest'
import {
  EARTH_PX,
  FRAME_MARGIN,
  MAX_ORBIT_KM,
  fixedScale,
} from '../scene'
import { makeView } from '../../modules/common'

describe('fixed scene scale (ASGC-2.2)', () => {
  it('MAX_ORBIT_KM is the largest slider-reachable a·(1+e) across all modules', () => {
    // elliptical: a=42000, e=0.95 (slider maxima; the UI does not apply the
    // perigee clamp) → 42000 × 1.95
    expect(42000 * 1.95).toBe(MAX_ORBIT_KM)
    // every other module's max must not exceed it
    expect(42000 * 1.5).toBeLessThanOrEqual(MAX_ORBIT_KM) // kepler
    expect(6371 + 36000).toBeLessThanOrEqual(MAX_ORBIT_KM) // circular / hohmann
    expect(6371 + 400).toBeLessThanOrEqual(MAX_ORBIT_KM) // altitudePeriod
  })

  it('fixedScale fits MAX_ORBIT_KM with FRAME_MARGIN of the half-min-dimension', () => {
    const w = 800
    const h = 600
    const expected = (Math.min(w, h) / 2) * (1 - FRAME_MARGIN)
    expect(fixedScale(w, h) * MAX_ORBIT_KM).toBeCloseTo(expected, 10)
  })

  it('fixedScale depends only on the minimum canvas dimension', () => {
    expect(fixedScale(1000, 600)).toBe(fixedScale(600, 1000))
    expect(fixedScale(600, 600)).toBe(fixedScale(600, 900))
  })

  it('Earth is a fixed positive pixel radius constant', () => {
    expect(EARTH_PX).toBeGreaterThan(0)
    expect(Number.isInteger(EARTH_PX)).toBe(true)
  })
})

describe('makeView', () => {
  const c = { ctx: null as unknown as CanvasRenderingContext2D, w: 800, h: 600 }

  it('pins Earth at the canvas center', () => {
    const v = makeView(c)
    expect(v.cx).toBe(400)
    expect(v.cy).toBe(300)
  })

  it('uses the fixed scale (independent of the current orbit)', () => {
    const v = makeView(c)
    expect(v.scale).toBe(fixedScale(800, 600))
    // the governing max orbit lands inside the canvas; the tight fit is
    // along the min dimension (h=600), which carries exactly FRAME_MARGIN
    const [x] = v.X(MAX_ORBIT_KM, 0)
    expect(x - v.cx).toBeCloseTo(300 * (1 - FRAME_MARGIN), 8)
    expect(x - v.cx).toBeLessThan(400)
    const [, y] = v.X(0, MAX_ORBIT_KM)
    expect(y - v.cy).toBeLessThan(300)
    expect(300 - (y - v.cy)).toBeCloseTo(300 * FRAME_MARGIN, 8)
  })

  it('maps km offsets through the fixed scale', () => {
    const v = makeView(c)
    const [x, y] = v.X(1000, -500)
    expect(x).toBeCloseTo(400 + 1000 * v.scale, 10)
    expect(y).toBeCloseTo(300 - 500 * v.scale, 10)
  })
})
