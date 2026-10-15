import { useState, useSyncExternalStore } from 'react'
import {
  createBattle,
  derivedValues,
  legalActions,
  type AttackPreview,
  type BattleEvent,
  type BattleState,
  type Chance,
  type Initiative,
  type RollModeSource,
  type UnitState,
  type UnitTemplate,
} from '@mt/engine'
import { GLYPH_ALPHA, glyphColour, TERRAIN_COLOURS, TERRAIN_GLYPHS } from '@mt/battle'
import { DataError, tileName, type GameData, type Side, type Terrain } from '@mt/shared'
import { BattleView } from './BattleView.tsx'
import { loadBundledGameData } from './gameData.ts'
import { Menu, type ReplayNotice } from './Menu.tsx'
import { battleSetup, defaultChoice, type BattleChoice } from './battleChoice.ts'
import { battleReplay, downloadReplay, openReplay, type OpenedReplay } from './replay.ts'
import { ReplayScreen } from './ReplayScreen.tsx'
import { createBattleSession, idleUnits, type BattleSession, type SessionSnapshot } from './session.ts'
import { th } from './strings.ts'

/** What the app shows: the menu, a Battle, a Replay, or why the game data failed to load. */
type Screen =
  | {
      readonly kind: 'menu'
      readonly data: GameData
      readonly choice: BattleChoice
      /** Why the last Replay file could not be opened, if it could not. */
      readonly notice?: ReplayNotice
    }
  | {
      readonly kind: 'battle'
      readonly data: GameData
      readonly choice: BattleChoice
      readonly session: BattleSession
      readonly diceSeed: string
    }
  | {
      readonly kind: 'replay'
      readonly data: GameData
      /** The menu choice to return to. */
      readonly choice: BattleChoice
      readonly opened: Extract<OpenedReplay, { kind: 'ready' }>
    }
  | { readonly kind: 'error'; readonly details: string }

/** A fresh 64-bit Dice Seed as 16 hex digits. Randomness lives here, never in the engine. */
function randomDiceSeed(): string {
  const words = crypto.getRandomValues(new Uint32Array(2))
  return Array.from(words, (w) => w.toString(16).padStart(8, '0')).join('')
}

function errorScreen(error: unknown): Screen {
  const details = error instanceof DataError || error instanceof Error ? error.message : String(error)
  return { kind: 'error', details }
}

function openMenu(): Screen {
  try {
    const data = loadBundledGameData()
    return { kind: 'menu', data, choice: defaultChoice(data) }
  } catch (error) {
    return errorScreen(error)
  }
}

function startBattle(data: GameData, choice: BattleChoice): Screen {
  try {
    const diceSeed = randomDiceSeed()
    const session = createBattleSession(createBattle(battleSetup(data, choice, diceSeed)))
    return { kind: 'battle', data, choice, session, diceSeed }
  } catch (error) {
    return errorScreen(error)
  }
}

/** The Replay of the Battle so far, saved as a file; the export time comes from the UI, not the engine. */
function exportReplay(screen: Extract<Screen, { kind: 'battle' }>): void {
  const { actions } = screen.session.getSnapshot()
  downloadReplay(
    battleReplay(screen.data, screen.choice, screen.diceSeed, actions, {
      appVersion: __APP_VERSION__,
      createdAt: new Date().toISOString(),
    }),
  )
}

/** Open a Replay file: play it back, or go back to the menu saying why it cannot be. */
async function replayScreen(file: File, data: GameData, choice: BattleChoice): Promise<Screen> {
  const opened = openReplay(await file.text(), data)
  if (opened.kind === 'ready') return { kind: 'replay', data, choice, opened }
  return { kind: 'menu', data, choice, notice: opened }
}

