import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  COMMAND_OPTIONS,
  COUNTERATTACK,
  createBattle,
  decidingSide,
  derivedValues,
  legalActions,
  ROUND_LIMIT,
  type Action,
  type ActionPreview,
  type AttackPreview,
  type BattleEvent,
  type BattleOutcome,
  type BattleState,
  type Chance,
  type RollModeSource,
  type StatusOdds,
  type UnitState,
  type UnitTemplate,
} from '@mt/engine'
import { diceText, skillSummary, statName, statusDurationText, statusEffectText, statusName } from './skillText.ts'
import { GLYPH_ALPHA, glyphColour, TERRAIN_COLOURS, TERRAIN_GLYPHS } from '@mt/battle'
import { DataError, isOnBoard, tileName, type GameData, type Side, type Terrain } from '@mt/shared'
import { BattleView } from './BattleView.tsx'
import { loadBundledGameData } from './gameData.ts'
import { Menu, type ReplayNotice } from './Menu.tsx'
import { aiOpponent, battleSetup, defaultChoice, type BattleChoice } from './battleChoice.ts'
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
    const ai = aiOpponent(choice)
    const session = createBattleSession(createBattle(battleSetup(data, choice, diceSeed)), ai === undefined ? {} : { ai })
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
  if (id === COUNTERATTACK) return th.counterattackName
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

/**
 * Against the AI: wait this long before each AI action, so the human sees
 * every step (move, roll, damage) on the Board and in the log (spec user story 51).
 */
const AI_STEP_MS = 700
/** A quicker pause before the AI answers an Inspiration decision. */
const AI_DECISION_MS = 400

