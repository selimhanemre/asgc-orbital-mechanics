// DualView: the single top-down canvas driven by one requestAnimationFrame
// loop. React never re-renders per frame — the draw closure is read through
// a ref so slider changes take effect immediately.
// The simulation clock lives in a parent-owned ref so module buttons
// (e.g. burns) can read the exact phase at click time.

import { useEffect, useRef } from 'react'
import type { CanvasInfo } from '../sim/scene'
import { drawSpaceBackground } from '../sim/scene'
import type { DrawInput, Unit } from '../modules/types'

interface DualViewProps {
  /** Latest draw closure (module + params). Read fresh every frame. */
  draw: (inp: DrawInput, p: Record<string, number>) => void
  params: Record<string, number>
  playing: boolean
  timeScale: number
  unit: Unit
  reducedMotion: boolean
  /** Increment to step the clock by one 1/60 cycle. */
  stepSignal: number
  /** Increment to reset the clock to zero. */
  resetSignal: number
  /** Module phase period in display seconds (for stepping). */
  phasePeriod: number
  /** Shared clock (display seconds). */
  timeRef: React.MutableRefObject<number>
}

export default function DualView(props: DualViewProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const infoRef = useRef<{ ctx: CanvasRenderingContext2D | null; w: number; h: number; dpr: number }>({
    ctx: null,
    w: 0,
    h: 0,
    dpr: 1,
  })

  const propsRef = useRef(props)
  propsRef.current = props

  const drawRef = useRef(props.draw)
  drawRef.current = props.draw
  const phasePeriodRef = useRef(props.phasePeriod)
  phasePeriodRef.current = props.phasePeriod

  // Canvas sizing: DPR-aware, observed on resize.
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const sizeAll = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const rect = el.getBoundingClientRect()
      const w = Math.max(80, Math.floor(rect.width))
      const h = Math.max(80, Math.floor(rect.height))
      el.width = Math.floor(w * dpr)
      el.height = Math.floor(h * dpr)
      infoRef.current = { ctx: el.getContext('2d'), w, h, dpr }
    }
    sizeAll()
    const ro = new ResizeObserver(sizeAll)
    ro.observe(el)
    window.addEventListener('resize', sizeAll)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', sizeAll)
    }
  }, [])

  // Main animation loop.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const P = propsRef.current
      if (P.playing && !P.reducedMotion) {
        P.timeRef.current += dt * P.timeScale
      }
      const info = infoRef.current
      if (info.ctx && info.w >= 20) {
        const ctx = info.ctx
        ctx.setTransform(info.dpr, 0, 0, info.dpr, 0, 0)
        const top: CanvasInfo = { ctx, w: info.w, h: info.h }
        drawSpaceBackground(top)
        drawRef.current(
          {
            top,
            time: P.timeRef.current,
            unit: P.unit,
            playing: P.playing,
            reducedMotion: P.reducedMotion,
          },
          P.params,
        )
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Step / reset signals.
  const stepSeen = useRef(props.stepSignal)
  if (props.stepSignal !== stepSeen.current) {
    stepSeen.current = props.stepSignal
    props.timeRef.current += phasePeriodRef.current / 60
  }
  const resetSeen = useRef(props.resetSignal)
  if (props.resetSignal !== resetSeen.current) {
    resetSeen.current = props.resetSignal
    props.timeRef.current = 0
  }

  return (
    <div className="dualview">
      <div className="dualview-pane">
        <canvas
          ref={canvasRef}
          className="sim-canvas"
          role="img"
          aria-label="Top-down orbital view"
        />
      </div>
    </div>
  )
}
