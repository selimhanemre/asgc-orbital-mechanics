import { describe, expect, it } from 'vitest'
import {
  MU,
  R_EARTH,
  applyImpulse,
  circularRadius,
  circularState,
  circularVelocity,
  clampPerigee,
  elementsFromState,
  formatPeriod,
  formatVelocity,
  hohmannTransfer,
  kmSToKmMin,
  maxEccentricity,
  periodFromSemiMajor,
  positionFromElements,
  propagateState,
  radiusAtTrueAnomaly,
  solveKepler,
  trueAnomalyFromEccentric,
  visViva,
  eccentricAnomalyFromTrueAnomaly,
} from '../engine'

describe('constants', () => {
  it('uses the real Earth gravitational parameter and radius', () => {
    expect(MU).toBe(398600)
    expect(R_EARTH).toBe(6371)
  })
})

describe('circular orbit v = sqrt(mu/r)', () => {
  it('matches the closed form at LEO (400 km, r=6771)', () => {
    // sqrt(398600/6771) = 7.67259439631368
    expect(circularVelocity(6771)).toBeCloseTo(7.67259439631368, 9)
  })
  it('matches the closed form at GEO (r=42157)', () => {
    // sqrt(398600/42157) = 3.07491983741804
    expect(circularVelocity(42157)).toBeCloseTo(3.07491983741804, 9)
  })
  it('is monotonically decreasing with radius', () => {
    expect(circularVelocity(7000)).toBeLessThan(circularVelocity(6771))
    expect(circularVelocity(42157)).toBeLessThan(circularVelocity(7000))
  })
  it('circularRadius adds Earth radius to altitude', () => {
    expect(circularRadius(400)).toBe(R_EARTH + 400)
    expect(circularRadius(35786)).toBe(42157)
  })
})

describe('orbital period T = 2*pi*sqrt(a^3/mu)', () => {
  it('matches the closed form at LEO (a=6771)', () => {
    // 2*pi*sqrt(6771^3/398600) = 5544.85816888132 s
    expect(periodFromSemiMajor(6771)).toBeCloseTo(5544.85816888132, 6)
  })
  it('matches the closed form at GEO (a=42157)', () => {
    // 86142.1620724870 s
    expect(periodFromSemiMajor(42157)).toBeCloseTo(86142.1620724870, 4)
  })
  it('satisfies the T^2 ∝ a^3 invariant (T^2/a^3 is constant)', () => {
    const k1 = periodFromSemiMajor(6771) ** 2 / 6771 ** 3
    const k2 = periodFromSemiMajor(12000) ** 2 / 12000 ** 3
    const k3 = periodFromSemiMajor(42157) ** 2 / 42157 ** 3
    // 4*pi^2/mu = 9.9043e-5 s^2/km^3
    expect(k1).toBeCloseTo(4 * Math.PI ** 2 / MU, 12)
    expect(k2).toBeCloseTo(k1, 12)
    expect(k3).toBeCloseTo(k1, 12)
  })
  it('matches the T^2/a^3 invariant in min^2/km^3', () => {
    // (5544.858/60)^2/6771^3 = 2.75118592883129e-8
    const k = (periodFromSemiMajor(6771) / 60) ** 2 / 6771 ** 3
    expect(k).toBeCloseTo(2.75118592883129e-8, 12)
  })
})

describe('vis-viva v^2 = mu(2/r - 1/a)', () => {
  it('reduces to circular velocity when r = a', () => {
    expect(visViva(6771, 6771)).toBeCloseTo(circularVelocity(6771), 12)
    expect(visViva(42157, 42157)).toBeCloseTo(circularVelocity(42157), 12)
  })
  it('matches the closed form at perigee and apogee (a=12000, e=0.3)', () => {
    // perigee r=8400: 7.85417692938574
    // apogee  r=15600: 4.22917219274617
    expect(visViva(12000, 8400)).toBeCloseTo(7.85417692938574, 9)
    expect(visViva(12000, 15600)).toBeCloseTo(4.22917219274617, 9)
  })
  it('satisfies energy conservation v^2/2 - mu/r = -mu/(2a)', () => {
    const a = 20000
    for (const r of [a * 0.7, a, a * 1.3]) {
      const v = visViva(a, r)
      const energy = (v * v) / 2 - MU / r
      expect(energy).toBeCloseTo(-MU / (2 * a), 6)
    }
  })
  it('gives the fastest speed at perigee and slowest at apogee', () => {
    expect(visViva(12000, 8400)).toBeGreaterThan(visViva(12000, 15600))
  })
})

