/**
 * Module registry — all 6 learning modules for the ASGC orbital mechanics tool.
 */

import { module as kepler } from './kepler'
import { module as circular } from './circular'
import { module as elliptical } from './elliptical'
import { module as altitudePeriod } from './altitudePeriod'
import { module as hohmann } from './hohmann'
import { module as launch } from './launch'
import type { ModuleDef } from './types'

export const modules: ModuleDef[] = [kepler, circular, elliptical, altitudePeriod, hohmann, launch]

export { kepler, circular, elliptical, altitudePeriod, hohmann, launch }

// Launch module exports
export { launchApplyBurn, launchReset } from './launch'
