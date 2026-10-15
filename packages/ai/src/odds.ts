/**
 * Expected-value arithmetic on numbers the engine's previews give (attack
 * bonus, defence, roll mode, damage dice and modifier). No rules here: the
 * AI asks the engine what applies; this only turns it into expectations, the
 * same way sim.py's `hit_probs` / `dmg_stats` / `ev_raw` do. A counterfactual
 * the engine cannot preview (e.g. "+2 Guard if I Defend") is the same sum
 * with a changed number.
 */

/** −1 disadvantage, 0 normal, +1 advantage. */
export type Adv = -1 | 0 | 1

/** Chance of a non-critical hit and of a critical (natural 20 always hits, natural 1 always misses). */
export interface HitOdds {
  readonly pnc: number
  readonly pc: number
}

const hitCache = new Map<number, HitOdds>()

export function hitOdds(bonus: number, defence: number, adv: Adv): HitOdds {
  const key = (bonus + 64) * 100000 + (defence + 64) * 10 + (adv + 1)
  const cached = hitCache.get(key)
  if (cached !== undefined) return cached
  let pnc = 0
  let pc = 0
  for (let r = 1; r <= 20; r++) {
    const pr = adv === 0 ? 1 / 20 : adv > 0 ? (r * r - (r - 1) * (r - 1)) / 400 : ((21 - r) ** 2 - (20 - r) ** 2) / 400
    if (r === 20) pc += pr
    else if (r !== 1 && r + bonus >= defence) pnc += pr
  }
  const odds = { pnc, pc }
  hitCache.set(key, odds)
  return odds
}

const distCache = new Map<number, readonly (readonly [number, number])[]>()

/** Distribution of the sum of `n` dice with `s` faces. */
function diceDist(n: number, s: number): readonly (readonly [number, number])[] {
  const key = n * 1000 + s
  const cached = distCache.get(key)
  if (cached !== undefined) return cached
  let dist = new Map<number, number>([[0, 1]])
  for (let i = 0; i < n; i++) {
    const next = new Map<number, number>()
    for (const [k, p] of dist) for (let f = 1; f <= s; f++) next.set(k + f, (next.get(k + f) ?? 0) + p / s)
    dist = next
  }
  const sorted = [...dist.entries()].sort((a, b) => a[0] - b[0])
  distCache.set(key, sorted)
  return sorted
}

const dmgCache = new Map<string, readonly [number, number]>()

/** Expected damage capped at `hp`, and the chance it is at least `hp`, for damage max(1, dice + mod). */
export function damageOdds(n: number, s: number, mod: number, hp: number): readonly [number, number] {
  const key = `${n},${s},${mod},${hp}`
  const cached = dmgCache.get(key)
  if (cached !== undefined) return cached
  let e = 0
  let k = 0
  for (const [v, p] of diceDist(n, s)) {
    const x = Math.max(1, v + mod)
    e += p * Math.min(x, hp)
    if (x >= hp) k += p
  }
  const out = [e, k] as const
  dmgCache.set(key, out)
  return out
}

/** sim.py `ev_raw`: [expected damage, chance to drop the target]. Criticals double the dice. */
export function attackValue(
  bonus: number,
  defence: number,
  adv: Adv,
  n: number,
  s: number,
  mod: number,
  hp: number,
): readonly [number, number] {
  const { pnc, pc } = hitOdds(bonus, defence, adv)
  const [e1, k1] = damageOdds(n, s, mod, hp)
  const [e2, k2] = damageOdds(2 * n, s, mod, hp)
  return [pnc * e1 + pc * e2, pnc * k1 + pc * k2]
}

/** A Chance from the engine as a number. */
export function chance(c: { readonly numerator: number; readonly denominator: number }): number {
  return c.numerator / c.denominator
}