describe("Kepler's equation M = E - e sin(E)", () => {
  it('solves to near-zero residual across eccentricities', () => {
    for (const e of [0, 0.3, 0.7, 0.9, 0.95]) {
      for (const M of [0.1, 1.0, 2.5, 4.0, 5.5, 6.28]) {
        const E = solveKepler(M, e)
        expect(Math.abs(E - e * Math.sin(E) - M)).toBeLessThan(1e-10)
      }
    }
  })
  it('returns M for a circular orbit (e=0)', () => {
    expect(solveKepler(2.3, 0)).toBeCloseTo(2.3, 12)
  })
  it('normalizes mean anomaly into [0, 2*pi)', () => {
    const E1 = solveKepler(1.0, 0.5)
    const E2 = solveKepler(1.0 + 2 * Math.PI, 0.5)
    expect(E1).toBeCloseTo(E2, 10)
  })
  it('trueAnomaly and eccentricAnomaly are inverse functions', () => {
    for (const e of [0.1, 0.5, 0.9]) {
      for (const nu of [0, 0.7, 1.9, 3.5, 5.0]) {
        const E = eccentricAnomalyFromTrueAnomaly(nu, e)
        const back = trueAnomalyFromEccentric(E, e)
        expect(back).toBeCloseTo(nu, 9)
      }
    }
  })
  it('radiusAtTrueAnomaly gives perigee/apogee at nu=0/pi', () => {
    const a = 12000
    const e = 0.3
    expect(radiusAtTrueAnomaly(a, e, 0)).toBeCloseTo(a * (1 - e), 9)
    expect(radiusAtTrueAnomaly(a, e, Math.PI)).toBeCloseTo(a * (1 + e), 9)
  })
  it('positionFromElements returns perigee at M=0 and apogee at M=pi', () => {
    const { nu, r } = positionFromElements(12000, 0.3, 0)
    expect(nu).toBeCloseTo(0, 9)
    expect(r).toBeCloseTo(8400, 6)
    const ap = positionFromElements(12000, 0.3, Math.PI)
    expect(ap.r).toBeCloseTo(15600, 6)
    expect(ap.nu).toBeCloseTo(Math.PI, 9)
  })
  it('sweeps equal areas in equal times (2nd law)', () => {
    // For a fixed delta-M (equal time), the swept area 0.5*∫r^2 dnu is constant.
    const a = 12000
    const e = 0.6
    const dM = 0.3
    const area = (m0: number) => {
      let sum = 0
      const N = 2000
      for (let i = 0; i < N; i++) {
        const m1 = m0 + (dM * i) / N
        const m2 = m0 + (dM * (i + 1)) / N
        const r1 = radiusAtTrueAnomaly(a, e, positionFromElements(a, e, m1).nu)
        const r2 = radiusAtTrueAnomaly(a, e, positionFromElements(a, e, m2).nu)
        const dnu =
          positionFromElements(a, e, m2).nu - positionFromElements(a, e, m1).nu
        sum += 0.5 * (r1 * r1 + r2 * r2) * dnu
      }
      return sum
    }
    // near perigee vs near apogee
    const aPeri = area(0)
    const aApo = area(Math.PI - dM / 2)
    expect(aPeri / aApo).toBeCloseTo(1, 4)
  })
})

describe('Hohmann transfer (vis-viva at each burn)', () => {
  it('matches closed form for LEO(400 km) to GEO(35786 km)', () => {
    const h = hohmannTransfer(6771, 42157)
    expect(h.aT).toBeCloseTo(24464, 9)
    expect(h.eT).toBeCloseTo(0.723225964682799, 9)
    // dv1 = sqrt(mu(2/r1-1/aT)) - sqrt(mu/r1)
    expect(h.dv1).toBeCloseTo(2.39935082630857, 6)
    // dv2 = sqrt(mu/r2) - sqrt(mu(2/r2-1/aT))
    expect(h.dv2).toBeCloseTo(1.45722547818054, 6)
    // total = 3.85657630448910
    expect(h.totalDv).toBeCloseTo(3.8565763044891, 6)
    // transfer time = pi*sqrt(aT^3/mu) = 19040.2404077338 s
    expect(h.timeS).toBeCloseTo(19040.2404077338, 4)
    expect(h.v1).toBeCloseTo(circularVelocity(6771), 12)
    expect(h.v2).toBeCloseTo(circularVelocity(42157), 12)
    expect(h.vTPeri).toBeCloseTo(visViva(h.aT, 6771), 12)
    expect(h.vTApo).toBeCloseTo(visViva(h.aT, 42157), 12)
  })
  it('total dv1+dv2 equals totalDv', () => {
    const h = hohmannTransfer(6771, 42157)
    expect(h.dv1 + h.dv2).toBeCloseTo(h.totalDv, 12)
  })
  it('symmetric in the two orbit radii (swapping order keeps magnitudes)', () => {
    const up = hohmannTransfer(6771, 42157)
    const down = hohmannTransfer(42157, 6771)
    // same geometry: magnitudes of burns and total are identical
    expect(down.aT).toBeCloseTo(up.aT, 12)
    expect(down.eT).toBeCloseTo(up.eT, 12)
    expect(down.timeS).toBeCloseTo(up.timeS, 12)
  })
})

