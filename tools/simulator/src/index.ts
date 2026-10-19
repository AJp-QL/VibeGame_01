export { loadRepoData, simEquivalentData, SIM_V4_STATS, type DataOverride } from './data.ts'
export {
  gameSeed,
  playBattle,
  simulateGames,
  summarizeBattle,
  unitKinds,
  type BattleEnd,
  type GameRecord,
  type Matchup,
  type PlayedBattle,
  type UnitKind,
} from './simulate.ts'
export { aggregate, metricsTables, skillTable, type LabelledMetrics, type Metrics } from './metrics.ts'
export {
  compareWithSimV4,
  loadSimV4,
  PARITY_BOARD,
  PARITY_CONFIGS,
  parityMatchup,
  parityTable,
  runParity,
  type ParityCheck,
  type ParityConfig,
  type ParityResult,
  type SimV4Result,
} from './parity.ts'
export { main, parseArgs, profileOf, type CliOptions, type Command } from './cli.ts'
export { RANGE_VARIANTS, applyVariant, variantById, type RangeVariant } from './variants.ts'
export { RANGE_BOARDS, RANGE_SCENARIOS, TARGETS, meetsTargets, rangeJobs, rangeTables, runRangeJobs, runRangeSet, type RangeJob, type RangeSetResult } from './ranges.ts'
export { DISTANCE_BASELINE, DISTANCE_VARIANTS, distanceJobs, distanceTables, distanceVariantById, runDistanceJobs, runDistanceSet, summarizeThreat, withShotRange, type DistanceJob, type DistanceSetResult, type DistanceVariant, type ThreatSummary } from './distanceExperiment.ts'
export { sampleThreat, threatenedTiles, type ThreatSample } from './threat.ts'
