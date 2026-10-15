import { useState, useSyncExternalStore } from 'react'
import {
  createBattle,
  derivedValues,
  legalActions,
  type BattleEvent,
  type BattleState,
  type Initiative,
  type UnitState,
  type UnitTemplate,
} from '@mt/engine'
import { DataError, tileName, type GameData, type Side } from '@mt/shared'
import { BattleView } from './BattleView.tsx'
import { loadBundledGameData } from './gameData.ts'
import { createBattleSession, idleUnits, type BattleSession, type SessionSnapshot } from './session.ts'
import { th } from './strings.ts'

const SCENARIO_ID = 'scenario_1'

type Setup =
  | { readonly kind: 'ready'; readonly data: GameData; readonly session: BattleSession; readonly diceSeed: string }
  | { readonly kind: 'error'; readonly details: string }

/** A fresh 64-bit Dice Seed as 16 hex digits. Randomness lives here, never in the engine. */
function randomDiceSeed(): string {
  const words = crypto.getRandomValues(new Uint32Array(2))
  return Array.from(words, (w) => w.toString(16).padStart(8, '0')).join('')
}

function startBattle(): Setup {
  try {
    const data = loadBundledGameData()
    const scenario = data.scenarios[SCENARIO_ID]
    const board = scenario && data.boards[scenario.board]
    if (scenario === undefined || board === undefined) throw new Error(`Missing ${SCENARIO_ID} or its Board`)
    const diceSeed = randomDiceSeed()
    const state = createBattle({ scenario, board, species: data.species, dice: { seed: diceSeed } })
    return { kind: 'ready', data, session: createBattleSession(state), diceSeed }
  } catch (error) {
    const details = error instanceof DataError || error instanceof Error ? error.message : String(error)
    return { kind: 'error', details }
  }
}

export function App() {
  const [setup] = useState(startBattle)
  return (
    <div className="app">
      <header className="app-header">
        <h1>{th.appTitle}</h1>
      </header>
      {setup.kind === 'ready' ? (
        <BattleScreen data={setup.data} session={setup.session} diceSeed={setup.diceSeed} />
      ) : (
        <section className="panel error" role="alert">
          <h2>{th.dataErrorTitle}</h2>
          <p>{th.dataErrorBody}</p>
          <pre>{setup.details}</pre>
        </section>
      )}
      <footer className="app-footer">{th.version(__APP_VERSION__)}</footer>
    </div>
  )
}

function unitName(unit: UnitTemplate, data: GameData): string {
  return unit.kind === 'tamer' ? th.tamer : (data.species[unit.species]?.name ?? unit.species)
}

const otherSide = (side: Side): Side => (side === 'A' ? 'B' : 'A')

