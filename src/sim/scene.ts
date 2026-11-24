// Imperative canvas scene helpers for the ASGC orbital mechanics tool.
// No React here — these draw into canvas contexts directly.

export interface CanvasInfo {
  ctx: CanvasRenderingContext2D
  /** CSS pixel width */
  w: number
  /** CSS pixel height */
  h: number
}

/**
 * Fixed scene scale (ASGC-2.2).
 *
 * The km→px scale is derived ONCE from the largest orbit reachable by the
 * sliders of ANY module — not refit per frame from the current orbit. This
 * pins Earth at the canvas center at a fixed pixel radius (EARTH_PX), so
 * dragging sliders grows/shrinks the orbital lines while Earth stays put.
 *
 * MAX_ORBIT_KM = max of a·(1+e) over every module's slider range:
 *   kepler:          42000 km a × (1 + 0.50 e)   = 63000 km
 *   circular:        6371 + 36000                = 42371 km
 *   elliptical:      42000 km a × (1 + 0.95 e)   = 81900 km  ← governing
 *   altitudePeriod:  6371 + 400 (fixed, no slider) = 6771 km
 *   hohmann:         6371 + 36000                = 42371 km
 *   launch:          6371 + 200 initial state; apoapsis is shaped by the burn
 *                    BUTTONS, not sliders, and can exceed the fixed frame
 *                    after enough prograde burns (expected; Reset restores).
 */
export const MAX_ORBIT_KM = 81900

/** Fraction of the half-min-dimension kept as margin around the max orbit. */
export const FRAME_MARGIN = 0.14

/** Fixed pixel radius of Earth (never moves or rescales with the sliders). */
export const EARTH_PX = 16

/* ── Typography (ASGC-2.4 — docs/DESIGN.md §3.2) ──────────────────────
 * Canvas text follows the SAME family + scale system as the DOM
 * (src/index.css tokens) so HUD labels and chips read as one system.
 * These constants are the mirror of the CSS custom properties; keep
 * them in lockstep when the scale changes.
 */
export const FONT_DISPLAY =
  '"Roboto Condensed", "Avenir Next Condensed", "Arial Narrow", "Helvetica Neue", Arial, sans-serif'
export const FONT_BODY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
/** Canvas-safe mono stack (no `ui-monospace` keyword — canvas font
 *  parsing is stricter than CSS). */
export const FONT_MONO =
  '"Roboto Mono", "SF Mono", Consolas, "DejaVu Sans Mono", monospace'

/** Explicit typescale: minor third (ratio 1.2), base 14px — mirrors --step-*. */
export const STEP = {
  stepMinus2: 10,
  stepMinus1: 12,
  step0: 14,
  step1: 17,
  step2: 20,
  step3: 24,
} as const

export type TypeFace = 'display' | 'body' | 'mono'

/** Build a canvas `ctx.font` string from weight + scale step + face. */
export function canvasFont(weight: number | string, step: number, face: TypeFace = 'body'): string {
  const stack = face === 'display' ? FONT_DISPLAY : face === 'mono' ? FONT_MONO : FONT_BODY
  return `${weight} ${step}px ${stack}`
}

/**
 * Fixed km -> px scale that fits MAX_ORBIT_KM inside the canvas with
 * FRAME_MARGIN of the half-min-dimension as breathing room.
 */
export function fixedScale(w: number, h: number): number {
  const minDim = Math.min(w, h)
  return ((minDim / 2) * (1 - FRAME_MARGIN)) / MAX_ORBIT_KM
}

