// Keyboard-operable control panel: parameter sliders + transport controls.
// Renders only on user interaction — the animation loop never touches it.

import type { Params, ParamDef, Unit } from '../modules/types'

interface ControlPanelProps {
  title: string
  params: Params
  defs: ParamDef[]
  onParam: (key: string, value: number) => void
  playing: boolean
  onTogglePlay: () => void
  onStep: () => void
  onReset: () => void
  timeScale: number
  onTimeScale: (v: number) => void
  reducedMotion: boolean
  unit: Unit
  children?: React.ReactNode
}

function fmt(value: number, step: number): string {
  if (step >= 10) return Math.round(value).toLocaleString('en-US')
  if (step >= 1) return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return value.toLocaleString('en-US', { maximumFractionDigits: 3 })
}

const TIME_SCALES = [0.5, 1, 2, 5, 10]

export default function ControlPanel(props: ControlPanelProps): React.JSX.Element {
  const {
    title,
    params,
    defs,
    onParam,
    playing,
    onTogglePlay,
    onStep,
    onReset,
    timeScale,
    onTimeScale,
    reducedMotion,
    children,
  } = props

  return (
    <section className="panel" aria-label={`${title} controls`}>
      <h2 className="panel-title">{title}</h2>

      <div className="param-list">
        {defs.map((d) => (
          <div className="param" key={d.key}>
            <div className="param-head">
              <label htmlFor={`param-${d.key}`}>{d.label}</label>
              <output htmlFor={`param-${d.key}`} className="param-value">
                {fmt(params[d.key], d.step)}
                {d.unit ? ` ${d.unit}` : ''}
              </output>
            </div>
            <input
              id={`param-${d.key}`}
              type="range"
              min={d.min}
              max={d.max}
              step={d.step}
              value={params[d.key]}
              onChange={(e) => onParam(d.key, Number(e.target.value))}
              aria-describedby={d.hint ? `hint-${d.key}` : undefined}
            />
            {d.hint && (
              <p className="param-hint" id={`hint-${d.key}`}>
                {d.hint}
              </p>
            )}
          </div>
        ))}
      </div>

      {children && <div className="extra-controls">{children}</div>}

      <div className="transport" role="group" aria-label="Simulation transport">
        <button type="button" className="btn btn-primary" onClick={onTogglePlay} aria-pressed={playing}>
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button type="button" className="btn" onClick={onStep} aria-label="Step forward one step">
          ⏭ Step
        </button>
        <button type="button" className="btn" onClick={onReset} aria-label="Reset simulation clock">
          ↺ Reset
        </button>
      </div>

      <div className="timescale" role="group" aria-label="Animation speed">
        <span className="ts-label" id="ts-label">
          Speed
        </span>
        {TIME_SCALES.map((s) => (
          <button
            key={s}
            type="button"
            className={`btn btn-small ${timeScale === s ? 'active' : ''}`}
            aria-pressed={timeScale === s}
            aria-labelledby="ts-label"
            onClick={() => onTimeScale(s)}
          >
            {s}×
          </button>
        ))}
      </div>

      {reducedMotion && (
        <p className="rm-note" role="note">
          Reduced-motion is on: the simulation starts paused. Use Step (⏭) to advance frame by frame.
        </p>
      )}
    </section>
  )
}
