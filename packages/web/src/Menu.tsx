import { TERRAIN_COLOURS } from '@mt/battle'
import { SIDES, type Board, type GameData } from '@mt/shared'
import { canStart, isModeAvailable, menuBoards, menuScenarios, MODES, type BattleChoice } from './battleChoice.ts'
import { th } from './strings.ts'

interface MenuProps {
  data: GameData
  choice: BattleChoice
  onChange: (choice: BattleChoice) => void
  onStart: () => void
}

/**
 * The menu before a Battle. Every option is a native radio button inside a
 * large label, so a tap or a click anywhere on the card picks it.
 */
export function Menu({ data, choice, onChange, onStart }: MenuProps) {
  const set = (change: Partial<BattleChoice>) => onChange({ ...choice, ...change })
  const board = data.boards[choice.boardId]

  return (
    <main className="menu">
      <h2>{th.menu.title}</h2>

      <fieldset className="panel choices">
        <legend>{th.menu.scenarioTitle}</legend>
        {menuScenarios(data).map((scenario) => (
          <label key={scenario.id} className="choice">
            <input
              type="radio"
              name="scenario"
              checked={choice.scenarioId === scenario.id}
              onChange={() => set({ scenarioId: scenario.id })}
            />
            <span>
              <strong>{th.menu.scenarioLabel(scenario.name, th.menu.stage[scenario.id])}</strong>
              <span className="muted">
                {th.menu.scenarioDetails(scenario.teams.A.tamer.level, scenario.teams.A.monsters[0].star)}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="panel choices">
        <legend>{th.menu.boardTitle}</legend>
        <div className="board-choice">
          <div>
            {menuBoards(data).map((option) => (
              <label key={option.id} className="choice">
                <input
                  type="radio"
                  name="board"
                  checked={choice.boardId === option.id}
                  onChange={() => set({ boardId: option.id })}
                />
                <span>
                  <strong>{option.name}</strong>
                  {th.menu.boardBlurb[option.id] !== undefined && (
                    <span className="muted">{th.menu.boardBlurb[option.id]}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
          {board !== undefined && <MiniBoard board={board} />}
        </div>
      </fieldset>

      <fieldset className="panel choices">
        <legend>{th.menu.modeTitle}</legend>
        {MODES.map((mode) => (
          <label key={mode} className={`choice${isModeAvailable(mode) ? '' : ' unavailable'}`}>
            <input
              type="radio"
              name="mode"
              disabled={!isModeAvailable(mode)}
              checked={choice.mode === mode}
              onChange={() => set({ mode })}
            />
            <span>
              <strong>{th.menu.mode[mode]}</strong>
              <span className="muted">{th.menu.modeNote[mode]}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {/* Only against the AI: Hotseat plays both teams. */}
      {choice.mode === 'ai' && (
        <fieldset className="panel choices">
          <legend>{th.menu.sideTitle}</legend>
          <div className="side-choices">
            {SIDES.map((side) => (
              <label key={side} className={`choice side-${side}`}>
                <input
                  type="radio"
                  name="side"
                  checked={choice.humanSide === side}
                  onChange={() => set({ humanSide: side })}
                />
                <strong>{th.menu.side(side)}</strong>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <button type="button" className="primary start" disabled={!canStart(data, choice)} onClick={onStart}>
        {th.menu.start}
      </button>
    </main>
  )
}

const hex = (colour: number) => `#${colour.toString(16).padStart(6, '0')}`

/** The chosen Board's terrain at a glance, in the Board's own colours; row 1 (team A) at the top. */
function MiniBoard({ board }: { board: Board }) {
  return (
    <div className="mini-board" role="img" aria-label={th.menu.boardPreview(board.name)}>
      {board.terrain.flatMap((row, y) =>
        row.map((terrain, x) => <span key={`${x},${y}`} style={{ background: hex(TERRAIN_COLOURS[terrain]) }} />),
      )}
    </div>
  )
}