export function App() {
  const [screen, setScreen] = useState(openMenu)
  return (
    <div className="app">
      <header className="app-header">
        <h1>{th.appTitle}</h1>
      </header>
      {screen.kind === 'menu' ? (
        <Menu
          data={screen.data}
          choice={screen.choice}
          notice={screen.notice ?? null}
          onChange={(choice) => setScreen({ ...screen, choice })}
          onStart={() => setScreen(startBattle(screen.data, screen.choice))}
          onOpenReplay={(file) => {
            replayScreen(file, screen.data, screen.choice).then(setScreen, (error: unknown) => setScreen(errorScreen(error)))
          }}
          onDismissNotice={() => setScreen({ kind: 'menu', data: screen.data, choice: screen.choice })}
        />
      ) : screen.kind === 'battle' ? (
        <BattleScreen
          // A new session per Battle: React and Phaser both start over.
          key={screen.diceSeed}
          data={screen.data}
          session={screen.session}
          diceSeed={screen.diceSeed}
          onPlayAgain={() => setScreen(startBattle(screen.data, screen.choice))}
          onMenu={() => setScreen({ kind: 'menu', data: screen.data, choice: screen.choice })}
          onExportReplay={() => exportReplay(screen)}
        />
      ) : screen.kind === 'replay' ? (
        <ReplayScreen
          data={screen.data}
          opened={screen.opened}
          onMenu={() => setScreen({ kind: 'menu', data: screen.data, choice: screen.choice })}
        />
      ) : (
        <section className="panel error" role="alert">
          <h2>{th.dataErrorTitle}</h2>
          <p>{th.dataErrorBody}</p>
          <pre>{screen.details}</pre>
        </section>
      )}
      <footer className="app-footer">{th.version(__APP_VERSION__)}</footer>
    </div>
  )
}

// ------------------------------------------------------------------ helpers

function unitName(unit: UnitTemplate, data: GameData): string {
  return unit.kind === 'tamer' ? th.tamer : (data.species[unit.species]?.name ?? unit.species)
}

const otherSide = (side: Side): Side => (side === 'A' ? 'B' : 'A')

/** Display rounding is the UI's job (rules §21.1): whole percent, or one decimal when needed. */
function percent(chance: Chance): string {
  return `${Math.round((chance.numerator * 1000) / chance.denominator) / 10}%`
}

/** Every Unit in play, on the Board or fallen, in Unit order (rules §21.4): team A Tamer, Monster 1, Monster 2, then B. */
function allUnits(state: BattleState): readonly UnitState[] {
  const order = (a: UnitState, b: UnitState) =>
    a.side !== b.side ? (a.side < b.side ? -1 : 1) : a.kind !== b.kind ? (a.kind === 'tamer' ? -1 : 1) : a.id < b.id ? -1 : 1
  return [...state.units, ...state.fallen].sort(order)
}

/** "Fangrel (ทีม A)" for any Unit id, including Units that fell. */
function namer(state: BattleState, data: GameData): (id: string) => string {
  return (id) => {
    const unit = allUnits(state).find((u) => u.id === id)
    return unit ? `${unitName(unit, data)} (${th.team(unit.side)})` : id
  }
}

function skillName(data: GameData, id: string): string {
  return data.skills[id]?.name ?? id
}

// ------------------------------------------------------------------- screen

interface BattleScreenProps {
  data: GameData
  session: BattleSession
  diceSeed: string
  /** A new Battle with the same menu choices (and a new Dice Seed). */
  onPlayAgain: () => void
  onMenu: () => void
  /** Download the Replay of this Battle so far. */
  onExportReplay: () => void
}

