import { readFileSync, writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { compareDecision, describe as describeComparison } from './simParity/compare.ts'
import type { SimDecision } from './simParity/rebuild.ts'

// Manual probe: AI_PROBE=<sim_decisions.json> AI_PROBE_OUT=<report.txt>
it.skipIf(process.env.AI_PROBE === undefined)('probe sim decisions', () => {
  const decisions = JSON.parse(readFileSync(process.env.AI_PROBE ?? '', 'utf8')) as SimDecision[]
  const lines: string[] = []
  let unit = 0, dest = 0, action = 0, all = 0
  for (const [i, d] of decisions.entries()) {
    const c = compareDecision(d)
    if (c.sameUnit) unit++
    if (c.sameAction) action++
    if (c.sameDest) dest++
    if (c.sameUnit && c.sameAction && c.sameDest && c.sameExtras) all++
    else lines.push(`#${i} ` + describeComparison(c, true))
  }
  const n = decisions.length
  writeFileSync(process.env.AI_PROBE_OUT ?? 'probe.txt', `n=${n} unit=${unit / n} action=${action / n} dest=${dest / n} all=${all / n}\n\n${lines.join('\n\n')}\n`)
}, 600000)
