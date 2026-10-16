/**
 * Replay in the web app (spec user stories 55–58): saving a Replay file
 * through the browser, and the line that describes each action in the
 * playback controls. The Replay model (export, open, playback) is
 * @mt/session's; this file holds only what touches the browser or is text.
 */
import { BASIC_ATTACK, replayFileName, type Action, type BattleState, type UnitTemplate } from '@mt/session'
import { serializeReplay, tileName, type GameData, type Replay, type Side } from '@mt/shared'
import { th } from './strings.ts'

// ------------------------------------------------------------------- save

/** Save the Replay as a JSON file through the browser's download. */
export function downloadReplay(replay: Replay): void {
  downloadJson(replayFileName(replay), serializeReplay(replay))
}

/** Save `text` as a JSON file through the browser's download (nothing is uploaded). */
export function downloadJson(fileName: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

// ------------------------------------------------------------- action text

/** "Fangrel (ทีม A)", from the Units on the Board, those that fell, or the deployment roster. */
function unitLabel(id: string, state: BattleState, data: GameData): string {
  const unit: UnitTemplate | undefined =
    state.units.find((u) => u.id === id) ??
    state.fallen.find((u) => u.id === id) ??
    state.deployment?.roster.find((u) => u.id === id)
  if (unit === undefined) return id
  const name = unit.kind === 'tamer' ? th.tamer : (data.species[unit.species]?.name ?? unit.species)
  return `${name} (${th.team(unit.side)})`
}

/** One line saying what a Replay action did, for the playback controls. */
export function describeAction(action: Action, actor: Side, state: BattleState, data: GameData): string {
  const label = (id: string) => unitLabel(id, state, data)
  switch (action.type) {
    case 'deploy':
      return th.replay.action.deploy(label(action.unit), tileName(action.to))
    case 'confirmDeployment':
      return th.replay.action.confirmDeployment(actor)
    case 'move':
      return th.replay.action.move(label(action.unit), tileName(action.to))
    case 'basicAttack':
      return th.replay.action.attack(label(action.unit), data.skills[BASIC_ATTACK]?.name ?? BASIC_ATTACK, label(action.target))
    case 'defend':
      return th.replay.action.defend(label(action.unit))
    case 'useSkill': {
      const skill = data.skills[action.skill]?.name ?? action.skill
      if (action.tile !== undefined && action.element !== undefined) {
        return th.replay.action.attune(label(action.unit), skill, tileName(action.tile), th.element[action.element])
      }
      if (action.tile !== undefined) {
        return action.targets === undefined
          ? th.replay.action.teleport(label(action.unit), skill, tileName(action.tile))
          : th.replay.action.area(label(action.unit), skill, tileName(action.tile), action.targets.map(label).join(', '))
      }
      if (action.target === undefined) return th.replay.action.skill(label(action.unit), skill)
      // Ids start with the side: an ally (Cover, First Aid) or the user itself, or an enemy.
      return action.target.charAt(0) === action.unit.charAt(0)
        ? th.replay.action.skillOn(label(action.unit), skill, label(action.target))
        : th.replay.action.attack(label(action.unit), skill, label(action.target))
    }
    case 'command':
      return th.replay.action.command(label(action.unit), label(action.target), th.commandOption[action.option] ?? action.option)
    case 'retreat':
      return action.to === null
        ? th.replay.action.stay(label(action.unit))
        : th.replay.action.retreat(label(action.unit), tileName(action.to))
    case 'endTurn':
      return th.replay.action.endTurn(actor)
    case 'useInspiration':
      return th.replay.action.useInspiration(action.side)
    case 'declineInspiration':
      return th.replay.action.declineInspiration(action.side)
    default:
      // Action types added by later tickets show their type until they get their own text.
      return th.replay.action.other((action as { type: string }).type)
  }
}
