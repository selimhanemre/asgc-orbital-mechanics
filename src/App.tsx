import { useEffect, useRef, useState } from 'react'
import './App.css'

/**
 * ASGC Orbital Mechanics — placeholder scaffold.
 *
 * Canvas 2D is wired and animated (Earth + one circular orbit) to prove the
 * rendering pipeline. The six learning modules from SPEC.md will replace the
 * placeholder scene in follow-up work; the render loop, canvas sizing and
 * prefers-reduced-motion handling here are the baseline they build on.
 */

const MU = 398600 // km^3/s^2
const R_EARTH = 6371 // km
const ALTITUDE_KM = 800 // placeholder circular orbit altitude

const ORBIT_R = R_EARTH + ALTITUDE_KM
const V_CIRC = Math.sqrt(MU / ORBIT_R) // km/s
const PERIOD_S = 2 * Math.PI * Math.sqrt(ORBIT_R ** 3 / MU) // s

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [running, setRunning] = useState(true)
  const runningRef = useRef(running)
  runningRef.current = running

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Respect prefers-reduced-motion: start paused if the user asks for it.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) setRunning(false)

    let raf = 0
    let phase = 0
    let last = performance.now()
    const timeScale = 60 // 60 simulated seconds per real second

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      if (runningRef.current) phase += (dt * timeScale / PERIOD_S) * Math.PI * 2
      if (phase > Math.PI * 2) phase -= Math.PI * 2

      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      const cx = w / 2
      const cy = h / 2
      const scale = Math.min(w, h) * 0.36 / ORBIT_R // km -> px (orbit radius)

      ctx.clearRect(0, 0, w, h)

      // Orbit path
      ctx.beginPath()
      ctx.arc(cx, cy, ORBIT_R * scale, 0, Math.PI * 2)
      ctx.strokeStyle = '#9ecbff'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 6])
      ctx.stroke()
      ctx.setLineDash([])

      // Earth
      ctx.beginPath()
      ctx.arc(cx, cy, R_EARTH * scale, 0, Math.PI * 2)
      const g = ctx.createRadialGradient(
        cx - R_EARTH * scale * 0.3,
        cy - R_EARTH * scale * 0.3,
        R_EARTH * scale * 0.2,
        cx,
        cy,
        R_EARTH * scale,
      )
      g.addColorStop(0, '#7fb8ff')
      g.addColorStop(1, '#1d4f91')
      ctx.fillStyle = g
      ctx.fill()

      // Satellite
      const sx = cx + ORBIT_R * scale * Math.cos(phase)
      const sy = cy - ORBIT_R * scale * Math.sin(phase)
      ctx.beginPath()
      ctx.arc(sx, sy, 7, 0, Math.PI * 2)
      ctx.fillStyle = '#ffd166'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()

      // Readouts (high-contrast, large — projector distance)
      ctx.fillStyle = '#ffffff'
      ctx.font = '600 18px system-ui, sans-serif'
      ctx.fillText(`r = ${ORBIT_R.toLocaleString()} km  (altitude ${ALTITUDE_KM} km)`, 16, 30)
      ctx.fillText(
        `v = ${V_CIRC.toFixed(2)} km/s   T = ${(PERIOD_S / 60).toFixed(1)} min`,
        16,
        56,
      )
      ctx.fillText('Top-down view (placeholder)', 16, h - 16)

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>ASGC Orbital Mechanics</h1>
        <p className="subtitle">
          Interactive 2D orbital mechanics learning tool — Arkansas Space Grant
          Consortium
        </p>
        <button
          type="button"
          className="toggle"
          aria-pressed={running}
          onClick={() => setRunning((r) => !r)}
        >
          {running ? 'Pause' : 'Play'}
        </button>
      </header>
      <canvas
        ref={canvasRef}
        className="orbit-canvas"
        role="img"
        aria-label="Top-down view of a satellite in a circular orbit around Earth"
      />
    </div>
  )
}

export default App