function BattleScreen({ data, session, diceSeed }: { data: GameData; session: BattleSession; diceSeed: string }) {
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot)
  const { state } = snapshot
  const scenario = data.scenarios[state.scenarioId]
  const board = data.boards[state.boardId]

  return (
    <main className="battle">
      <StatusBar state={state} />

      <BattleView session={session} />

      {state.phase === 'deployment' ? (
        <DeploymentPanel snapshot={snapshot} session={session} data={data} />
      ) : (
        // Any accepted action closes an open End Turn warning.
        <TurnPanel key={snapshot.revision} snapshot={snapshot} session={session} data={data} />
      )}

      <section className="panel log">
        <h2>{th.logTitle}</h2>
        <EventLog events={snapshot.log} units={state.units} data={data} />
      </section>

      <p className="meta">
        {scenario && board ? th.scenarioOnBoard(scenario.name, board.name) : null} · {th.diceSeed(diceSeed)}
      </p>

      {snapshot.screen === 'handoff' && (
        <div className="cover" role="dialog" aria-modal="true" aria-labelledby="handoff-title">
          <div className="panel dialog">
            <h2 id="handoff-title">{th.handoffTitle(otherSide(state.sideToAct))}</h2>
            <p>{th.handoffBody(otherSide(state.sideToAct), state.sideToAct)}</p>
            <button type="button" className="primary" onClick={() => session.continueHotseat()}>
              {th.handoffReady(state.sideToAct)}
            </button>
          </div>
        </div>
      )}

      {snapshot.screen === 'initiative' && state.initiative !== null && (
        <div className="cover see-through" role="dialog" aria-modal="true" aria-labelledby="initiative-title">
          <div className="panel dialog">
            <h2 id="initiative-title">{th.revealTitle}</h2>
            <InitiativeResult initiative={state.initiative} />
            <button type="button" className="primary" onClick={() => session.continueHotseat()}>
              {th.startBattle}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function StatusBar({ state }: { state: BattleState }) {
  if (state.phase === 'deployment') {
    return (
      <section className="status" aria-live="polite">
        <span className={`turn side-${state.sideToAct}`}>{th.deploymentStatus(state.sideToAct)}</span>
      </section>
    )
  }
  const { limit, started } = state.activations
  const teamSize = state.units.filter((u) => u.side === state.sideToAct).length
  return (
    <section className="status" aria-live="polite">
      <span className="round">{th.round(state.round)}</span>
      <span className={`turn side-${state.sideToAct}`}>
        {th.turnOf(state.sideToAct, state.turnNumber[state.sideToAct])}
      </span>
      {limit < teamSize && <span className="limit">{th.firstTurnLimit(limit, started.length)}</span>}
    </section>
  )
}

function InitiativeResult({ initiative }: { initiative: Initiative }) {
  return (
    <div className="initiative">
      <h3>{th.initiativeTitle}</h3>
      {initiative.rolls.map((pair, index) => (
        <ul key={index}>
          {(['A', 'B'] as const).map((side) => (
            <li key={side}>{th.initiativeRoll(side, pair[side].d20, pair[side].modifier, pair[side].total)}</li>
          ))}
          {pair.A.total === pair.B.total && <li className="tie">{th.initiativeTie}</li>}
        </ul>
      ))}
      <p className={`first side-${initiative.firstSide}`}>{th.initiativeFirst(initiative.firstSide)}</p>
      <p>{th.initiativeFirstTurn(initiative.firstSide)}</p>
    </div>
  )
}

function DeploymentPanel({ snapshot, session, data }: { snapshot: SessionSnapshot; session: BattleSession; data: GameData }) {
  const { state } = snapshot
  const side = state.sideToAct
  const roster = state.deployment?.roster.filter((u) => u.side === side) ?? []
  const placed = state.deployment?.placements[side] ?? {}
  const canConfirm = legalActions(state).some((a) => a.type === 'confirmDeployment')
  return (
    <section className="panel controls">
      <p className="hint">{snapshot.rejection !== null ? th.rejection[snapshot.rejection] : th.deploymentHint(side)}</p>
      <p className="hint">{th.deploymentPick}</p>
      <ul className="roster">
        {roster.map((unit) => {
          const tile = placed[unit.id]
          return (
            <li key={unit.id}>
              <button
                type="button"
                className={`roster-unit side-${side}`}
                aria-pressed={snapshot.selectedUnit === unit.id}
                onClick={() => session.selectUnit(unit.id)}
              >
                <strong>{unitName(unit, data)}</strong> <span>{tile ? th.placedOn(tileName(tile)) : th.notPlaced}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <button type="button" className="primary" disabled={!canConfirm} onClick={() => session.confirmDeployment()}>
        {th.confirmDeployment}
      </button>
      {!canConfirm && <p className="hint">{th.confirmNeedsAll}</p>}
    </section>
  )
}

function TurnPanel({ snapshot, session, data }: { snapshot: SessionSnapshot; session: BattleSession; data: GameData }) {
  const [warning, setWarning] = useState<readonly string[] | null>(null)
  const { state } = snapshot
  const selected = state.units.find((u) => u.id === snapshot.selectedUnit)
  const current = state.units.find((u) => u.id === state.activations.current)
  const nameOf = (id: string) => {
    const unit = state.units.find((u) => u.id === id)
    return unit ? unitName(unit, data) : id
  }

  const hint = (() => {
    if (snapshot.rejection !== null) return th.rejection[snapshot.rejection]
    if (selected === undefined) return th.hintSelect(state.sideToAct)
    const { current: playing, started, limit } = state.activations
    if (started.includes(selected.id) && playing !== selected.id) return th.hintActivationOver
    if (!started.includes(selected.id) && started.length >= limit) return th.hintActivationLimit(limit)
    if (selected.hasMoved) return th.hintAlreadyMoved
    if (current !== undefined && current.id !== selected.id) return th.hintSwitchEnds(unitName(current, data))
    return th.hintMove
  })()

  function onEndTurn() {
    const idle = idleUnits(state)
    if (idle.length > 0) setWarning(idle.map(nameOf))
    else session.endTurn()
  }

  return (
    <section className="panel controls">
      <p className="hint">{hint}</p>
      {selected !== undefined && <UnitCard unit={selected} data={data} move={derivedValues(state, selected.id).move} />}
      {warning === null ? (
        <button type="button" className="primary" onClick={onEndTurn}>
          {th.endTurn}
        </button>
      ) : (
        <div className="warning" role="alertdialog" aria-labelledby="end-turn-warning">
          <strong id="end-turn-warning">{th.endTurnWarnTitle}</strong>
          <p>{th.endTurnWarnBody(warning.join(', '))}</p>
          <div className="buttons">
            <button
              type="button"
              className="primary"
              onClick={() => {
                setWarning(null)
                session.endTurn()
              }}
            >
              {th.endTurnAnyway}
            </button>
            <button type="button" className="secondary" onClick={() => setWarning(null)}>
              {th.keepPlaying}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function UnitCard({ unit, data, move }: { unit: UnitState; data: GameData; move: number }) {
  const details =
    unit.kind === 'tamer'
      ? [th.level(unit.level), th.movementType.ground]
      : [th.star(unit.star), th.element[unit.element], th.movementType[unit.movement]]
  return (
    <div className={`unit-card side-${unit.side}`}>
      <strong>{unitName(unit, data)}</strong> <span className="team">{th.team(unit.side)}</span>
      <div>{[...details, th.move(move)].join(' · ')}</div>
    </div>
  )
}

function EventLog({ events, units, data }: { events: readonly BattleEvent[]; units: readonly UnitState[]; data: GameData }) {
  const name = (id: string) => {
    const unit = units.find((u) => u.id === id)
    return unit ? `${unitName(unit, data)} (${th.team(unit.side)})` : id
  }
  const lines = events.flatMap((event): string[] => {
    switch (event.type) {
      case 'unitPlaced':
        // Placements stay hidden from the other side; the reveal is logged instead.
        return []
      case 'deploymentConfirmed':
        return [th.logDeploymentConfirmed(event.side)]
      case 'deploymentRevealed':
        return [th.logRevealed]
      case 'initiativeRolled':
        return [th.logInitiative(event.rolls.A.total, event.rolls.B.total, event.tie)]
      case 'initiativeDecided':
        return [th.logInitiativeDecided(event.firstSide)]
      case 'unitMoved':
        return [th.logMoved(name(event.unit), tileName(event.from), tileName(event.to))]
      case 'turnEnded':
        return [th.logTurnEnded(event.side)]
      case 'turnStarted':
        return [th.logTurnStarted(event.side, event.turn, event.round)]
    }
  })
  if (lines.length === 0) return <p className="empty">{th.logEmpty}</p>
  // Newest first; the oldest entries scroll off after a while.
  return (
    <ul>
      {lines
        .map((line, index) => ({ line, index }))
        .reverse()
        .slice(0, 12)
        .map(({ line, index }) => (
          <li key={index}>{line}</li>
        ))}
    </ul>
  )
}
