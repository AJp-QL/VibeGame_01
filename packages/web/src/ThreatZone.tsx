import { th } from './strings.ts'

/** Zero remains available as advice, with less emphasis than a threatened tile. */
export function ThreatCount({ count }: { count: number }) {
  return (
    <div className={`threat-count ${count === 0 ? 'muted' : 'threatened'}`}>
      <strong className="threat-value" aria-label={th.threatZone.count(count)}>
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
          <path fill="currentColor" fillRule="evenodd" d="M10 1 20 19H0L10 1Zm-1 6h2v6H9V7Zm0 8h2v2H9v-2Z" />
        </svg>
        <span aria-hidden="true">{count}</span>
      </strong>
      <p className="muted">{th.threatZone.estimate}</p>
    </div>
  )
}

export function ThreatZoneToggle({ visible, previewOpen = false, onChange }: { visible: boolean; previewOpen?: boolean; onChange: (visible: boolean) => void }) {
  return (
    <section className="panel threat-controls">
      <button type="button" className="secondary" aria-pressed={visible} onClick={() => onChange(!visible)}>{th.threatZone.toggle}</button>
      {visible && <p className="muted">{th.threatZone.legend}</p>}
      {!previewOpen && <p className="muted">{th.threatZone.boardEstimate}</p>}
    </section>
  )
}
