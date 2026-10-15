import { useMemo, useRef } from 'react'
import { TERRAIN_COLOURS } from '@mt/battle'
import { ENGINE_VERSION } from '@mt/engine'
import { dataHash, SIDES, type Board, type GameData } from '@mt/shared'
import { canStart, isModeAvailable, menuBoards, menuScenarios, MODES, type BattleChoice } from './battleChoice.ts'
import type { OpenedReplay } from './replay.ts'
import { ReplayDetails } from './ReplayScreen.tsx'
import { th } from './strings.ts'

/** Why a Replay file did not open. */
export type ReplayNotice = Exclude<OpenedReplay, { kind: 'ready' }>

interface MenuProps {
  data: GameData
  choice: BattleChoice
  notice: ReplayNotice | null
  onChange: (choice: BattleChoice) => void
  onStart: () => void
  /** A Replay file was picked. */
  onOpenReplay: (file: File) => void
  onDismissNotice: () => void
}

/**
 * The menu before a Battle. Every option is a native radio button inside a
 * large label, so a tap or a click anywhere on the card picks it.
 */
export function Menu({ data, choice, notice, onChange, onStart, onOpenReplay, onDismissNotice }: MenuProps) {
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
              value={scenario.id}
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
                  value={option.id}
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
              value={mode}
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
                  value={side}
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

      <ReplayOpener data={data} notice={notice} onOpenReplay={onOpenReplay} onDismissNotice={onDismissNotice} />
    </main>
  )
}

/** For the developer: open a Replay file. A file that cannot be played says why, with both versions on a mismatch. */
function ReplayOpener({
  data,
  notice,
  onOpenReplay,
  onDismissNotice,
}: Pick<MenuProps, 'data' | 'notice' | 'onOpenReplay' | 'onDismissNotice'>) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <section className="panel replay-open">
      <h3>{th.replay.openTitle}</h3>
      <p className="muted">{th.replay.openHint}</p>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          // Clear it so picking the same file again still reports a change.
          event.currentTarget.value = ''
          if (file !== undefined) onOpenReplay(file)
        }}
      />
      <button type="button" className="secondary" onClick={() => input.current?.click()}>
        {th.replay.open}
      </button>
      {notice !== null && <ReplayNoticePanel data={data} notice={notice} onDismiss={onDismissNotice} />}
    </section>
  )
}

function ReplayNoticePanel({ data, notice, onDismiss }: { data: GameData; notice: ReplayNotice; onDismiss: () => void }) {
  const currentHash = useMemo(() => dataHash(data), [data])
  return (
    <div className="warning replay-notice" role="alert">
      {notice.kind === 'invalid' ? (
        <>
          <strong>{th.replay.invalidTitle}</strong>
          <ul className="issues">
            {notice.issues.slice(0, 8).map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </>
      ) : notice.kind === 'incompatible' ? (
        <>
          <strong>{th.replay.mismatchTitle}</strong>
          <p>{th.replay.mismatchBody}</p>
          <ReplayDetails replay={notice.replay} data={data} />
          <table className="versions">
            <thead>
              <tr>
                <th />
                <th>{th.replay.inReplay}</th>
                <th>{th.replay.inBuild}</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['engineVersion', th.replay.engineVersion, notice.replay.engineVersion, ENGINE_VERSION],
                  ['dataHash', th.replay.dataHash, notice.replay.dataHash, currentHash],
                ] as const
              ).map(([field, label, inReplay, inBuild]) => (
                <tr key={field} className={notice.mismatches.some((m) => m.field === field) ? 'differs' : undefined}>
                  <th scope="row">{label}</th>
                  <td>
                    <code>{inReplay}</code>
                  </td>
                  <td>
                    <code>{inBuild}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {notice.replay.meta?.appVersion !== undefined && <p>{th.replay.mismatchTag(notice.replay.meta.appVersion)}</p>}
        </>
      ) : (
        <>
          <strong>{th.replay.brokenTitle}</strong>
          <ReplayDetails replay={notice.replay} data={data} />
          <p>
            {notice.error.kind === 'rejected'
              ? th.replay.brokenAction(notice.error.index + 1, `${th.rejection[notice.error.rejection.code]} (${notice.error.rejection.message})`)
              : th.replay.brokenSetup(notice.error.message)}
          </p>
        </>
      )}
      <button type="button" className="secondary" onClick={onDismiss}>
        {th.replay.dismiss}
      </button>
    </div>
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
