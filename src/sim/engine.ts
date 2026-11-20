/**
 * ASGC Orbital Mechanics — physics engine.
 *
 * Pure TypeScript, zero dependencies, zero DOM. Every value is closed-form
 * (or solved from Kepler's equation) so results are numerically exact
 * against the analytic two-body mechanics:
 *
 *   circular velocity  v = sqrt(mu / r)
 *   orbital period     T = 2*pi*sqrt(a^3 / mu)
 *   vis-viva           v^2 = mu * (2/r - 1/a)
 *   Kepler             M = E - e*sin(E)
 *   Hohmann            two-impulse transfer between circular orbits
 *
 * Units: kilometers, seconds, km^3/s^2.
 */

export const MU = 398600 // km^3/s^2  (Earth gravitational parameter)
export const R_EARTH = 6371 // km (mean Earth radius)
export const TWO_PI = Math.PI * 2

export interface Vec2 {
  x: number
  y: number
}

export type OrbitType = 'circular' | 'elliptical' | 'hyperbolic'

export interface StateVec {
  r: Vec2
  v: Vec2
}

export interface Elements {
  /** Semi-major axis (km); negative for hyperbolic trajectories. */
  a: number
  /** Eccentricity (>= 1 for hyperbolic). */
  e: number
  /** Periapsis radius (km). */
  peri: number
  /** Apoapsis radius (km); null for hyperbolic (no apoapsis). */
  apo: number | null
  /** Orbital period (s); null for hyperbolic. */
  T: number | null
  type: OrbitType
  /** Unit vector pointing from focus (Earth) to periapsis. (1,0) for circular. */
  eDir: Vec2
  /** Semi-latus rectum p = h^2/mu (km). */
  p: number
}

/* ------------------------------------------------------------------ */
/* Basic closed-form relations                                         */
/* ------------------------------------------------------------------ */

/** Orbit radius (km) for a circular orbit at the given altitude (km). */
export function circularRadius(altitudeKm: number): number {
  return R_EARTH + altitudeKm
}

/** Circular orbital velocity v = sqrt(mu/r) (km/s). */
export function circularVelocity(r: number): number {
  return Math.sqrt(MU / r)
}

/** Orbital period T = 2*pi*sqrt(a^3/mu) (s) for semi-major axis a (km). */
export function periodFromSemiMajor(a: number): number {
  return TWO_PI * Math.sqrt((a * a * a) / MU)
}

/** Vis-viva velocity v = sqrt(mu*(2/r - 1/a)) (km/s). */
export function visViva(a: number, r: number): number {
  return Math.sqrt(MU * (2 / r - 1 / a))
}

/** Periapsis / apoapsis radii of an ellipse (km). */
export function ellipseRadii(a: number, e: number): { peri: number; apo: number } {
  return { peri: a * (1 - e), apo: a * (1 + e) }
}

/**
 * Maximum eccentricity such that periapsis stays above minPerigeeAlt km.
 * e_max = 1 - (R_EARTH + minPerigeeAlt) / a
 */
export function maxEccentricity(a: number, minPerigeeAlt = 200): number {
  return Math.min(0.95, 1 - (R_EARTH + minPerigeeAlt) / a)
}

/** Clamp (a, e) so periapsis >= R_EARTH + minPerigeeAlt; returns {a, e, clamped}. */
export function clampPerigee(
  a: number,
  e: number,
  minPerigeeAlt = 200,
): { a: number; e: number; clamped: boolean } {
  const eMax = maxEccentricity(a, minPerigeeAlt)
  if (e <= eMax) return { a, e, clamped: false }
  return { a, e: eMax, clamped: true }
}

/* ------------------------------------------------------------------ */
/* Kepler's equation & Keplerian propagation                           */
/* ------------------------------------------------------------------ */

/**
 * Solve Kepler's equation M = E - e*sin(E) for the eccentric anomaly E.
 * Newton iteration with a bisection fallback (f is monotone for e < 1).
 * M is normalized to [0, 2*pi). Result E in [0, 2*pi).
 */
