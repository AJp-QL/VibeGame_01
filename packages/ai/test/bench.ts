/**
 * AI speed benchmark: AI against AI, whole Battles (deployment to outcome).
 *   node packages/ai/test/bench.ts [games=50] [scenario_1|scenario_2] [greedy|tamer_rush|neutral] [sim|game]
 * Node ≥ 24 runs this TypeScript directly (type stripping).
 */
import { applyAction, decidingSide, type BattleState } from '@mt/engine'
import { chooseAction, createAi, GAME_PROFILES, SIM_PROFILES, type AiMode, type AiState } from '../src/index.ts'
import { newBattle, seedOf } from './play.ts'

const games = Number(process.argv[2] ?? 50)
const scenario = process.argv[3] ?? 'scenario_1'
const mode = (process.argv[4] ?? 'greedy') as AiMode
const profile = (process.argv[5] === 'game' ? GAME_PROFILES : SIM_PROFILES)[mode]

function play(initial: BattleState): BattleState {
  let state = initial
  const ais: Record<'A' | 'B', AiState> = { A: createAi(initial, 'A', profile), B: createAi(initial, 'B', profile) }
  while (state.outcome === null) {
    const side = decidingSide(state)
    const choice = chooseAction(state, ais[side])
    ais[side] = choice.ai
    const result = applyAction(state, choice.action)
    if (!result.ok) throw new Error(result.rejection.message)
    state = result.state
  }
  return state
}

for (let i = 0; i < 5; i++) play(newBattle(scenario, 'crossroads', seedOf(1000 + i))) // warm-up
const t0 = performance.now()
for (let i = 0; i < games; i++) play(newBattle(scenario, 'crossroads', seedOf(i + 1)))
const ms = (performance.now() - t0) / games
console.log(`${scenario} ${profile.name}: ${ms.toFixed(1)} ms per Battle (${games} Battles, after warm-up)`)
