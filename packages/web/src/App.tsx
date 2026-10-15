import { useState, useSyncExternalStore } from 'react'
import { createBattle, derivedValues, type BattleEvent, type UnitState } from '@mt/engine'
import { DataError, tileName, type GameData } from '@mt/shared'
import { BattleView } from './BattleView.tsx'
import { loadBundledGameData } from './gameData.ts'
import { createBattleSession, type BattleSession } from './session.ts'
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
    const state = createBattle({ scenario, board, species: data.species, skills: data.skills, dice: { seed: diceSeed } })
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

function unitName(unit: UnitState, data: GameData): string {
  return unit.kind === 'tamer' ? th.tamer : (data.species[unit.species]?.name ?? unit.species)
}

function BattleScreen({ data, session, diceSeed }: { data: GameData; session: BattleSession; diceSeed: string }) {
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot)
  const { state } = snapshot
  const scenario = data.scenarios[state.scenarioId]
  const board = data.boards[state.boardId]
  const selected = state.units.find((u) => u.id === snapshot.selectedUnit)
  const hint =
    snapshot.rejection !== null
      ? th.rejection[snapshot.rejection]
      : selected === undefined
        ? th.hintSelect(state.sideToAct)
        : selected.hasMoved
          ? th.hintAlreadyMoved
          : th.hintMove

  return (
    <main className="battle">
      <section className="status" aria-live="polite">
        <span className="round">{th.round(state.round)}</span>
        <span className={`turn side-${state.sideToAct}`}>
          {th.turnOf(state.sideToAct, state.turnNumber[state.sideToAct])}
        </span>
      </section>

      <BattleView session={session} />

      <section className="panel controls">
        <p className="hint">{hint}</p>
        {selected !== undefined && <UnitCard unit={selected} data={data} move={derivedValues(state, selected.id).move} />}
        <button type="button" className="end-turn" onClick={() => session.endTurn()}>
          {th.endTurn}
        </button>
      </section>

      <section className="panel log">
        <h2>{th.logTitle}</h2>
        <EventLog events={snapshot.log} state={state.units} data={data} />
      </section>

      <p className="meta">
        {scenario && board ? th.scenarioOnBoard(scenario.name, board.name) : null} · {th.diceSeed(diceSeed)}
      </p>
    </main>
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

function EventLog({ events, state, data }: { events: readonly BattleEvent[]; state: readonly UnitState[]; data: GameData }) {
  if (events.length === 0) return <p className="empty">{th.logEmpty}</p>
  const name = (id: string) => {
    const unit = state.find((u) => u.id === id)
    return unit ? `${unitName(unit, data)} (${th.team(unit.side)})` : id
  }
  const lines = events.map((event) => {
    switch (event.type) {
      case 'unitMoved':
        return th.logMoved(name(event.unit), tileName(event.from), tileName(event.to))
      case 'turnEnded':
        return th.logTurnEnded(event.side)
      case 'turnStarted':
        return th.logTurnStarted(event.side, event.turn, event.round)
    }
  })
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