export function solveKepler(M: number, e: number): number {
  const m = ((M % TWO_PI) + TWO_PI) % TWO_PI
  if (e < 1e-9) return m
  let E = e < 0.8 ? m + e * Math.sin(m) : m + e * Math.sin(m) * 0.5
  for (let i = 0; i < 30; i++) {
    const f = E - e * Math.sin(E) - m
    const fp = 1 - e * Math.cos(E)
    const d = f / fp
    E -= d
    if (Math.abs(d) < 1e-13) break
  }
  // Bisection fallback (guaranteed convergence, monotone f).
  if (Math.abs(E - e * Math.sin(E) - m) > 1e-10) {
    let lo = 0
    let hi = TWO_PI
    for (let i = 0; i < 80; i++) {
      const mid = 0.5 * (lo + hi)
      if (mid - e * Math.sin(mid) - m < 0) lo = mid
      else hi = mid
    }
    E = 0.5 * (lo + hi)
  }
  return E
}

/** True anomaly from eccentric anomaly: nu = 2*atan2(sqrt(1+e)*sin(E/2), sqrt(1-e)*cos(E/2)). */
export function trueAnomalyFromEccentric(E: number, e: number): number {
  return (
    2 *
    Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2),
    )
  )
}

/**
 * Eccentric anomaly from true anomaly (e < 1), branch-safe via atan2.
 * E = 2*atan2(sqrt(1-e)*sin(nu/2), sqrt(1+e)*cos(nu/2))
 */
export function eccentricAnomalyFromTrueAnomaly(nu: number, e: number): number {
  return (
    2 *
    Math.atan2(
      Math.sqrt(1 - e) * Math.sin(nu / 2),
      Math.sqrt(1 + e) * Math.cos(nu / 2),
    )
  )
}

/** Radius at a given true anomaly: r = a*(1-e^2)/(1+e*cos(nu)). */
export function radiusAtTrueAnomaly(a: number, e: number, nu: number): number {
  return (a * (1 - e * e)) / (1 + e * Math.cos(nu))
}

/**
 * Position on an ellipse (focus at origin, periapsis on +x) at mean anomaly M.
 * Returns { nu, r, E }.
 */
export function positionFromElements(a: number, e: number, M: number): { nu: number; r: number; E: number } {
  const E = solveKepler(M, e)
  const nu = trueAnomalyFromEccentric(E, e)
  const r = a * (1 - e * Math.cos(E))
  return { nu, r, E }
}

/* ------------------------------------------------------------------ */
/* State vector <-> orbital elements                                   */
/* ------------------------------------------------------------------ */

/** Full orbital elements from a (r, v) state vector, Earth at the origin. */
export function elementsFromState(s: StateVec): Elements {
  const { r, v } = s
  const rMag = Math.hypot(r.x, r.y)
  const vMag = Math.hypot(v.x, v.y)
  const v2 = vMag * vMag
  const rv = r.x * v.x + r.y * v.y
  const h = r.x * v.y - r.y * v.x // specific angular momentum (km^2/s)
  const energy = v2 / 2 - MU / rMag

  const eVecX = ((v2 - MU / rMag) * r.x - rv * v.x) / MU
  const eVecY = ((v2 - MU / rMag) * r.y - rv * v.y) / MU
  const e = Math.hypot(eVecX, eVecY)

  const p = (h * h) / MU

  // a = -mu / (2*energy): positive when bound, negative when hyperbolic.
  const a = energy > 0 ? -Infinity : -MU / (2 * energy)

  let eDir: Vec2
  if (e > 1e-9) eDir = { x: eVecX / e, y: eVecY / e }
  else eDir = { x: 1, y: 0 }

  let type: OrbitType
  let peri: number
  let apo: number | null
  let T: number | null

  if (energy >= 0) {
    type = 'hyperbolic'
    peri = p / (1 + e)
    apo = null
    T = null
  } else if (e < 1e-9) {
    type = 'circular'
    peri = a
    apo = a
    T = periodFromSemiMajor(a)
  } else {
    type = 'elliptical'
    peri = a * (1 - e)
    apo = a * (1 + e)
    T = periodFromSemiMajor(a)
  }

  return { a, e, peri, apo, T, type, eDir, p }
}

