// Shared contract between React (controls) and the canvas renderer.

import type { CanvasInfo } from '../sim/scene'

export type Unit = 'kms' | 'kmin'

/** Per-frame inputs handed to a module's draw function. */
export interface DrawInput {
  top: CanvasInfo
  side: CanvasInfo
  /** Continuous simulation clock in "display seconds" (module-chosen pace). */
  time: number
  unit: Unit
  playing: boolean
  reducedMotion: boolean
}

export interface ParamDef {
  key: string
  label: string
  min: number
  max: number
  step: number
  unit?: string
  hint?: string
}

export type Params = Record<string, number>

export interface ReadoutLine {
  label: string
  value: string
  color?: string
}

export interface ExtraCtx {
  unit: Unit
  /** Set a param (used by module-specific buttons, e.g. burns). */
  setParam: (key: string, value: number) => void
  /** Current simulation clock (display seconds). */
  getTime: () => number
}

/**
 * A learning module. React renders `params` as sliders + any extra controls;
 * `draw` is called imperatively every animation frame (no React re-render).
 * `phasePeriod` = display seconds for one full animation cycle (step size = /60).
 */
export interface ModuleDef {
  id: string
  title: string
  short: string
  blurb: string
  defaults: Params
  params: ParamDef[]
  phasePeriod: (p: Params) => number
  draw: (inp: DrawInput, p: Params) => void
  /** Optional DOM readout (param-derived exact values). */
  readout?: (p: Params, unit: Unit) => ReadoutLine[]
  /** Optional clamp for param changes (e.g. e vs perigee floor). */
  clampParam?: (key: string, value: number, p: Params) => number
  /** Optional module-specific buttons rendered in the control panel. */
  renderExtra?: (ctx: ExtraCtx) => React.ReactNode
}
