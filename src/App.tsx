/**
 * ASGC Orbital Mechanics — Main Application
 *
 * Header: wordmark · module tabs (1–6) · unit toggle
 * Stage: DualView component (single top-down canvas, rAF)
 * Dock: transport · sliders · readout grid
 */

import { useCallback, useEffect, useReducer, useRef } from 'react'
import './App.css'
import type { Unit, ReadoutLine, DrawInput } from './modules/types'
import { modules } from './modules'
import { launchApplyBurn } from './modules/launch'
import DualView from './components/DualView'

/* ── constants ─────────────────────────────────────────────────────── */
const TIME_SCALES = [0.5, 1, 2, 5, 10]
const MODULE_TABS = modules.map((m) => ({ id: m.id, title: m.title, short: m.short }))

/* ── reducer for global state ──────────────────────────────────────── */
interface State {
  moduleIdx: number
  unit: Unit
  playing: boolean
  timeScale: number
  params: Params
  stepSignal: number
  resetSignal: number
}

type Action =
  | { type: 'setModule'; idx: number }
  | { type: 'setUnit'; unit: Unit }
  | { type: 'togglePlay' }
  | { type: 'setTimeScale'; ts: number }
  | { type: 'setParams'; params: Params }
  | { type: 'stepForward' }
  | { type: 'stepBack' }
  | { type: 'reset' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'setModule': {
      const mod = modules[action.idx]
      return { ...state, moduleIdx: action.idx, params: { ...mod.defaults } }
    }
    case 'setUnit': return { ...state, unit: action.unit }
    case 'togglePlay': return { ...state, playing: !state.playing }
    case 'setTimeScale': return { ...state, timeScale: action.ts }
    case 'setParams': return { ...state, params: { ...state.params, ...action.params } }
    case 'stepForward': return { ...state, stepSignal: state.stepSignal + 1 }
    case 'stepBack': return { ...state, stepSignal: state.stepSignal - 1 }
    case 'reset': return { ...state, resetSignal: state.resetSignal + 1 }
    default: return state
  }
}

interface Params { [key: string]: number }

function clampParam(defs: Array<{ key: string; min: number; max: number; step: number }>, key: string, value: number): number {
  const d = defs.find((x) => x.key === key)
  if (!d) return value
  return Math.max(d.min, Math.min(d.max, value))
}