/** Circular state vector at altitude (km), position angle theta (rad). */
export function circularState(altitudeKm: number, theta = 0): StateVec {
  const r = circularRadius(altitudeKm)
  const v = circularVelocity(r)
  return {
    r: { x: r * Math.cos(theta), y: r * Math.sin(theta) },
    v: { x: -v * Math.sin(theta), y: v * Math.cos(theta) },
  }
}

/**
 * Apply an impulsive delta-v (km/s) to the state, prograde (+) or
 * retrograde (-) along the velocity vector.
 */
export function applyImpulse(s: StateVec, dv: number, prograde: boolean): StateVec {
  const vMag = Math.hypot(s.v.x, s.v.y)
  if (vMag < 1e-9) return s
  const f = prograde ? 1 + dv / vMag : Math.max(0, 1 - dv / vMag)
  return {
    r: { ...s.r },
    v: { x: s.v.x * f, y: s.v.y * f },
  }
}

/**
 * Propagate a state vector by dt (s) — exact for bound 2-body motion via
 * Kepler's equation; RK4 on d(nu)/dt = h/r^2 for hyperbolic trajectories.
 */
export function propagateState(s: StateVec, dt: number): StateVec {
  if (dt === 0) return { r: { ...s.r }, v: { ...s.v } }
  const el = elementsFromState(s)

  if (el.type === 'hyperbolic') {
    return rk4Hyperbolic(s, dt)
  }

  // True anomaly at t=0 from the state.
  const rMag = Math.hypot(s.r.x, s.r.y)
  const rv = s.r.x * s.v.x + s.r.y * s.v.y
  const h = s.r.x * s.v.y - s.r.y * s.v.x

  let E0: number
  if (el.e < 1e-9) {
    E0 = Math.atan2(s.r.y, s.r.x)
  } else {
    const cosNu = (el.p / rMag - 1) / el.e
    const sinNu = (h / Math.sqrt(MU * el.p)) * (rv / rMag)
    const nu0 = Math.atan2(sinNu, Math.min(1, Math.max(-1, cosNu)))
    E0 = eccentricAnomalyFromTrueAnomaly(nu0, el.e)
  }

  const M = E0 - el.e * Math.sin(E0)
  const MNew = M + TWO_PI * (dt / (el.T as number))
  const { nu, r: rNew } = positionFromElements(el.a, el.e, MNew)

  const ex = el.e > 1e-9 ? el.eDir.x : 1
  const ey = el.e > 1e-9 ? el.eDir.y : 0
  const px = ex * rNew * Math.cos(nu) - ey * rNew * Math.sin(nu)
  const py = ey * rNew * Math.cos(nu) + ex * rNew * Math.sin(nu)

  // Velocity in the periapsis frame: v_r = (mu/h) e sin(nu),
  // v_t = (mu/h) (1 + e cos(nu)); h = sqrt(mu p). Exact vis-viva decomposition.
  const hMag = Math.sqrt(MU * el.p)
  const vr = (MU / hMag) * el.e * Math.sin(nu) // radial: (mu/h) e sin(nu)
  const vt = (MU / hMag) * (1 + el.e * Math.cos(nu)) // tangential: (mu/h)(1 + e cos(nu))
  // Rotate the periapsis-frame velocity (vr*e_r + vt*e_theta, e_r=(cos nu, sin nu))
  // into the inertial frame via eDir.
  const cN = Math.cos(nu)
  const sN = Math.sin(nu)
  const vpx = vr * cN - vt * sN
  const vpy = vr * sN + vt * cN
  const vx = ex * vpx - ey * vpy
  const vy = ey * vpx + ex * vpy
  return {
    r: { x: px, y: py },
    v: { x: vx, y: vy },
  }
}

/**
 * Hyperbolic propagation: RK4 on the exact conic rate d(nu)/dt = h / r^2.
 */
