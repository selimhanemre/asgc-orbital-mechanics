// Imperative canvas scene helpers for the ASGC orbital mechanics tool.
// No React here — these draw into canvas contexts directly.

export interface CanvasInfo {
  ctx: CanvasRenderingContext2D
  /** CSS pixel width */
  w: number
  /** CSS pixel height */
  h: number
}

/** km -> px scale that fits a radius of rMax km with a margin. */
export function fitScale(w: number, h: number, rMaxKm: number, margin = 0.14): number {
  const minDim = Math.min(w, h)
  return ((minDim / 2) * (1 - margin)) / rMaxKm
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
 * Stylized canvas-drawn Earth (no external assets).
 * rPx = pixel radius. `squash` < 1 gives the side view a perspective tilt.
 */
export function drawEarth(c: CanvasInfo, cx: number, cy: number, rPx: number, squash = 1): void {
  const { ctx } = c
  if (rPx < 1) return
  const { w, h } = c
  void w
  void h
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(1, squash)
  // atmospheric glow
  const glow = ctx.createRadialGradient(0, 0, rPx * 0.8, 0, 0, rPx * 1.35)
  glow.addColorStop(0, 'rgba(90,160,255,0.30)')
  glow.addColorStop(1, 'rgba(90,160,255,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(0, 0, rPx * 1.35, 0, Math.PI * 2)
  ctx.fill()
  // ocean body
  const body = ctx.createRadialGradient(-rPx * 0.35, -rPx * 0.4, rPx * 0.2, 0, 0, rPx)
  body.addColorStop(0, '#3f8fd4')
  body.addColorStop(0.55, '#1f5fa8')
  body.addColorStop(1, '#0d2f63')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(0, 0, rPx, 0, Math.PI * 2)
  ctx.fill()
  // stylized continents
  ctx.save()
  ctx.beginPath()
  ctx.arc(0, 0, rPx, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = 'rgba(88,178,116,0.85)'
  const blobs: Array<[number, number, number, number]> = [
    [-0.45, -0.25, 0.42, 0.30],
    [0.25, -0.45, 0.34, 0.24],
    [0.45, 0.25, 0.30, 0.34],
    [-0.2, 0.45, 0.36, 0.22],
    [-0.7, 0.15, 0.2, 0.28],
  ]
  for (const [bx, by, brx, bry] of blobs) {
    ctx.beginPath()
    ctx.ellipse(bx * rPx, by * rPx, brx * rPx, bry * rPx, 0.4, 0, Math.PI * 2)
    ctx.fill()
  }
  // polar caps
  ctx.fillStyle = 'rgba(235,245,255,0.8)'
  ctx.beginPath()
  ctx.ellipse(0, -rPx * 0.86, rPx * 0.5, rPx * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(0, rPx * 0.88, rPx * 0.45, rPx * 0.2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  // terminator shading (light from the left)
  const shade = ctx.createLinearGradient(-rPx, 0, rPx, 0)
  shade.addColorStop(0, 'rgba(0,0,0,0)')
  shade.addColorStop(0.7, 'rgba(0,0,20,0.08)')
  shade.addColorStop(1, 'rgba(0,0,25,0.55)')
  ctx.fillStyle = shade
  ctx.beginPath()
  ctx.arc(0, 0, rPx, 0, Math.PI * 2)
  ctx.fill()
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
  opts: { color?: string; size?: number; align?: CanvasTextAlign; bold?: boolean } = {},
): void {
  const { ctx } = c
  const size = opts.size ?? 16
  ctx.save()
  ctx.font = `${opts.bold ? '700' : '500'} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`
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
  drawLabel(c, label, x + 12, y, { color, size: 15 })
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
  ctx.font = '500 15px system-ui, -apple-system, "Segoe UI", sans-serif'
  lines.forEach((ln, i) => {
    const ty = y + padY + lineH * i + lineH / 2
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#9fb0d8'
    ctx.fillText(ln.label, x + padX, ty)
    ctx.textAlign = 'right'
    ctx.fillStyle = ln.color ?? '#f2f6ff'
    ctx.font = '700 16px system-ui, -apple-system, "Segoe UI", sans-serif'
    ctx.fillText(ln.value, x + width - padX, ty)
    ctx.font = '500 15px system-ui, -apple-system, "Segoe UI", sans-serif'
  })
  ctx.restore()
}

/** View tag ("TOP VIEW" / "SIDE VIEW") in the corner. */
export function drawViewTag(c: CanvasInfo, text: string): void {
  drawLabel(c, text, 14, 18, { color: '#8fa3cc', size: 13, bold: true })
}
