/**
 * Two AI profiles against each other, each on both teams in turn.
 *   node packages/ai/test/versus.ts [games=100] [scenario_1] [game:greedy] [sim:greedy] [board=crossroads]
 * Prints, for the first profile: wins, its Tamer falling first, and the rounds played.
 */
import { GAME_PROFILES, SIM_PROFILES, type AiMode, type AiProfile } from '../src/index.ts'
import { newBattle, playBattle, seedOf } from './play.ts'

const games = Number(process.argv[2] ?? 100)
const scenario = process.argv[3] ?? 'scenario_1'
const profileOf = (name: string): AiProfile => {
  const [kind, mode] = name.split(':') as ['game' | 'sim', AiMode]
  return (kind === 'game' ? GAME_PROFILES : SIM_PROFILES)[mode]
}
const heur = process.env.AI_HEUR?.split(',').map(Number)
const first0 = profileOf(process.argv[4] ?? 'game:greedy')
// AI_HEUR="protectTamer,focusFire,lookahead" tries other heuristic strengths for the first profile.
const first: AiProfile =
  heur === undefined ? first0 : { ...first0, name: `${first0.name}(${heur.join(',')})`, heuristics: { protectTamer: heur[0] ?? 0, focusFire: heur[1] ?? 0, lookahead: heur[2] ?? 0 } }
const second = profileOf(process.argv[5] ?? 'sim:greedy')
const board = process.argv[6] ?? 'crossroads'

let wins = 0
let losses = 0
let ownTamerFirst = 0
let otherTamerFirst = 0
let rounds = 0
for (let i = 0; i < games; i++) {
  const firstSide = i % 2 === 0 ? 'A' : 'B'
  const profiles = firstSide === 'A' ? { A: first, B: second } : { A: second, B: first }
  const played = playBattle(newBattle(scenario, board, seedOf(i + 1)), profiles)
  const winner = played.final.outcome?.winner
  if (winner === firstSide) wins++
  else if (winner !== null && winner !== undefined) losses++
  const down = played.events.find((e) => e.type === 'unitDown')
  if (down?.type === 'unitDown' && down.unit.endsWith('tamer')) {
    if (down.unit.startsWith(firstSide)) ownTamerFirst++
    else otherTamerFirst++
  }
  rounds += played.final.round
}
const pct = (n: number) => `${((100 * n) / games).toFixed(0)}%`
console.log(
  `${scenario} ${board}: ${first.name} vs ${second.name}, ${games} Battles (sides alternate): ` +
    `wins ${pct(wins)}, losses ${pct(losses)}, own Tamer fell first ${pct(ownTamerFirst)}, ` +
    `other Tamer fell first ${pct(otherTamerFirst)}, rounds ${(rounds / games).toFixed(1)}`,
)