function rk4Hyperbolic(s: StateVec, dt: number): StateVec {
  const el = elementsFromState(s)
  const h = s.r.x * s.v.y - s.r.y * s.v.x
  const ex = el.eDir.x
  const ey = el.eDir.y
  // nu in the periapsis frame from the state:
  const rx = s.r.x * ex + s.r.y * ey
  const ry = -s.r.x * ey + s.r.y * ex
  let nu = Math.atan2(ry, rx)
  const p = el.p
  const deriv = (nu: number): number => {
    const r = p / (1 + el.e * Math.cos(nu))
    return h / (r * r)
  }
  const n = Math.min(Math.max(1, Math.round(Math.abs(dt) / 0.25)), 4000)
  const hstep = dt / n
  for (let i = 0; i < n; i++) {
    const k1 = deriv(nu)
    const k2 = deriv(nu + 0.5 * hstep * k1)
    const k3 = deriv(nu + 0.5 * hstep * k2)
    const k4 = deriv(nu + hstep * k3)
    nu += (hstep / 6) * (k1 + 2 * k2 + 2 * k3 + k4)
  }
  const rNew = p / (1 + el.e * Math.cos(nu))
  const px = ex * rNew * Math.cos(nu) - ey * rNew * Math.sin(nu)
  const py = ey * rNew * Math.cos(nu) + ex * rNew * Math.sin(nu)
  // velocity: v = (mu/h) * (-sin(nu), e + cos(nu)) in the periapsis frame
  const vx = (MU / h) * -Math.sin(nu)
  const vy = (MU / h) * (el.e + Math.cos(nu))
  return {
    r: { x: px, y: py },
    v: { x: ex * vx - ey * vy, y: ey * vx + ex * vy },
  }
}

/* ------------------------------------------------------------------ */
/* Hohmann transfer (two-impulse, coplanar)                            */
/* ------------------------------------------------------------------ */

export interface HohmannResult {
  /** Radii of the two circular orbits (km). */
  r1: number
  r2: number
  /** Transfer-ellipse semi-major axis / eccentricity. */
  aT: number
  eT: number
  /** Burn 1: prograde at r1 (km/s). */
  dv1: number
  /** Burn 2: prograde at r2 (km/s). */
  dv2: number
  /** Total delta-v (km/s). */
  totalDv: number
  /** Transfer time: half period of the transfer ellipse (s). */
  timeS: number
  /** Circular velocities of the two orbits (km/s). */
  v1: number
  v2: number
  /** Velocity on the transfer ellipse at perigee / apoapsis (km/s). */
  vTPeri: number
  vTApo: number
}

/**
 * Hohmann transfer between circular orbits of radii r1 and r2 (r2 > r1).
 * Each burn's delta-v comes straight from vis-viva at the burn radius.
 */
export function hohmannTransfer(r1: number, r2: number): HohmannResult {
  const [rin, rout] = r1 < r2 ? [r1, r2] : [r2, r1]
  const aT = (rin + rout) / 2
  const eT = (rout - rin) / (rout + rin)
  const v1 = circularVelocity(rin)
  const v2 = circularVelocity(rout)
  const vTPeri = visViva(aT, rin)
  const vTApo = visViva(aT, rout)
  const dv1 = vTPeri - v1 // prograde burn at the inner orbit
  const dv2 = v2 - vTApo // prograde burn at the outer orbit
  const timeS = Math.PI * Math.sqrt((aT * aT * aT) / MU) // half period
  return {
    r1: rin,
    r2: rout,
    aT,
    eT,
    dv1,
    dv2,
    totalDv: dv1 + dv2,
    timeS,
    v1,
    v2,
    vTPeri,
    vTApo,
  }
}

/* ------------------------------------------------------------------ */
/* Display helpers (units)                                             */
/* ------------------------------------------------------------------ */

/** Convert km/s to km/min (display conversion only). */
export function kmSToKmMin(vKms: number): number {
  return vKms * 60
}

/** Format a duration (s) as "92.8 min" or "5 h 17 m". */
export function formatPeriod(s: number): string {
  const min = s / 60
  if (min < 60) return `${min.toFixed(1)} min`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m === 0 ? `${h} h` : `${h} h ${m} m`
}

/** Format a velocity in the active display unit. */
export function formatVelocity(vKms: number, unit: 'kms' | 'kmin'): string {
  return unit === 'kms' ? `${vKms.toFixed(3)} km/s` : `${kmSToKmMin(vKms).toFixed(1)} km/min`
}
