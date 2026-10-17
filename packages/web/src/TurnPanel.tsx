import { useState } from 'react'
import { COMMAND_OPTIONS, decidingSide, idleUnits, type BattleSession, type SessionSnapshot, type UnitState } from '@mt/session'
import { tileName, type GameData } from '@mt/shared'
import { unitName, namer, skillName } from './battleText.ts'
import { UnitCard } from './UnitDetails.tsx'
import { SkillButtons } from './SkillButtons.tsx'
import { TerrainSwatch } from './TerrainLegend.tsx'
import { PreviewCard } from './ActionPreview.tsx'
import { InspirationPrompt } from './InspirationPrompt.tsx'
import { MovePreviewPanel } from './MovePreviewPanel.tsx'
import { th } from './strings.ts'

function turnHint(snapshot: SessionSnapshot, selected: UnitState | undefined, current: UnitState | undefined, data: GameData) {
  const { state } = snapshot
  if (snapshot.rejection !== null) return th.rejection[snapshot.rejection]
  if (state.pending?.kind === 'inspiration') return th.inspiration.hint(state.pending.side)
  if (state.pending !== null) return th.hintRetreat(selected === undefined ? state.pending.unit : unitName(selected, data))
  if (selected === undefined) return th.hintSelect(state.sideToAct)
  if (snapshot.movePreview !== null) return th.hintMovePreview
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
    if (aimed?.effects?.replacesMove === true) return th.hintBlinkPreview
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
  const freeSkill = snapshot.skills.find((button) => button.free === true && button.usable)
  if (selected.hasActed && freeSkill !== undefined) {
    const skill = skillName(data, freeSkill.skill)
    return snapshot.reachable.length === 0 ? th.hintFreeSkill(skill) : th.hintMoveAndFreeSkill(skill)
  }
  if (snapshot.reachable.length === 0) {
    if (snapshot.canAttack) return th.hintAttackOnly
    if (snapshot.canDefend) return th.hintDefendOnly
    return selected.hasActed ? th.hintNothingLeft : selected.hasMoved ? th.hintAlreadyMoved : th.hintNoMove
  }
  if (current !== undefined && current.id !== selected.id) return th.hintSwitchEnds(unitName(current, data))
  if (snapshot.canAttack) return th.hintMoveOrAttack
  return snapshot.canDefend ? th.hintMoveOrDefend : th.hintMove
}

export function TurnPanel({ snapshot, session, data }: { snapshot: SessionSnapshot; session: BattleSession; data: GameData }) {
  const [warning, setWarning] = useState<readonly string[] | null>(null)
  const { state } = snapshot
  const selected = state.units.find((u) => u.id === snapshot.selectedUnit)
  const current = state.units.find((u) => u.id === state.activations.current)
  const nameOf = (id: string) => {
    const unit = state.units.find((u) => u.id === id)
    return unit ? unitName(unit, data) : id
  }

  function onEndTurn() {
    const idle = [...new Set([...idleUnits(state), ...snapshot.movedWithoutAction])]
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
      {snapshot.movePreview !== null && <MovePreviewPanel snapshot={snapshot} session={session} data={data} />}
      {snapshot.preview !== null && snapshot.movePreview === null && (
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
          {snapshot.ready !== null && snapshot.movePreview === null && (
            <button type="button" className="primary" onClick={() => session.confirmAttack()}>
              {snapshot.mode === 'skill' ? th.confirmSkill : snapshot.mode === 'command' ? th.confirmCommand : th.confirmAttack}
            </button>
          )}
          {snapshot.mode !== 'move' && snapshot.movePreview === null && (
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