describe('state vector -> elements & impulse (launch/insertion)', () => {
  it('recovers a circular orbit exactly', () => {
    const s = circularState(400, 1.2)
    const el = elementsFromState(s)
    expect(el.type).toBe('circular')
    expect(el.a).toBeCloseTo(6771, 6)
    expect(el.e).toBeLessThan(1e-9)
    expect(el.peri).toBeCloseTo(6771, 6)
    expect(el.apo).toBeCloseTo(6771, 6)
    expect(el.T).toBeCloseTo(periodFromSemiMajor(6771), 6)
  })
  it('prograde burn raises apogee and matches closed-form elements', () => {
    const s = circularState(200, 0)
    const after = applyImpulse(s, 0.5, true)
    const el = elementsFromState(after)
    expect(el.type).toBe('elliptical')
    expect(el.a).toBeCloseTo(7574.7794462443, 6)
    expect(el.e).toBeCloseTo(0.132515996454786, 9)
    // apogee altitude = 2207.55889248860 km
    expect((el.apo as number) - R_EARTH).toBeCloseTo(2207.5588924886, 6)
    // perigee stays at 200 km (burn at perigee)
    expect(el.peri - R_EARTH).toBeCloseTo(200, 6)
  })
  it('retrograde burn lowers perigee and matches closed-form elements', () => {
    const s = circularState(200, 0)
    const after = applyImpulse(s, 0.5, false)
    const el = elementsFromState(after)
    expect(el.type).toBe('elliptical')
    expect(el.a).toBeCloseTo(5844.6637761259, 6)
    expect(el.e).toBeCloseTo(0.124273397357948, 9)
    // perigee altitude = -1252.67244774819 km (dives through the planet)
    expect(el.peri - R_EARTH).toBeCloseTo(-1252.67244774819, 6)
    // apogee stays at 200 km
    expect((el.apo as number) - R_EARTH).toBeCloseTo(200, 6)
  })
  it('a large prograde burn from LEO goes hyperbolic', () => {
    const s = circularState(200, 0)
    const after = applyImpulse(s, 5.0, true)
    const el = elementsFromState(after)
    expect(el.type).toBe('hyperbolic')
    expect(el.e).toBeGreaterThan(1)
    expect(el.apo).toBeNull()
    expect(el.T).toBeNull()
    expect(el.a).toBeLessThan(0)
  })
  it('preserves specific energy correctly through the impulse', () => {
    const s = circularState(400, 0.5)
    const after = applyImpulse(s, 0.3, true)
    const r = Math.hypot(after.r.x, after.r.y)
    const v = Math.hypot(after.v.x, after.v.y)
    const el = elementsFromState(after)
    // energy from state equals -mu/(2a) from elements
    const energyState = (v * v) / 2 - MU / r
    expect(energyState).toBeCloseTo(-MU / (2 * el.a), 8)
  })
})