function BattleScreen({ data, session, diceSeed, onPlayAgain, onMenu, onExportReplay }: BattleScreenProps) {
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot)
  const { state } = snapshot
  const scenario = data.scenarios[state.scenarioId]
  const board = data.boards[state.boardId]

  return (
    <main className="battle">
      <StatusBar state={state} />

      {state.outcome === null && <BattleMenu onExportReplay={onExportReplay} onLeave={onMenu} />}

      {state.outcome !== null && (
        <section className={`panel result side-${state.outcome.winner}`} role="status">
          <h2>{th.resultTitle(state.outcome.winner)}</h2>
          <p>{th.cause[state.outcome.cause](otherSide(state.outcome.winner))}</p>
          <p>{th.resultRounds(state.round)}</p>
          <div className="buttons">
            <button type="button" className="primary" onClick={onPlayAgain}>
              {th.playAgain}
            </button>
            <button type="button" className="secondary" onClick={onExportReplay}>
              {th.replay.export}
            </button>
            <button type="button" className="secondary" onClick={onMenu}>
              {th.backToMenu}
            </button>
          </div>
          {/* Playtester stats (ticket 17) will be exported together with the Replay. */}
          <p className="muted">{th.replay.exportHint}</p>
        </section>
      )}

      <BattleView session={session} />
      <TerrainLegend />

      {state.phase === 'deployment' ? (
        <DeploymentPanel snapshot={snapshot} session={session} data={data} />
      ) : state.outcome === null ? (
        // Any accepted action closes an open End Turn warning.
        <TurnPanel key={snapshot.revision} snapshot={snapshot} session={session} data={data} />
      ) : null}

      {state.phase === 'play' && (
        <section className="panel hp-panel">
          <h2>{th.hpTitle}</h2>
          <HpList state={state} data={data} />
        </section>
      )}

      <section className="panel log">
        <h2>{th.logTitle}</h2>
        <EventLog events={snapshot.log} state={state} data={data} />
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

export function StatusBar({ state }: { state: BattleState }) {
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
      {state.outcome === null && limit < teamSize && (
        <span className="limit">{th.firstTurnLimit(limit, started.length)}</span>
      )}
    </section>
  )
}

