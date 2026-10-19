import { th } from './strings.ts'

/** Zero remains available as advice, with less emphasis than a threatened tile. */
export function ThreatCount({ count }: { count: number }) {
  return (
    <div className={`threat-count ${count === 0 ? 'muted' : 'threatened'}`}>
      <strong>{th.threatZone.count(count)}</strong>
      <p className="muted">{th.threatZone.estimate}</p>
    </div>
  )
}

export function ThreatZoneToggle({ visible, onChange }: { visible: boolean; onChange: (visible: boolean) => void }) {
  return (
    <section className="panel threat-controls">
      <button type="button" className="secondary" aria-pressed={visible} onClick={() => onChange(!visible)}>{th.threatZone.toggle}</button>
      {visible && <p className="muted">{th.threatZone.legend}</p>}
      <p className="muted">{th.threatZone.estimate}</p>
    </section>
  )
}