describe('propagation (Kepler time-of-flight)', () => {
  it('advances an elliptical orbit by exactly one period and returns to start', () => {
    const s = circularState(400, 0.3)
    const el = elementsFromState(s)
    const back = propagateState(s, el.T as number)
    expect(Math.hypot(back.r.x - s.r.x, back.r.y - s.r.y)).toBeLessThan(1e-6)
    expect(Math.hypot(back.v.x - s.v.x, back.v.y - s.v.y)).toBeLessThan(1e-6)
  })
  it('moves an elliptical orbit to apogee after half a period', () => {
    // build an elliptical state: perigee 200 km, apogee 20000 km, start at perigee
    const s0 = circularState(200, 0)
    const s = applyImpulse(s0, 2.0, true)
    const el = elementsFromState(s)
    expect(el.type).toBe('elliptical')
    const mid = propagateState(s, (el.T as number) / 2)
    const midEl = elementsFromState(mid)
    // at half period the craft is at apogee: radius ~ apo
    const rMid = Math.hypot(mid.r.x, mid.r.y)
    expect(rMid).toBeCloseTo(midEl.apo as number, 4)
  })
  it('conserves energy through propagation', () => {
    const s0 = circularState(400, 0)
    const s = applyImpulse(s0, 1.5, true)
    const el = elementsFromState(s)
    for (const frac of [0.1, 0.37, 0.9]) {
      const sp = propagateState(s, (el.T as number) * frac)
      const r = Math.hypot(sp.r.x, sp.r.y)
      const v = Math.hypot(sp.v.x, sp.v.y)
      expect((v * v) / 2 - MU / r).toBeCloseTo(-MU / (2 * el.a), 5)
    }
  })
  it('matches vis-viva speed at every propagated point', () => {
    const s0 = circularState(400, 0)
    const s = applyImpulse(s0, 1.5, true)
    const el = elementsFromState(s)
    for (const frac of [0.05, 0.25, 0.5, 0.75, 0.95]) {
      const sp = propagateState(s, (el.T as number) * frac)
      const r = Math.hypot(sp.r.x, sp.r.y)
      const v = Math.hypot(sp.v.x, sp.v.y)
      expect(v).toBeCloseTo(visViva(el.a, r), 6)
    }
  })
})

describe('perigee clamp (physical slider ranges)', () => {
  it('maxEccentricity keeps perigee at 200 km', () => {
    // e_max = 1 - (R+200)/a ; a=7000 -> 0.0612857142857143
    expect(maxEccentricity(7000)).toBeCloseTo(0.0612857142857143, 12)
    // at large a the 0.95 cap binds
    expect(maxEccentricity(200000)).toBeCloseTo(0.95, 12)
  })
  it('clampPerigee leaves valid orbits untouched', () => {
    const res = clampPerigee(24000, 0.3)
    expect(res.clamped).toBe(false)
    expect(res.e).toBe(0.3)
  })
  it('clampPerigee caps e so perigee >= 200 km', () => {
    const res = clampPerigee(7000, 0.5)
    expect(res.clamped).toBe(true)
    expect(res.e).toBeCloseTo(0.0612857142857143, 12)
    const peri = res.a * (1 - res.e)
    expect(peri - R_EARTH).toBeCloseTo(200, 6)
  })
})

describe('unit conversion & display formatting', () => {
  it('kmSToKmMin multiplies by 60', () => {
    expect(kmSToKmMin(7.67259439631368)).toBeCloseTo(460.355663778821, 9)
    expect(kmSToKmMin(1)).toBe(60)
  })
  it('formatVelocity switches unit and keeps the value consistent', () => {
    const v = 7.67259439631368
    expect(formatVelocity(v, 'kms')).toBe('7.673 km/s')
    expect(formatVelocity(v, 'kmin')).toBe('460.4 km/min')
  })
  it('formatPeriod shows minutes under 60 and h+m above', () => {
    expect(formatPeriod(5544.85816888132)).toBe('1 h 32 m')
    expect(formatPeriod(86142.162072487)).toBe('23 h 56 m')
    expect(formatPeriod(3540)).toBe('59.0 min')
    expect(formatPeriod(3600)).toBe('1 h')
  })
})

describe('altitude-period curve (module 4)', () => {
  it('reproduces closed-form periods across the slider range', () => {
    expect(periodFromSemiMajor(circularRadius(400))).toBeCloseTo(5544.85816888132, 4)
    // 20,000 km altitude: 2*pi*sqrt(26371^3/mu) = 42618.7903823003 s
    expect(periodFromSemiMajor(circularRadius(20000))).toBeCloseTo(42618.7903823003, 4)
    expect(periodFromSemiMajor(circularRadius(35786))).toBeCloseTo(86142.162072487, 3)
  })
  it('period grows monotonically with altitude', () => {
    let prev = 0
    for (const h of [200, 400, 1000, 4000, 20000, 35786, 36000]) {
      const T = periodFromSemiMajor(circularRadius(h))
      expect(T).toBeGreaterThan(prev)
      prev = T
    }
  })
})