/** The in-Battle menu: export the Replay so far, or leave the Battle (after a second tap to confirm). */
function BattleMenu({ onExportReplay, onLeave }: { onExportReplay: () => void; onLeave: () => void }) {
  const [view, setView] = useState<'closed' | 'open' | 'leaving'>('closed')
  if (view === 'closed') {
    return (
      <div className="battle-menu-toggle">
        <button type="button" className="secondary" aria-expanded={false} onClick={() => setView('open')}>
          ☰ {th.battleMenu.open}
        </button>
      </div>
    )
  }
  return (
    <section className="panel battle-menu" aria-label={th.battleMenu.title}>
      {view === 'open' ? (
        <>
          <p className="muted">{th.replay.exportHint}</p>
          <div className="buttons">
            <button type="button" className="secondary" onClick={onExportReplay}>
              {th.replay.export}
            </button>
            <button type="button" className="secondary" onClick={() => setView('leaving')}>
              {th.battleMenu.leave}
            </button>
            <button type="button" className="secondary" aria-expanded={true} onClick={() => setView('closed')}>
              {th.battleMenu.close}
            </button>
          </div>
        </>
      ) : (
        <div className="warning" role="alertdialog" aria-labelledby="leave-warning">
          <p id="leave-warning">{th.battleMenu.leaveConfirm}</p>
          <div className="buttons">
            <button type="button" className="secondary" onClick={onExportReplay}>
              {th.replay.export}
            </button>
            <button type="button" className="primary" onClick={onLeave}>
              {th.battleMenu.leaveYes}
            </button>
            <button type="button" className="secondary" onClick={() => setView('closed')}>
              {th.battleMenu.leaveNo}
            </button>
          </div>
        </div>
      )}
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

function turnHint(snapshot: SessionSnapshot, selected: UnitState | undefined, current: UnitState | undefined, data: GameData) {
  const { state } = snapshot
  if (snapshot.rejection !== null) return th.rejection[snapshot.rejection]
  if (selected === undefined) return th.hintSelect(state.sideToAct)
  if (snapshot.mode === 'attack') {
    if (snapshot.preview !== null) return th.hintConfirm
    return snapshot.canAttack ? th.hintChooseTarget : th.hintAllBlocked
  }
  const { current: playing, started, limit } = state.activations
  if (started.includes(selected.id) && playing !== selected.id) return th.hintActivationOver
  if (!started.includes(selected.id) && started.length >= limit) return th.hintActivationLimit(limit)
  if (selected.hasMoved) {
    if (snapshot.canAttack) return th.hintAttackOnly
    if (snapshot.canDefend) return th.hintDefendOnly
    return selected.hasActed ? th.hintNothingLeft : th.hintAlreadyMoved
  }
  if (current !== undefined && current.id !== selected.id) return th.hintSwitchEnds(unitName(current, data))
  if (snapshot.canAttack) return th.hintMoveOrAttack
  return snapshot.canDefend ? th.hintMoveOrDefend : th.hintMove
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

  function onEndTurn() {
    const idle = idleUnits(state)
    if (idle.length > 0) setWarning(idle.map(nameOf))
    else session.endTurn()
  }

  return (
    <section className="panel controls">
      <p className="hint">{turnHint(snapshot, selected, current, data)}</p>
      {selected !== undefined && <UnitCard unit={selected} state={state} data={data} />}
      {snapshot.mode === 'attack' && snapshot.blocked.length > 0 && (
        <BlockedTargets blocked={snapshot.blocked} name={namer(state, data)} />
      )}
      {snapshot.preview !== null && <PreviewCard preview={snapshot.preview} name={namer(state, data)} data={data} />}
      {warning === null ? (
        <div className="buttons">
          {selected !== undefined && snapshot.mode === 'move' && (
            <button
              type="button"
              className="secondary"
              disabled={!snapshot.canAttack && snapshot.blocked.length === 0}
              onClick={() => session.chooseAttack()}
            >
              {th.attack}
            </button>
          )}
          {selected !== undefined && snapshot.mode === 'move' && (
            <button type="button" className="secondary" disabled={!snapshot.canDefend} onClick={() => session.defend()}>
              {th.defend}
            </button>
          )}
          {snapshot.preview !== null && (
            <button type="button" className="primary" onClick={() => session.confirmAttack()}>
              {th.confirmAttack}
            </button>
          )}
          {snapshot.mode === 'attack' && (
            <button type="button" className="secondary" onClick={() => session.cancel()}>
              {th.cancel}
            </button>
          )}
          <button type="button" className="primary end-turn" onClick={onEndTurn}>
            {th.endTurn}
          </button>
        </div>
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

/** Guard and Ward bonus from Guarded, 0 when the Unit is not Guarded. */
function guardedBonus(unit: UnitState): number {
  return unit.statuses.reduce((bonus, s) => (s.id === 'guarded' ? Math.max(bonus, s.bonus) : bonus), 0)
}

function UnitCard({ unit, state, data }: { unit: UnitState; state: BattleState; data: GameData }) {
  const values = derivedValues(state, unit.id)
  const details =
    unit.kind === 'tamer'
      ? [th.level(unit.level), th.movementType.ground]
      : [th.star(unit.star), th.element[unit.element], th.movementType[unit.movement]]
  const terrain = state.terrain[unit.tile.y]?.[unit.tile.x]
  const standing = terrain === undefined ? [] : [th.standingOn(th.terrain[terrain])]
  const bonus = guardedBonus(unit)
  const defences =
    bonus > 0 ? th.defencesGuarded(values.guard + bonus, values.ward + bonus, bonus) : th.defences(values.guard, values.ward)
  return (
    <div className={`unit-card side-${unit.side}`}>
      <strong>{unitName(unit, data)}</strong> <span className="team">{th.team(unit.side)}</span>
      {bonus > 0 && <span className="tag guarded">{th.guardedTag(bonus)}</span>}
      <div>{[...details, th.move(values.move), ...standing].join(' · ')}</div>
      <div>{[th.hp(unit.hp, values.maxHp), defences, th.attackBonus(values.attackBonus)].join(' · ')}</div>
    </div>
  )
}

function BlockedTargets({ blocked, name }: { blocked: SessionSnapshot['blocked']; name: (id: string) => string }) {
  return (
    <div className="blocked">
      <strong>{th.blockedTitle}</strong>
      <ul>
        {blocked.map((b) => (
          <li key={b.unit}>{th.blockedBy(name(b.unit), b.blockedBy.map(name).join(', '))}</li>
        ))}
      </ul>
    </div>
  )
}

/** One line per source of advantage or disadvantage (rules §5.1). */
function sourceText(source: RollModeSource, name: (id: string) => string): string {
  switch (source.kind) {
    case 'element':
      return source.effect === 'advantage'
        ? th.sourceElementWins(th.element[source.attackerElement], th.element[source.targetElement])
        : th.sourceElementLoses(th.element[source.attackerElement], th.element[source.targetElement])
    case 'terrain':
      if (source.effect === 'disadvantage') {
        return th.sourceTerrainWeak(th.element[source.terrain], th.element[source.attackerElement])
      }
      return source.aquatic ? th.sourceTerrainAquatic : th.sourceTerrainMatch(th.element[source.terrain])
    case 'tamerProtection':
      return th.sourceTamerProtected(source.protectors.map(name).join(', '))
  }
}

/** Where advantage and disadvantage come from, and the net effect after cancelling (spec user story 22). */
function RollModeSources({ preview, name }: { preview: AttackPreview; name: (id: string) => string }) {
  const sources = preview.rollModeSources
  if (sources.length === 0) return <div className="muted">{th.previewNoSources}</div>
  const net = preview.rollMode === 'normal' ? th.previewNet.cancelled : th.previewNet[preview.rollMode]
  return (
    <div className="sources">
      <ul>
        {sources.map((source, index) => (
          <li key={index} className={source.effect}>
            <span className="tag">{th.rollEffect[source.effect]}</span> {sourceText(source, name)}
          </li>
        ))}
      </ul>
      <div className={`net ${preview.rollMode}`}>{net}</div>
    </div>
  )
}

function PreviewCard({ preview, name, data }: { preview: AttackPreview; name: (id: string) => string; data: GameData }) {
  return (
    <div className="preview" aria-live="polite">
      <strong>{th.previewTitle(name(preview.attacker), skillName(data, preview.skill), name(preview.target))}</strong>
      <div className="preview-numbers">
        <span className="big">{th.previewHit(percent(preview.hitChance))}</span>
        <span className="big">{th.previewDamage(preview.damage.min, preview.damage.max)}</span>
      </div>
      <div>
        {th.previewCritical(percent(preview.criticalChance), preview.criticalDamage.min, preview.criticalDamage.max)}
      </div>
      <RollModeSources preview={preview} name={name} />
      <div className="muted">
        {th.previewRoll(preview.attackBonus, th.defence[preview.defenceKind], preview.defence)}
        {preview.guardedBonus > 0 && ` ${th.previewGuarded(preview.guardedBonus)}`} · {th.previewRules}
      </div>
    </div>
  )
}

export function HpList({ state, data }: { state: BattleState; data: GameData }) {
  return (
    <ul className="hp-list">
      {allUnits(state).map((unit) => {
        const down = !state.units.some((u) => u.id === unit.id)
        return (
          <li key={unit.id} className={`side-${unit.side}${down ? ' down' : ''}`}>
            <span>
              {unitName(unit, data)} <span className="team">{th.team(unit.side)}</span>
              {!down && guardedBonus(unit) > 0 && <span className="tag guarded">{th.guardedTag(guardedBonus(unit))}</span>}
            </span>
            <span>{down ? th.down : th.hp(unit.hp, derivedValues(state, unit.id).maxHp)}</span>
          </li>
        )
      })}
    </ul>
  )
}

function logLines(event: BattleEvent, name: (id: string) => string, state: BattleState, data: GameData): string[] {
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
    case 'attackRolled': {
      const roll = th.logAttackRolled(
        name(event.attacker),
        skillName(data, event.skill),
        name(event.target),
        event.rolls,
        event.attackBonus,
        event.total,
        th.defence[event.defenceKind],
        event.defence,
      )
      const result = event.critical
        ? th.logCritical
        : event.natural === 1
          ? th.logNatural1
          : event.hit
            ? th.logHit
            : th.logMiss
      const mode = event.rollMode === 'normal' ? '' : ` (${th.rollEffect[event.rollMode]})`
      return [`${roll}${mode} → ${result}`]
    }
    case 'damageDealt':
      return [
        th.logDamage(
          name(event.target),
          event.amount,
          `${event.dice.count}d${event.dice.sides}`,
          event.rolls,
          event.modifier,
          event.hpAfter,
          derivedValues(state, event.target).maxHp,
        ),
      ]
    case 'unitDown':
      return [th.logUnitDown(name(event.unit))]
    case 'defended':
      return [th.logDefended(name(event.unit))]
    case 'statusApplied':
      return [th.logGuarded(name(event.unit), event.status.bonus)]
    case 'statusEnded':
      return [th.logStatusEnded(name(event.unit), th.status[event.status])]
    case 'battleEnded':
      return [`${th.logBattleEnded(event.winner, event.round)} (${th.cause[event.cause](otherSide(event.winner))})`]
    case 'turnEnded':
      return [th.logTurnEnded(event.side)]
    case 'turnStarted':
      return [th.logTurnStarted(event.side, event.turn, event.round)]
  }
}

export function EventLog({ events, state, data }: { events: readonly BattleEvent[]; state: BattleState; data: GameData }) {
  const name = namer(state, data)
  const lines = events.flatMap((event) => logLines(event, name, state, data))
  if (lines.length === 0) return <p className="empty">{th.logEmpty}</p>
  // Newest first; the whole Battle stays in the list (it scrolls).
  return (
    <ol reversed>
      {lines
        .map((line, index) => ({ line, index }))
        .reverse()
        .map(({ line, index }) => (
          <li key={index}>{line}</li>
        ))}
    </ol>
  )
}

// ------------------------------------------------------------------ legend

const TERRAINS: readonly Terrain[] = ['normal', 'forest', 'water', 'mountain', 'desert', 'light', 'dark']

const hex = (colour: number) => `#${colour.toString(16).padStart(6, '0')}`

/** The same colour and corner mark as a Board tile (battle palette), as a tiny SVG. */
function TerrainSwatch({ terrain }: { terrain: Terrain }) {
  const mark = hex(glyphColour(terrain))
  return (
    <svg className="swatch" viewBox="0 0 12 12" width="24" height="24" aria-hidden="true" shapeRendering="crispEdges">
      <rect width="12" height="12" fill={hex(TERRAIN_COLOURS[terrain])} />
      {TERRAIN_GLYPHS[terrain].flatMap((row, y) =>
        [...row].flatMap((cell, x) =>
          cell === '#' ? [<rect key={`${x}-${y}`} x={x + 2} y={y + 2} width="1" height="1" fill={mark} fillOpacity={GLYPH_ALPHA} />] : [],
        ),
      )}
    </svg>
  )
}

/** Every kind of tile under the Board, and the position rules behind a tap. */
function TerrainLegend() {
  return (
    <section className="panel legend">
      <ul className="swatches">
        {TERRAINS.map((terrain) => (
          <li key={terrain}>
            <TerrainSwatch terrain={terrain} /> {th.terrain[terrain]}
          </li>
        ))}
      </ul>
      <details>
        <summary>{th.legendTitle}</summary>
        <ul>
          <li>{th.legendWheel}</li>
          <li>{th.legendTerrain}</li>
          <li>{th.legendProtection}</li>
          <li>{th.legendLineOfSight}</li>
        </ul>
      </details>
    </section>
  )
}