/* ── component ─────────────────────────────────────────────────────── */
function App() {
  const [state, dispatch] = useReducer(reducer, {
    moduleIdx: 0,
    unit: 'kms' as Unit,
    playing: true,
    timeScale: 1,
    params: { ...modules[0].defaults },
    stepSignal: 0,
    resetSignal: 0,
  })

  const timeRef = useRef(0)
  const reducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  /* keyboard shortcuts */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault()
          dispatch({ type: 'togglePlay' })
          break
        case '1': case '2': case '3': case '4': case '5': case '6':
          dispatch({ type: 'setModule', idx: Number(e.key) - 1 })
          break
        case 'u': case 'U':
          dispatch({ type: 'setUnit', unit: state.unit === 'kms' ? 'kmin' : 'kms' })
          break
        case 'r': case 'R':
          dispatch({ type: 'reset' })
          break
        case 'ArrowRight':
          e.preventDefault()
          dispatch({ type: 'stepForward' })
          break
        case 'ArrowLeft':
          e.preventDefault()
          dispatch({ type: 'stepBack' })
          break
        case '[':
          dispatch({ type: 'setTimeScale', ts: TIME_SCALES[Math.max(0, TIME_SCALES.indexOf(state.timeScale) - 1)] })
          break
        case ']':
          dispatch({ type: 'setTimeScale', ts: TIME_SCALES[Math.min(TIME_SCALES.length - 1, TIME_SCALES.indexOf(state.timeScale) + 1)] })
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [state.moduleIdx, state.params, state.timeScale, state.unit])

  /* draw closure — reads current module from state via ref */
  const stateRef = useRef(state)
  stateRef.current = state

  const drawFn = useCallback(
    (inp: DrawInput, params: Params) => {
      const mod = modules[stateRef.current.moduleIdx]
      if (mod.draw) mod.draw(inp, params)
    },
    [],
  )

  /* ── derived values ──────────────────────────────────────────────── */
  const phasePeriod = modules[state.moduleIdx].phasePeriod(state.params)
  const timeScale = reducedMotion ? 0 : state.timeScale
  const readouts: ReadoutLine[] = modules[state.moduleIdx].readout
    ? modules[state.moduleIdx].readout!(state.params, state.unit)
    : Array(6).fill({ label: '', value: '' })
  const paramDefs = modules[state.moduleIdx].params

  /* ── param handler ───────────────────────────────────────────────── */
  const handleParam = useCallback((key: string, value: number) => {
    const clamped = clampParam(paramDefs, key, value)
    dispatch({ type: 'setParams', params: { [key]: clamped } })
  }, [paramDefs])

  /* ── render ──────────────────────────────────────────────────────── */
  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <h1 className="wordmark">ASGC Orbital Mechanics</h1>
        <nav className="tabs" role="tablist" aria-label="Modules">
          {MODULE_TABS.map((tab, i) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={i === state.moduleIdx}
              className={`tab ${i === state.moduleIdx ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'setModule', idx: i })}
            >
              <span className="tab-num">{i + 1}</span> {tab.short}
            </button>
          ))}
        </nav>
        <button
          className="unit-toggle"
          aria-label={`Speed unit: ${state.unit === 'kms' ? 'km/s' : 'km/min'}`}
          onClick={() => dispatch({ type: 'setUnit', unit: state.unit === 'kms' ? 'kmin' : 'kms' })}
        >
          {state.unit === 'kms' ? 'km/s' : 'km/min'}
        </button>
      </header>

      {/* STAGE — DualView component handles rAF + canvas sizing */}
      <div id="stage" className="stage">
        <DualView
          draw={drawFn}
          params={state.params}
          playing={state.playing}
          timeScale={timeScale}
          unit={state.unit}
          reducedMotion={reducedMotion}
          stepSignal={state.stepSignal}
          resetSignal={state.resetSignal}
          phasePeriod={phasePeriod}
          timeRef={timeRef}
        />
      </div>

      {/* DOCK */}
      <div className="dock">
        {/* TRANSPORT */}
        <div className="transport" role="group" aria-label="Simulation transport">
          <button
            className="btn btn-primary"
            aria-pressed={state.playing}
            onClick={() => dispatch({ type: 'togglePlay' })}
          >
            {state.playing ? '⏸ Pause' : '▶ Play'}
          </button>
          <button className="btn" onClick={() => dispatch({ type: 'stepBack' })} aria-label="Step back">⏮</button>
          <button className="btn" onClick={() => dispatch({ type: 'stepForward' })} aria-label="Step forward">⏭</button>
          <button className="btn" onClick={() => dispatch({ type: 'reset' })} aria-label="Reset">↺ Reset</button>
          <div className="speed" role="group" aria-label="Animation speed">
            {TIME_SCALES.map((s) => (
              <button
                key={s}
                className={`speed-btn ${state.timeScale === s ? 'active' : ''}`}
                aria-pressed={state.timeScale === s}
                aria-label={`Speed: ${s}x`}
                onClick={() => dispatch({ type: 'setTimeScale', ts: s })}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        {/* MODULE SLIDERS */}
        <div className="sliders">
          {paramDefs.map((d) => (
            <div className="param" key={d.key}>
              <div className="param-head">
                <label htmlFor={`param-${d.key}`}>{d.label}</label>
                <output
                  htmlFor={`param-${d.key}`}
                  className="param-value"
                  aria-live="polite"
                >
                  {Math.round(state.params[d.key]).toLocaleString('en-US')}{d.unit ? ` ${d.unit}` : ''}
                </output>
              </div>
              <input
                id={`param-${d.key}`}
                type="range"
                min={d.min}
                max={d.max}
                step={d.step}
                value={state.params[d.key]}
                onChange={(e) => handleParam(d.key, Number(e.target.value))}
                aria-label={`${d.label}: ${Math.round(state.params[d.key]).toLocaleString('en-US')}${d.unit ? ` ${d.unit}` : ''}`}
              />
            </div>
          ))}
          {state.moduleIdx === 5 && (
            <div className="launch-controls">
              <button
                className="btn btn-direction"
                onClick={() => handleParam('prograde', 1)}
              >
                Prograde →
              </button>
              <button
                className="btn btn-direction"
                onClick={() => handleParam('prograde', -1)}
              >
                ← Retrograde
              </button>
              <button
                className="btn btn-burn btn-primary"
                onClick={() => {
                  launchApplyBurn(state.params.prograde !== -1)
                  handleParam('dv', 0)
                }}
              >
                BURN NOW
              </button>
            </div>
          )}
        </div>

        {/* READOUT GRID */}
        <div className="readouts" role="region" aria-label="Simulation readouts">
          {readouts.map((r, i) => (
            <div key={i} className={`chip ${r.color ? 'hot' : ''}`}>
              <span className="chip-label">{r.label}</span>
              <span className="chip-value" style={r.color ? { color: r.color } : undefined}>
                {r.value || '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
