import { useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import type { GameData } from '@mt/shared'
import { unitName } from './battleText.ts'
import type { ActionConfirmation } from './actionConfirmation.ts'
import { th } from './strings.ts'

export function StartUnitDialog({ confirmation, data }: { confirmation: ActionConfirmation; data: GameData }) {
  const pending = useSyncExternalStore(confirmation.subscribe, confirmation.getPending, confirmation.getPending)
  const snapshot = useSyncExternalStore(confirmation.session.subscribe, confirmation.session.getSnapshot, confirmation.session.getSnapshot)
  const dialog = useRef<HTMLDialogElement>(null)
  const returnButton = useRef<HTMLButtonElement>(null)
  const active = pending !== null && pending.snapshot === snapshot
  useLayoutEffect(() => {
    if (active) {
      dialog.current?.showModal()
      returnButton.current?.focus()
    }
  }, [active])
  if (!active) return null
  const name = (id: string) => {
    const unit = snapshot.state.units.find(unit => unit.id === id)
    return unit === undefined ? id : unitName(unit, data)
  }
  const current = name(pending.current)
  const next = name(pending.next)
  return (
    <dialog ref={dialog} className="panel start-unit-dialog" aria-labelledby="start-unit-title" onCancel={event => {
      event.preventDefault()
      confirmation.cancel()
    }}>
      <h2 id="start-unit-title">{th.startUnitTitle}</h2>
      <p>{th.startUnitBody(current, next)}</p>
      <div className="buttons">
        <button type="button" className="primary" onClick={confirmation.confirm}>{th.startUnit(next)}</button>
        <button type="button" className="secondary" ref={returnButton} onClick={confirmation.cancel}>{th.returnToUnit(current)}</button>
      </div>
    </dialog>
  )
}