function BattleScreen({ data, session, diceSeed, onPlayAgain, onMenu, onExportReplay }: BattleScreenProps) {
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot)
  const { state } = snapshot

  // The AI plays one action at a time; each one changes the snapshot, which schedules the next.
  const { aiToAct, revision } = snapshot
  const aiDeciding = aiToAct && state.pending !== null
  useEffect(() => {
    if (!aiToAct) return undefined
    const timer = setTimeout(() => session.aiStep(), aiDeciding ? AI_DECISION_MS : AI_STEP_MS)
    return () => clearTimeout(timer)
  }, [session, aiToAct, aiDeciding, revision])
  const scenario = data.scenarios[state.scenarioId]
  const board = data.boards[state.boardId]

  return (
    <main className="battle">
      <StatusBar state={state} />
      {snapshot.aiSide !== null && <p className="muted vs-ai">{th.ai.sides(otherSide(snapshot.aiSide), snapshot.aiSide)}</p>}

      {state.outcome === null && <BattleMenu onExportReplay={onExportReplay} onLeave={onMenu} />}

      {state.outcome !== null && (
        <section className={`panel result side-${state.outcome.winner ?? 'draw'}`} role="status">
          <ResultSummary outcome={state.outcome} state={state} />
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

      {snapshot.screen === 'initiative' && (
        <div className="cover see-through" role="dialog" aria-modal="true" aria-labelledby="initiative-title">
          <div className="panel dialog">
            <h2 id="initiative-title">{th.revealTitle}</h2>
            <InitiativeResult log={snapshot.log} firstSide={state.initiative?.firstSide ?? null} />
            {state.pending?.kind === 'inspiration' ? (
              <InspirationPrompt snapshot={snapshot} session={session} data={data} />
            ) : (
              <button type="button" className="primary" onClick={() => session.continueHotseat()}>
                {th.startBattle}
              </button>
            )}
          </div>
        </div>
      )}

      {snapshot.screen === 'decisionHandoff' && state.outcome === null && (
        <div className="cover" role="dialog" aria-modal="true" aria-labelledby="decision-handoff-title">
          <div className="panel dialog">
            <h2 id="decision-handoff-title">{th.inspiration.handoffTitle(decidingSide(state))}</h2>
            <p>
              {state.pending?.kind === 'inspiration'
                ? th.inspiration.handoffDecide(state.pending.side, state.sideToAct)
                : th.inspiration.handoffBack(decidingSide(state))}
            </p>
            <button type="button" className="primary" onClick={() => session.continueHotseat()}>
              {th.inspiration.handoffReady(decidingSide(state))}
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
  const sides = ['A', 'B'] as const
  return (
    <section className="status" aria-live="polite">
      {state.round > 0 && <span className="round">{th.round(state.round, ROUND_LIMIT)}</span>}
      {state.firstSide !== null && (
        <span className={`turn side-${state.sideToAct}`}>
          {th.turnOf(state.sideToAct, state.turnNumber[state.sideToAct])}
        </span>
      )}
      {state.outcome === null && limit < teamSize && (
        <span className="limit">{th.firstTurnLimit(limit, started.length)}</span>
      )}
      <span className="totals">
        {th.damageTotals}:{' '}
        {sides.map((side) => (
          <span key={side} className={`side-${side}`}>
            {' '}
            {th.damageTotal(side, state.damageDealt[side])}
          </span>
        ))}
      </span>
      <span className="inspiration-left">
        {th.inspiration.name}:{' '}
        {sides.map((side) => (
          <span key={side} className={`side-${side}${state.inspiration[side] ? '' : ' spent'}`}>
            {' '}
            {th.inspirationLeft(side, state.inspiration[side])}
          </span>
        ))}
      </span>
    </section>
  )
}

/** Winner (or draw), why, how many Rounds and the damage totals (spec user story 47). */
export function ResultSummary({ outcome, state }: { outcome: BattleOutcome; state: BattleState }) {
  const { A, B } = state.damageDealt
  return (
    <>
      <h2>{th.resultTitle(outcome.winner)}</h2>
      {outcome.cause === 'turnLimit' ? (
        <>
          <p>{th.turnLimitCause(ROUND_LIMIT)}</p>
          <p>{th.turnLimitResult(A, B, outcome.winner)}</p>
        </>
      ) : (
        <p>{th.cause[outcome.cause](otherSide(outcome.winner ?? 'A'))}</p>
      )}
      <p>{th.resultRounds(state.round)}</p>
      {outcome.cause !== 'turnLimit' && <p>{th.resultDamage(A, B)}</p>}
    </>
  )
}

/**
 * A pending Inspiration decision (rules §18): the roll just made and the two
 * answers. Shown to the side that decides (Hotseat hands the device over first).
 */
function InspirationPrompt({ snapshot, session, data }: { snapshot: SessionSnapshot; session: BattleSession; data: GameData }) {
  const { state } = snapshot
  const pending = state.pending
  if (pending?.kind !== 'inspiration') return null
  const roll = logLines(pending.roll, namer(state, data), state, data)
  if (snapshot.aiSide === pending.side) {
    // The AI answers on its own; the human only sees the roll it is deciding about.
    return (
      <div className={`inspiration-prompt side-${pending.side}`} role="status">
        <strong>{th.inspiration.aiDeciding(pending.side)}</strong>
        {roll.map((line) => (
          <p key={line} className="roll">
            {line}
          </p>
        ))}
      </div>
    )
  }
  return (
    <div className={`inspiration-prompt side-${pending.side}`} role="group" aria-labelledby="inspiration-title">
      <strong id="inspiration-title">{th.inspiration.title(pending.side)}</strong>
      {roll.map((line) => (
        <p key={line} className="roll">
          {line}
        </p>
      ))}
      <p className="muted">{th.inspiration.body}</p>
      <div className="buttons">
        <button type="button" className="primary" onClick={() => session.useInspiration()}>
          {th.inspiration.use}
        </button>
        <button type="button" className="secondary" onClick={() => session.declineInspiration()}>
          {th.inspiration.decline}
        </button>
      </div>
    </div>
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

/** Every initiative roll so far (Inspiration rerolls included), and who starts once decided. */
function InitiativeResult({ log, firstSide }: { log: readonly BattleEvent[]; firstSide: Side | null }) {
  const rolls = log.flatMap((e) => (e.type === 'initiativeRolled' ? [e] : []))
  return (
    <div className="initiative">
      <h3>{th.initiativeTitle}</h3>
      {rolls.map((roll, index) => (
        <ul key={index}>
          {roll.rerolled !== undefined && <li className="rerolled">{th.initiativeRerolled(roll.rerolled)}</li>}
          {(['A', 'B'] as const).map((side) => (
            <li key={side}>{th.initiativeRoll(side, roll.rolls[side].d20, roll.rolls[side].modifier, roll.rolls[side].total)}</li>
          ))}
          {roll.tie && <li className="tie">{th.initiativeTie}</li>}
        </ul>
      ))}
      {firstSide !== null && (
        <>
          <p className={`first side-${firstSide}`}>{th.initiativeFirst(firstSide)}</p>
          <p>{th.initiativeFirstTurn(firstSide)}</p>
        </>
      )}
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
      <p className="hint">
        {snapshot.rejection !== null
          ? th.rejection[snapshot.rejection]
          : snapshot.aiSide !== null
            ? th.ai.deploymentHint(side, snapshot.aiSide)
            : th.deploymentHint(side)}
      </p>
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
  if (state.pending?.kind === 'inspiration') return th.inspiration.hint(state.pending.side)
  if (state.pending !== null) return th.hintRetreat(selected === undefined ? state.pending.unit : unitName(selected, data))
  if (selected === undefined) return th.hintSelect(state.sideToAct)
  if (snapshot.mode === 'attack') {
    if (snapshot.preview !== null) return th.hintConfirm
    return snapshot.canAttack ? th.hintChooseTarget : th.hintAllBlocked
  }
  if (snapshot.mode === 'command') {
    const target = snapshot.pendingTarget
    if (target === null) return th.hintChooseCommandTarget
    const unit = state.units.find((u) => u.id === target)
    const label = unit === undefined ? target : unitName(unit, data)
    return snapshot.pendingOption === null
      ? th.hintChooseCommandOption(label)
      : th.hintConfirmCommand(label, th.commandOption[snapshot.pendingOption])
  }
  if (snapshot.mode === 'skill' && snapshot.pendingSkill !== null) {
    const skill = skillName(data, snapshot.pendingSkill)
    const aimed = state.skills[snapshot.pendingSkill]
    if (aimed?.target === 'tile' && aimed.effects?.terrainTurns !== undefined) {
      if (snapshot.preview !== null) return th.hintConfirmSkill(skill)
      return snapshot.pendingTile === null ? th.hintChooseAttuneTile(skill) : th.hintChooseElement(skill, tileName(snapshot.pendingTile))
    }
    if (aimed?.target === 'tile') return snapshot.preview !== null ? th.hintConfirmSkill(skill) : th.hintChooseTile(skill)
    if (aimed?.target === 'area') {
      const max = aimed.area?.maxTargets ?? 1
      if (snapshot.pendingTile === null) return th.hintChooseCentre(skill)
      if (snapshot.chosenTargets.length === 0) return th.hintChooseAreaTargets(skill, max)
      return th.hintAreaMore(skill, snapshot.chosenTargets.length, max)
    }
    if (snapshot.preview !== null) return th.hintConfirmSkill(skill)
    return snapshot.targets.length > 0 ? th.hintChooseSkillTarget(skill) : th.hintSkillBlocked
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

  const inspected = state.units.find((u) => u.id === snapshot.inspectedUnit)
  const deciding = state.pending !== null

  // Against the AI, while the AI has the decision: what it is doing, no controls.
  if (snapshot.aiSide !== null && snapshot.aiSide === decidingSide(state)) {
    return (
      <section className="panel controls" aria-live="polite">
        {state.pending?.kind === 'inspiration' ? (
          <InspirationPrompt snapshot={snapshot} session={session} data={data} />
        ) : (
          <p className="hint">{th.ai.playing(snapshot.aiSide)}</p>
        )}
        {inspected !== undefined && <UnitCard unit={inspected} state={state} data={data} />}
      </section>
    )
  }

  return (
    <section className="panel controls">
      <p className="hint">{turnHint(snapshot, selected, current, data)}</p>
      {selected !== undefined && <UnitCard unit={selected} state={state} data={data} />}
      {inspected !== undefined && <UnitCard unit={inspected} state={state} data={data} />}
      {selected !== undefined && snapshot.mode === 'move' && !deciding && snapshot.skills.length > 0 && (
        <SkillButtons snapshot={snapshot} session={session} data={data} />
      )}
      {snapshot.mode === 'skill' && snapshot.elementChoices.length > 0 && (
        <div className="element-choices" role="group" aria-label={th.elementsTitle}>
          {snapshot.elementChoices.map((element) => (
            <button
              key={element}
              type="button"
              className="secondary"
              aria-pressed={snapshot.pendingElement === element}
              onClick={() => session.chooseElement(element)}
            >
              <TerrainSwatch terrain={element} /> {th.element[element]}
            </button>
          ))}
        </div>
      )}
      {snapshot.mode === 'command' && snapshot.pendingTarget !== null && (
        <div className="command-options" role="group" aria-label={th.commandTitle}>
          {COMMAND_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className="secondary"
              aria-pressed={snapshot.pendingOption === option}
              onClick={() => session.chooseCommandOption(option)}
            >
              {th.commandOption[option]}
              <span className="muted"> · {th.commandOptionNote[option]}</span>
            </button>
          ))}
          <p className="muted">{th.commandLoyalty}</p>
        </div>
      )}
      {snapshot.mode !== 'move' && snapshot.blocked.length > 0 && (
        <BlockedTargets blocked={snapshot.blocked} name={namer(state, data)} />
      )}
      {snapshot.preview !== null && (
        <PreviewCard preview={snapshot.preview} action={snapshot.ready} name={namer(state, data)} data={data} />
      )}
      {state.pending?.kind === 'inspiration' ? (
        <InspirationPrompt snapshot={snapshot} session={session} data={data} />
      ) : deciding ? (
        <div className="buttons">
          <button type="button" className="secondary" onClick={() => session.stayInPlace()}>
            {th.stayInPlace}
          </button>
        </div>
      ) : warning === null ? (
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
          {selected?.kind === 'tamer' && snapshot.mode === 'move' && (
            <button
              type="button"
              className="secondary"
              title={th.commandTitle}
              disabled={!snapshot.canCommand}
              onClick={() => session.chooseCommand()}
            >
              {th.command}
            </button>
          )}
          {snapshot.ready !== null && (
            <button type="button" className="primary" onClick={() => session.confirmAttack()}>
              {snapshot.mode === 'skill' ? th.confirmSkill : snapshot.mode === 'command' ? th.confirmCommand : th.confirmAttack}
            </button>
          )}
          {snapshot.mode !== 'move' && (
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

/** Guard and Ward bonus from statuses (Guarded), 0 when none. */
function guardedBonus(unit: UnitState, state: BattleState): number {
  return unit.statuses.reduce(
    (bonus, s) => (state.statusTypes[s.id]?.effects.defenceFromSource ? Math.max(bonus, s.bonus ?? 0) : bonus),
    0,
  )
}

function UnitCard({ unit, state, data }: { unit: UnitState; state: BattleState; data: GameData }) {
  const values = derivedValues(state, unit.id)
  const details =
    unit.kind === 'tamer'
      ? [th.level(unit.level), th.movementType.ground]
      : [th.star(unit.star), th.element[unit.element], th.movementType[unit.movement]]
  const terrain = state.terrain[unit.tile.y]?.[unit.tile.x]
  const standing = terrain === undefined ? [] : [th.standingOn(th.terrain[terrain])]
  const bonus = guardedBonus(unit, state)
  const defences =
    bonus > 0 ? th.defencesGuarded(values.guard + bonus, values.ward + bonus, bonus) : th.defences(values.guard, values.ward)
  return (
    <div className={`unit-card side-${unit.side}`}>
      <strong>{unitName(unit, data)}</strong> <span className="team">{th.team(unit.side)}</span>
      <div>{[...details, th.move(values.move), ...standing].join(' · ')}</div>
      <div>{[th.hp(unit.hp, values.maxHp), defences, th.attackBonus(values.attackBonus)].join(' · ')}</div>
      {(unit.coveredBy !== undefined || state.command?.target === unit.id) && (
        <div>
          {unit.coveredBy !== undefined && <span className="tag status-tag positive">{th.coveredTag(namer(state, data)(unit.coveredBy))}</span>}{' '}
          {state.command?.target === unit.id && (
            <span className="tag status-tag positive">
              {state.command.spent === true ? th.commandSpentTag : th.commandTag(th.commandOption[state.command.option])}
            </span>
          )}
        </div>
      )}
      <StatusList unit={unit} state={state} />
    </div>
  )
}

/** Every status on a Unit with what it does and how long it has left (spec user story 41). */
function StatusList({ unit, state }: { unit: UnitState; state: BattleState }) {
  if (unit.statuses.length === 0) return <div className="muted">{th.noStatuses}</div>
  return (
    <ul className="statuses">
      {unit.statuses.map((status) => {
        const type = state.statusTypes[status.id]
        if (type === undefined) return null
        return (
          <li key={status.id} className={`status ${type.polarity}`}>
            <span className={`tag status-tag ${type.polarity}`}>{type.name}</span> {statusEffectText(type, status)} ·{' '}
            <span className="muted">{statusDurationText(type, status)}</span>
          </li>
        )
      })}
    </ul>
  )
}

/** Small status chips for lists; tap one to read what it does and how long it lasts. */
function StatusChips({ unit, state }: { unit: UnitState; state: BattleState }) {
  const [open, setOpen] = useState<string | null>(null)
  const shown = unit.statuses.find((s) => s.id === open)
  const shownType = shown === undefined ? undefined : state.statusTypes[shown.id]
  return (
    <>
      {unit.statuses.map((status) => {
        const type = state.statusTypes[status.id]
        if (type === undefined) return null
        const badge = status.turnsLeft === undefined ? '' : ` ${th.statusTurnsBadge(status.turnsLeft)}`
        return (
          <button
            key={status.id}
            type="button"
            className={`tag status-tag ${type.polarity}`}
            aria-expanded={open === status.id}
            onClick={() => setOpen(open === status.id ? null : status.id)}
          >
            {type.name}
            {badge}
          </button>
        )
      })}
      {shown !== undefined && shownType !== undefined && (
        <span className="status-detail">
          {statusEffectText(shownType, shown)} · {statusDurationText(shownType, shown)}
        </span>
      )}
    </>
  )
}

/** The selected Unit's loadout: tap to aim; cooldown shows as a number on the button (rules §13.2). */
function SkillButtons({ snapshot, session, data }: { snapshot: SessionSnapshot; session: BattleSession; data: GameData }) {
  const statuses = snapshot.state.statusTypes
  return (
    <div className="skills">
      <strong>{th.skillsTitle}</strong>
      <ul>
        {snapshot.skills.map((button) => {
          const skill = data.skills[button.skill]
          const reason = !button.implemented
            ? button.tier === 'passive'
              ? th.skillPassive
              : th.skillNotYet
            : button.spent
              ? th.skillSpent
              : button.cooldown > 0
                ? th.cooldownTitle(button.cooldown)
                : null
          return (
            <li key={button.skill}>
              <button
                type="button"
                className={`skill tier-${button.tier}`}
                disabled={!button.usable}
                aria-pressed={snapshot.pendingSkill === button.skill}
                onClick={() => session.chooseSkill(button.skill)}
              >
                <span className="skill-name">{skillName(data, button.skill)}</span>
                {button.cooldown > 0 && (
                  <span className="cooldown" aria-label={th.cooldownTitle(button.cooldown)}>
                    {button.cooldown}
                  </span>
                )}
              </button>
              <span className="skill-info">
                {skill !== undefined && skillSummary(skill, statuses)}
                {reason !== null && <span className="reason"> · {reason}</span>}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function BlockedTargets({ blocked, name }: { blocked: SessionSnapshot['blocked']; name: (id: string) => string }) {
  return (
    <div className="blocked">
      <strong>{th.blockedTitle}</strong>
      <ul>
        {blocked.map((b) => (
          <li key={b.unit}>
            {b.reason === 'target-hidden'
              ? th.blockedHidden(name(b.unit))
              : th.blockedBy(name(b.unit), b.blockedBy.map(name).join(', '))}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** One line per source of advantage or disadvantage (rules §5.1). */
function sourceText(
  source: RollModeSource,
  name: (id: string) => string,
  statuses: BattleState['statusTypes'],
  commandDropped: boolean,
): string {
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
    case 'status':
      return source.holder === 'attacker'
        ? th.sourceAttackerStatus(statusName(statuses, source.status))
        : th.sourceTargetStatus(statusName(statuses, source.status))
    case 'command':
      return commandDropped ? th.sourceCommandDropped(name(source.tamer)) : th.sourceCommand(name(source.tamer))
    case 'tamerProtection':
      return th.sourceTamerProtected(source.protectors.map(name).join(', '))
  }
}

/** Where advantage and disadvantage come from, and the net effect after cancelling (spec user story 22). */
function RollModeSources({
  preview,
  name,
  statuses,
}: {
  preview: AttackPreview
  name: (id: string) => string
  statuses: BattleState['statusTypes']
}) {
  const sources = preview.rollModeSources
  if (sources.length === 0) return <div className="muted">{th.previewNoSources}</div>
  const net = preview.rollMode === 'normal' ? th.previewNet.cancelled : th.previewNet[preview.rollMode]
  // Rules §5.3: Command's advantage does not count against a protected Tamer.
  const commandDropped = sources.some((s) => s.kind === 'tamerProtection')
  return (
    <div className="sources">
      <ul>
        {sources.map((source, index) => (
          <li key={index} className={source.effect}>
            <span className="tag">{th.rollEffect[source.effect]}</span> {sourceText(source, name, statuses, commandDropped)}
          </li>
        ))}
      </ul>
      <div className={`net ${preview.rollMode}`}>{net}</div>
    </div>
  )
}

/** The chance each status of a skill sticks: the target's save, or no save at all. */
function StatusOddsList({ odds, statuses }: { odds: readonly StatusOdds[]; statuses: BattleState['statusTypes'] }) {
  return (
    <ul className="status-odds">
      {odds.map((o) => {
        const status = statusName(statuses, o.status)
        return (
          <li key={`${o.target}-${o.status}`}>
            {o.save === null
              ? th.previewNoSave(status)
              : th.previewSave(status, percent(o.save.failChance), statName(o.save.stat), o.save.dc, o.save.modifier)}
          </li>
        )
      })}
    </ul>
  )
}

function PreviewCard({
  preview,
  action,
  name,
  data,
}: {
  preview: ActionPreview
  action: Action | null
  name: (id: string) => string
  data: GameData
}) {
  if (preview.type === 'effect' && action?.type === 'useSkill' && action.tile !== undefined && data.skills[action.skill]?.effects?.replacesMove === true) {
    return (
      <div className="preview" aria-live="polite">
        <strong>{th.logSkillUsed(name(preview.user), skillName(data, preview.skill), '')}</strong>
        <div>{th.previewTeleport(name(preview.user), tileName(action.tile))}</div>
      </div>
    )
  }
  if (preview.type === 'area') {
    return (
      <div className="preview" aria-live="polite">
        <strong>{th.previewArea(name(preview.user), skillName(data, preview.skill), tileName(preview.centre), preview.attacks.length)}</strong>
        <ol className="area-attacks">
          {preview.attacks.map((attack, index) => (
            <li key={attack.target}>
              <em>{th.previewAreaTarget(index + 1, name(attack.target))}</em>
              <AttackOdds preview={attack} name={name} data={data} />
            </li>
          ))}
        </ol>
      </div>
    )
  }
  if (preview.type === 'heal') {
    return (
      <div className="preview" aria-live="polite">
        <strong>
          {th.previewHeal(name(preview.user), skillName(data, preview.skill), name(preview.target), preview.min, preview.max, preview.hp, preview.maxHp)}
        </strong>
      </div>
    )
  }
  if (preview.type === 'terrain') {
    return (
      <div className="preview" aria-live="polite">
        <strong>
          {th.previewTerrain(
            name(preview.user),
            skillName(data, preview.skill),
            tileName(preview.tile),
            th.terrain[preview.from],
            th.terrain[preview.to],
            preview.turns,
            th.terrain[preview.original],
          )}
        </strong>
      </div>
    )
  }
  if (preview.type === 'effect' && data.skills[preview.skill]?.effects?.cover === true) {
    return (
      <div className="preview" aria-live="polite">
        <strong>{th.logSkillUsed(name(preview.user), skillName(data, preview.skill), preview.units.map(name).join(', '))}</strong>
        <div>{th.previewCover(name(preview.user), preview.units.map(name).join(', '))}</div>
      </div>
    )
  }
  if (preview.type === 'effect') {
    const statuses = preview.statuses.map((id) => statusName(data.statuses, id)).join(', ')
    return (
      <div className="preview" aria-live="polite">
        <strong>{th.logSkillUsed(name(preview.user), skillName(data, preview.skill), '')}</strong>
        <div>{th.previewEffect(statuses, preview.units.map(name).join(', '))}</div>
      </div>
    )
  }
  if (preview.type === 'save') {
    return (
      <div className="preview" aria-live="polite">
        <strong>{th.previewSaveTitle(name(preview.user), skillName(data, preview.skill), name(preview.target))}</strong>
        <StatusOddsList odds={preview.statuses} statuses={data.statuses} />
      </div>
    )
  }
  return (
    <div className="preview" aria-live="polite">
      <strong>{th.previewTitle(name(preview.attacker), skillName(data, preview.skill), name(preview.target))}</strong>
      <AttackOdds preview={preview} name={name} data={data} />
    </div>
  )
}

/** One attack's odds: hit, damage, critical, statuses, roll mode sources and the roll itself. */
function AttackOdds({ preview, name, data }: { preview: AttackPreview; name: (id: string) => string; data: GameData }) {
  return (
    <>
      <div className="preview-numbers">
        <span className="big">{th.previewHit(percent(preview.hitChance))}</span>
        <span className="big">
          {preview.damage === null ? th.previewNoDamage : th.previewDamage(preview.damage.min, preview.damage.max)}
        </span>
      </div>
      {preview.criticalDamage !== null && (
        <div>
          {th.previewCritical(percent(preview.criticalChance), preview.criticalDamage.min, preview.criticalDamage.max)}
        </div>
      )}
      {preview.statuses.length > 0 && (
        <div>
          {th.previewIfHit}: <StatusOddsList odds={preview.statuses} statuses={data.statuses} />
        </div>
      )}
      {preview.counterattack !== undefined && preview.counterattack.damage !== null && (
        <div>
          {th.previewCounterattack(
            name(preview.counterattack.attacker),
            percent(preview.counterattack.hitChance),
            preview.counterattack.damage.min,
            preview.counterattack.damage.max,
          )}
        </div>
      )}
      <RollModeSources preview={preview} name={name} statuses={data.statuses} />
      <div className="muted">
        {th.previewRoll(preview.attackBonus, th.defence[preview.defenceKind], preview.defence)}
        {preview.statusAttackBonuses.map((b) => ` (${th.previewAttackBonusStatus(statusName(data.statuses, b.status), b.bonus)})`)}
        {preview.guardedBonus > 0 && ` ${th.previewGuarded(preview.guardedBonus)}`}
        {(preview.damage?.statusModifiers ?? []).map(
          (m) => ` (${th.previewDamageStatus(statusName(data.statuses, m.status), m.bonus)})`,
        )}{' '}
        · {th.previewRules}
      </div>
    </>
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
              {!down && <StatusChips unit={unit} state={state} />}
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
    case 'initiativeRolled': {
      const line = th.logInitiative(event.rolls.A.total, event.rolls.B.total, event.tie)
      return [event.rerolled === undefined ? line : `${th.initiativeRerolled(event.rerolled)}: ${line}`]
    }
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
      const rerolled = event.rerolled === true ? `${th.logRerolled}: ` : ''
      return [`${rerolled}${roll}${mode} → ${result}`]
    }
    case 'damageDealt':
      if (event.coveredBy !== undefined) {
        return [
          th.logDamageCovered(
            name(event.target),
            name(event.coveredBy),
            event.amount,
            event.hpAfter,
            derivedValues(state, event.coveredBy).maxHp,
          ),
        ]
      }
      return [
        th.logDamage(
          name(event.target),
          event.amount,
          `${event.dice.count}d${event.dice.sides}`,
          event.rolls,
          event.modifier,
          event.hpAfter,
          derivedValues(state, event.target).maxHp,
          (event.statusModifiers ?? [])
            .map((m) => th.logDamageStatus(statusName(state.statusTypes, m.status), m.bonus))
            .join(', '),
        ),
      ]
    case 'unitDown':
      return [th.logUnitDown(name(event.unit))]
    case 'defended':
      return [th.logDefended(name(event.unit))]
    case 'skillUsed': {
      const used = data.skills[event.skill]
      // Burst: the centre and the order of its targets; each attack follows.
      if (used?.target === 'area' && event.tile !== undefined) {
        return [th.logAreaSkill(name(event.unit), skillName(data, event.skill), tileName(event.tile), event.targets.map(name).join(', '))]
      }
      // Blink says it in its teleport line; attack skills in their attack roll line; the others here.
      if (used?.effects?.replacesMove === true || used?.attack !== undefined) return []
      return [th.logSkillUsed(name(event.unit), skillName(data, event.skill), event.targets.filter((t) => t !== event.unit).map(name).join(', '))]
    }
    case 'saveRolled':
      return [
        (event.rerolled === true ? `${th.logRerolled}: ` : '') +
          th.logSave(
          name(event.unit),
          statusName(state.statusTypes, event.status),
          statName(event.stat),
          event.roll,
          event.modifier,
          event.total,
          event.dc,
          event.saved,
        ),
      ]
    case 'statusApplied': {
      const type = state.statusTypes[event.status.id]
      if (type === undefined) return []
      return [
        th.logStatusApplied(
          name(event.unit),
          type.name,
          statusEffectText(type, event.status),
          statusDurationText(type, event.status),
          event.refreshed === true,
        ),
      ]
    }
    case 'statusEnded': {
      const status = statusName(state.statusTypes, event.status)
      if (event.cause === 'attackRoll') return [th.logStatusBroken.attackRoll(name(event.unit), status)]
      if (event.cause === 'terrain') {
        // The terrain the skill that gave it needs (Camouflage: forest).
        const needed = Object.values(data.skills).find(
          (s) => s.effects?.requiresTerrain !== undefined && (s.applies ?? []).some((a) => a.status === event.status),
        )?.effects?.requiresTerrain
        return [th.logStatusBroken.terrain(name(event.unit), status, th.terrain[needed ?? 'forest'])]
      }
      return [th.logStatusEnded(name(event.unit), status)]
    }
    case 'statusTicked':
      return [
        th.logStatusTicked(
          name(event.unit),
          statusName(state.statusTypes, event.status),
          event.amount,
          diceText(event.dice),
          event.rolls,
          event.hpAfter,
          derivedValues(state, event.unit).maxHp,
        ),
      ]
    case 'unitTeleported':
      return [th.logTeleported(name(event.unit), skillName(data, event.skill), tileName(event.from), tileName(event.to))]
    case 'unitRetreated':
      return [th.logRetreated(name(event.unit), tileName(event.from), tileName(event.to))]
    case 'retreatDeclined':
      return [th.logRetreatDeclined(name(event.unit))]
    case 'unitPushed':
      return [th.logPushed(name(event.unit), name(event.by), tileName(event.from), tileName(event.to))]
    case 'pushBlocked':
      return [
        th.logPushBlocked(
          name(event.unit),
          isOnBoard(event.tile) ? tileName(event.tile) : '',
          event.blockedBy === 'offBoard' ? null : name(event.blockedBy),
        ),
      ]
    case 'counterattack':
      return [th.logCounterattack(name(event.unit), name(event.target), diceText(event.dice))]
    case 'healed':
      return [
        th.logHealed(
          name(event.source),
          skillName(data, event.skill),
          name(event.target),
          event.amount,
          diceText(event.dice),
          event.rolls,
          event.modifier,
          event.hpAfter,
          derivedValues(state, event.target).maxHp,
        ),
      ]
    case 'coverApplied':
      return [th.logCoverApplied(name(event.by), name(event.unit), event.refreshed === true)]
    case 'coverEnded':
      return [th.logCoverEnded(name(event.unit), name(event.by))]
    case 'terrainChanged':
      return [
        th.logTerrainChanged(
          name(event.unit),
          skillName(data, event.skill),
          tileName(event.tile),
          th.terrain[event.from],
          th.terrain[event.to],
          event.turnsLeft,
        ),
      ]
    case 'terrainReverted':
      return [th.logTerrainReverted(tileName(event.tile), th.terrain[event.from], th.terrain[event.to])]
    case 'commandIssued':
      return [th.logCommandIssued(name(event.unit), name(event.target), th.commandOption[event.option])]
    case 'commandSpent':
      return [th.logCommandSpent(name(event.unit))]
    case 'inspirationOffered':
      // The prompt shows the offer; the log records the answer.
      return []
    case 'inspirationUsed':
      return [th.logInspirationUsed(event.side)]
    case 'inspirationDeclined':
      return [th.logInspirationDeclined(event.side)]
    case 'battleEnded': {
      const why =
        event.cause === 'turnLimit'
          ? th.turnLimitResult(event.damageDealt?.A ?? 0, event.damageDealt?.B ?? 0, event.winner)
          : th.cause[event.cause](otherSide(event.winner ?? 'A'))
      return [`${th.logBattleEnded(event.winner, event.round)} (${why})`]
    }
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