/** Deterministic starfield (same stars for a given size bucket). */
export function drawSpaceBackground(c: CanvasInfo, seed = 7): void {
  const { ctx, w, h } = c
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#05070f')
  g.addColorStop(1, '#0a0f1e')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  let s = seed
  const rand = () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
  const n = Math.floor((w * h) / 2600)
  for (let i = 0; i < n; i++) {
    const x = rand() * w
    const y = rand() * h
    const r = rand() < 0.85 ? 0.7 : 1.3
    ctx.globalAlpha = 0.25 + rand() * 0.6
    ctx.fillStyle = '#cdd8ff'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

/**
 * Canvas-drawn Earth (no external assets): a simple gradient disk with a
 * subtle rim, atmospheric glow, and soft terminator shading.
 * No continents, no polar caps (removed in ASGC-2.5 — they distracted from
 * the lessons; if in doubt, simpler wins).
 * rPx = pixel radius (north-polar top-down view).
 */
export function drawEarth(c: CanvasInfo, cx: number, cy: number, rPx: number): void {
  const { ctx } = c
  if (rPx < 1) return
  ctx.save()
  ctx.translate(cx, cy)
  // atmospheric glow
  const glow = ctx.createRadialGradient(0, 0, rPx * 0.8, 0, 0, rPx * 1.35)
  glow.addColorStop(0, 'rgba(90,160,255,0.30)')
  glow.addColorStop(1, 'rgba(90,160,255,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(0, 0, rPx * 1.35, 0, Math.PI * 2)
  ctx.fill()
  // ocean body (simple radial gradient)
  const body = ctx.createRadialGradient(-rPx * 0.35, -rPx * 0.4, rPx * 0.2, 0, 0, rPx)
  body.addColorStop(0, '#3f8fd4')
  body.addColorStop(0.55, '#1f5fa8')
  body.addColorStop(1, '#0d2f63')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(0, 0, rPx, 0, Math.PI * 2)
  ctx.fill()
  // terminator shading (light from the left)
  const shade = ctx.createLinearGradient(-rPx, 0, rPx, 0)
  shade.addColorStop(0, 'rgba(0,0,0,0)')
  shade.addColorStop(0.7, 'rgba(0,0,20,0.08)')
  shade.addColorStop(1, 'rgba(0,0,25,0.55)')
  ctx.fillStyle = shade
  ctx.beginPath()
  ctx.arc(0, 0, rPx, 0, Math.PI * 2)
  ctx.fill()
  // subtle rim
  ctx.strokeStyle = 'rgba(91,155,248,0.45)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(0, 0, rPx - 0.5, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

/**
 * Draw an orbit ellipse whose focus sits at (cx, cy).
 * Periapsis lies along `orient` radians (default 0 = +x, prograde side).
 */
export function drawOrbitPath(
  c: CanvasInfo,
  cx: number,
  cy: number,
  scale: number,
  aKm: number,
  e: number,
  opts: {
    color?: string
    width?: number
    dashed?: boolean
    orient?: number
    alpha?: number
  } = {},
): void {
  const { ctx } = c
  const a = Math.abs(aKm)
  const b = a * Math.sqrt(Math.max(0, 1 - e * e))
  const orient = opts.orient ?? 0
  const offX = -a * e
  const offY = 0
  // rotate the center offset by orient
  const cRot = Math.cos(orient)
  const sRot = Math.sin(orient)
  const centerX = cx + (offX * cRot - offY * sRot) * scale
  const centerY = cy + (offX * sRot + offY * cRot) * scale
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(orient)
  ctx.globalAlpha = opts.alpha ?? 1
  ctx.strokeStyle = opts.color ?? '#7fd4ff'
  ctx.lineWidth = opts.width ?? 1.6
  if (opts.dashed) ctx.setLineDash([6, 6])
  ctx.beginPath()
  ctx.ellipse(0, 0, a * scale, b * scale, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

/** Fill the swept sector between two true anomalies (equal-area demo). */
export function fillSweptSector(
  c: CanvasInfo,
  cx: number,
  cy: number,
  scale: number,
  aKm: number,
  e: number,
  nu0: number,
  nu1: number,
  color: string,
): void {
  const { ctx } = c
  const steps = 24
  ctx.save()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  for (let i = 0; i <= steps; i++) {
    const nu = nu0 + ((nu1 - nu0) * i) / steps
    const r = aKm * (1 - e * e) / (1 + e * Math.cos(nu))
    ctx.lineTo(cx + r * scale * Math.cos(nu), cy + r * scale * Math.sin(nu))
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** Spacecraft glyph: glowing dot + velocity direction arrow. */
export function drawCraft(
  c: CanvasInfo,
  x: number,
  y: number,
  heading: number,
  color = '#ffd54a',
): void {
  const { ctx } = c
  ctx.save()
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 14)
  glow.addColorStop(0, 'rgba(255,220,110,0.55)')
  glow.addColorStop(1, 'rgba(255,220,110,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(x, y, 14, 0, Math.PI * 2)
  ctx.fill()
  ctx.translate(x, y)
  ctx.rotate(heading)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(9, 0)
  ctx.lineTo(-6, -5.5)
  ctx.lineTo(-3, 0)
  ctx.lineTo(-6, 5.5)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** High-contrast label with a dark halo so it reads over any background. */
export function drawLabel(
  c: CanvasInfo,
  text: string,
  x: number,
  y: number,
  opts: { color?: string; size?: number; align?: CanvasTextAlign; bold?: boolean; face?: TypeFace } = {},
): void {
  const { ctx } = c
  const size = opts.size ?? STEP.step1
  ctx.save()
  ctx.font = canvasFont(opts.bold ? 700 : 500, size, opts.face ?? 'body')
  ctx.textAlign = opts.align ?? 'left'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(3,6,15,0.9)'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = opts.color ?? '#f2f6ff'
  ctx.fillText(text, x, y)
  ctx.restore()
}

/** Diamond marker with a label (apoapsis/periapsis style). */
export function drawMarker(
  c: CanvasInfo,
  x: number,
  y: number,
  label: string,
  color = '#ff8a5c',
): void {
  const { ctx } = c
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = color
  ctx.strokeStyle = 'rgba(3,6,15,0.9)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(0, -7)
  ctx.lineTo(7, 0)
  ctx.lineTo(0, 7)
  ctx.lineTo(-7, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
  drawLabel(c, label, x + 12, y, { color, size: STEP.step1 })
}

/** Rounded info-box of text lines, anchored top-left at (x, y). */
export function drawInfoBox(
  c: CanvasInfo,
  x: number,
  y: number,
  lines: Array<{ label: string; value: string; color?: string }>,
  opts: { width?: number } = {},
): void {
  const { ctx } = c
  const lineH = 24
  const padX = 12
  const padY = 10
  const width = opts.width ?? 240
  const h = lines.length * lineH + padY * 2
  ctx.save()
  ctx.globalAlpha = 0.92
  ctx.fillStyle = '#0b1226'
  ctx.strokeStyle = '#33406b'
  ctx.lineWidth = 1.5
  const r = 10
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + h, r)
  ctx.arcTo(x + width, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.font = canvasFont(500, STEP.step0)
  lines.forEach((ln, i) => {
    const ty = y + padY + lineH * i + lineH / 2
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#9fb0d8'
    ctx.fillText(ln.label, x + padX, ty)
    ctx.textAlign = 'right'
    ctx.fillStyle = ln.color ?? '#f2f6ff'
    ctx.font = canvasFont(700, STEP.step1, 'mono')
    ctx.fillText(ln.value, x + width - padX, ty)
    ctx.font = canvasFont(500, STEP.step0)
  })
  ctx.restore()
}

/** View tag ("TOP-DOWN") in the corner. */
export function drawViewTag(c: CanvasInfo, text: string): void {
  drawLabel(c, text, 14, 18, { color: '#8fa3cc', size: STEP.step0, bold: true, face: 'display' })
}
