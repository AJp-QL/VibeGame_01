# Rule changes v2 (apply on top of prototype_rules.md)

All rules in prototype_rules.md still apply except where changed below. Changes A-E were approved by the designer after the first simulation round.

## A. Tamer survivability
- Tamer HP = 25 + 4 x (Lv - 1). Lv 1 = 25, Lv 6 = 45.
- Tamer protection: while at least one allied monster (alive) is adjacent (distance 1) to the Tamer, the Tamer cannot be targeted by any enemy attack or skill from distance >= 2, and is not affected by enemy area effects (Burst) whose user is at distance >= 2 from the Tamer.
- Tamer Basic Attack damage becomes 1d6 (was 1d8). First Aid and other Tamer skills unchanged.

## B. Alpha strike
- Command option (b) gives +1 move (was +2). Option (a) unchanged.
- A side cannot use Command during its own first turn of the battle.

## C. Team balance
- Flying ignores line of sight only as the ATTACKER. A Flying target can be blocked like any other target.
- Tidewall: Move 3 at both 1 star and 4 star (overrides the heavy -1). Guard +2: Tidewall 1* Guard 11, Tidewall 4* Guard 12.
- Counter becomes a Minor skill (no cooldown). Everything else about Countering unchanged.

## D. Quillfox
- Long Shot range 4 (was 5). Mark range unchanged (5).

## E. Monster HP
- All monsters use the "+3 x stars" HP at every star level. Scenario 2 is now run with this HP only.

## Updated stat values (only changed columns)
| Unit | HP | Move | Guard |
|---|---|---|---|
| Fangrel 1* / 4* | 19 / 31 | 4 / 5 | 11 / 14 |
| Tidewall 1* / 4* | 31 / 50 | 3 / 3 | 11 / 12 |
| Wispling 1* / 4* | 17 / 29 | 4 / 4 | 11 / 13 |
| Quillfox 1* / 4* | 19 / 29 | 4 / 5 | 11 / 14 |
| Tamer Lv1 / Lv6 | 25 / 45 | 3 / 3 | 11 / 12 |

## Ambiguity rulings from round 1 (now official)
- Natural 20 always hits; critical doubles dice only, not modifiers.
- Inspiration rerolls the whole roll (both d20 under advantage/disadvantage). On a save, the defender's side spends it.
- Line of sight applies to every enemy-targeted skill at distance >= 2, including save skills (Taunt, Hex, Distract). Burst checks line of sight to the centre tile.
- A unit at 0 HP is removed from the board.
- Range 1 healing includes self unless the skill says ally.
- Command may be issued at any point during the Tamer's activation; target must be a monster that has not started its activation this turn.
- Taunted: must use an attack against the taunter if a move plus attack can reach it; otherwise moves as close as possible and may take only non-attack actions.
- Counterattacks never trigger another counter.
- Guarded from two sources does not stack; keep the higher bonus.
- No opportunity attacks; leaving melee is free (intended for now).
- Tied HP percentage at the turn limit is a draw.
