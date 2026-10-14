# Monster Tactics RPG: Paper Prototype Rules (Phase 0)

Source: PRD "Monster Tactics RPG". This file is the single source of truth for the prototype test. Where the PRD was ambiguous, an interpretation is marked [INTERP]; report whether it worked.

## 1. Board
- 7x7 grid. Rows 1-7, columns a-g. Team A deploys in rows 1-2, Team B in rows 6-7.
- Distance = Chebyshev (8 directions, diagonal counts as 1). Used for movement and ranges.
- Terrain map (point-symmetric under 180 degree rotation):

```
row 1:  .  .  F  .  W  .  .
row 2:  .  M  .  .  .  D  .
row 3:  W  .  .  L  .  .  F
row 4:  .  F  .  K  .  F  .
row 5:  F  .  .  L  .  .  W
row 6:  .  D  .  .  .  M  .
row 7:  .  .  W  .  F  .  .
```
Legend: . normal (no element), F forest, W water, M mountain, D desert, L light, K dark. Columns a..g left to right.

## 2. Elements
- Wheel: forest > water > mountain > desert > forest. Light and dark each beat the other. Light/dark are neutral vs the four nature elements.
- Attacker element beats target element: attacker gets ADVANTAGE. Target element beats attacker element: attacker gets DISADVANTAGE. Tamers have no element (always neutral).
- Terrain: a monster standing on a tile of its own element gets ADVANTAGE on its attacks; standing on a tile whose element beats its own element gets DISADVANTAGE on its attacks. Normal tiles: nothing. Tamers ignore terrain.
- Flying units ignore terrain advantage AND disadvantage.
- Aquatic units treat water tiles as their own element. [INTERP] Aquatic "+1 move on water": if the unit starts its move on a water tile it gets +1 move.
- Advantage = roll 2d20 keep high; disadvantage = keep low. Multiple sources do not stack; any advantage + any disadvantage cancel to a normal roll.
- Flat numeric bonuses (Rallied +1 etc.) stack normally.

## 3. Turn structure
- Deployment: both sides place Tamer + 2 monsters in their 2 back rows, hidden and simultaneous, then reveal.
- Initiative once: each side rolls d20 + highest AGI mod in its team. Winner takes the first turn; sides alternate for the rest of the battle.
- First side's FIRST turn: only 2 of its 3 units may act.
- In its side's turn every unit gets Move + Action, units chosen in any order, each unit finishes before the next. [INTERP] A unit may move before or after its action, but not split the move.
- Turn limit: 10 turns per side. If unresolved, the side with the higher total remaining HP percentage (sum of current HP / sum of max HP over all its units) wins.
- Win: enemy Tamer HP reaches 0, or all enemy monsters are at 0 HP.
- Inspiration: each side once per battle may reroll one of its own d20 rolls (attack, save or initiative) and must take the new result.

## 4. Formulas
- Stat modifier = floor((stat - 10) / 2).
- Proficiency: monster = ceil(stars / 2) (1 star = +1, 4 star = +2). Tamer Lv 1-4 = +2, Lv 5-8 = +3.
- Physical attack: d20 + SEN mod + proficiency vs target Guard. Damage = dice + POW mod.
- Elemental attack: d20 + SEN mod + proficiency vs target Ward. Damage = dice + INT mod.
- Guard = 10 + AGI mod. Ward = 10 + SPI mod.
- Natural 20 = critical: roll damage dice twice. Natural 1 = always miss. Minimum damage 1.
- Save: target rolls d20 + mod of the save stat; result >= DC resists. DC = 8 + user's proficiency + mod of the user's role stat (Striker POW, Guardian VIT, Caster INT, Ranger SEN, Tamer SPI).
- Defend (any unit, as its Action): Guarded with Guard and Ward +4 until its side's next turn starts... [INTERP] statuses with duration "until next own turn" end at the start of that unit's next turn.
- Movement: Move = 3 + trunc(AGI mod / 4), light +1, heavy -1, minimum 2. [INTERP] trunc toward zero and minimum 2. Values are precomputed in the stat table.
- Cannot move through or end on occupied tiles, except Flying may pass over (not end on) units.
- Line of sight: for attacks at distance >= 2, any unit standing on a tile crossed by the straight line between the centers of attacker and target blocks the attack, unless the attacker or the target is Flying. Use a Bresenham line excluding the two end tiles.
- Hidden units cannot be targeted from distance >= 2.

## 5. Status effects
Durations count at the END of the turn of the side that has the status (duration 1 = expires at the end of that side's next turn). Same status does not stack; reapplying refreshes duration.

| Status | Effect | Duration | Save |
|---|---|---|---|
| Bleed | lose 1d4 HP at start of own side's turn | 3 | VIT |
| Pin | cannot move, can still act | 1 | VIT |
| Stun | loses Move and Action | 1 | SPI |
| Taunted | must attack the taunter if it is in range of any of its attacks; otherwise must move toward it | 1 | SPI |
| Weakened | damage -2 | 2 | SPI |
| Marked | all attackers get advantage vs it | 1 | none (applied on hit) |
| Off-balance | its next attack roll has disadvantage | until it attacks | none |
| Hidden | cannot be targeted from distance >= 2; ends when it attacks or leaves forest (Camouflage) | while condition holds | - |
| Blessed | advantage on next attack or save | 1 | - |
| Empowered | physical damage +2 | 2 | - |
| Guarded | Guard and/or Ward bonus as stated by source | until own next turn | - |
| Countering | when attacked by an enemy at distance 1 and still alive, immediately make one physical counterattack vs that enemy (1d8, or 2d8 with Pincer Guard); once per status | until own next turn | - |
| Rallied | +1 attack roll | 2 | - |

## 6. Skill tiers and cooldown
- Minor: no cooldown. Major: cooldown 2. Signature: once per battle. Passive: always on, no action.
- [INTERP] Major cooldown 2: after use, the skill becomes available again on the user's own turn 2 turns later (used on turn 1, usable again on turn 3). Report whether this feels right versus "usable on turn 4".
- Every unit also has Basic Attack (Minor, range 1, physical 1d8) and Defend.

## 7. Loadouts (4 skills per monster for the test)

Fangrel (Striker, light, Ground): Heavy Blow, Rend, Hit and Run, Pack Howl
Tidewall (Guardian, heavy, Aquatic): Taunt, Shield Wall, Counter, Pincer Guard (passive)
Wispling (Caster, light, Flying): Element Bolt, Burst, Hex, Blink
Quillfox (Ranger, light, Ground): Long Shot, Pin, Mark, Camouflage
Tamer (no element): Cover, Attune, First Aid, Distract, plus Command

| Skill | Tier | Range | Roll | Effect |
|---|---|---|---|---|
| Heavy Blow | Major | 1 | physical | 2d8 |
| Rend | Major | 1 | physical | 1d6 + Bleed (save VIT) |
| Hit and Run | Minor | 1 | physical | 1d8, then free 1-tile move |
| Pack Howl | Major | self + allies within 1 | none | Rallied 2 |
| Taunt | Major | 3 | save SPI | Taunted 1 |
| Shield Wall | Major | self + adjacent allies | none | Guarded: Guard and Ward +2 |
| Counter | Major | self | none | Countering |
| Pincer Guard | Passive | - | - | Countering counterattack uses 2d8 |
| Element Bolt | Minor | 4 | elemental | 1d8 |
| Burst | Major | 3 (3x3 area, center within range) | elemental, separate roll per enemy, no friendly fire | 1d6 |
| Hex | Major | 3 | save SPI | Weakened 2 |
| Blink | Minor | 2 | none | replaces Move: teleport to any empty tile within 2, ignoring blockers; does not use the Action |
| Long Shot | Minor | 5 | physical | 1d8 |
| Pin | Major | 4 | physical | 1d6 + Pin (save VIT) |
| Mark | Minor | 5 | physical, no damage | Marked 1 |
| Camouflage | Minor | self | none | Hidden while standing on forest |
| Cover | Major | 1 adjacent ally | none | until Tamer's next turn, damage to that ally is taken by the Tamer instead |
| Attune | Major | adjacent tile | none | tile becomes chosen element for 3 turns; latest change wins |
| First Aid | Major | 1 | none | heal 1d8 + SPI mod (cap at max HP) |
| Distract | Minor | 3 | save SPI | Off-balance |

Command [INTERP]: once per turn, free (does not use the Tamer's Action), during the Tamer's activation, target one own monster within 3 that has not acted yet this turn: either (a) its next attack this turn has advantage, or (b) it gets +2 move this turn.

Element Bolt is Wispling's basic ranged attack; Long Shot is Quillfox's.

## 8. Teams, elements and scenarios
- Team A: Tamer, Fangrel (forest), Wispling (mountain)
- Team B: Tamer, Tidewall (desert), Quillfox (water)
- Cross-team element cycle: Fangrel > Quillfox > Wispling > Tidewall > Fangrel.
- Scenario 1: Tamer Lv 1 + both monsters 1 star.
- Scenario 2: Tamer Lv 6 + both monsters 4 star. Run with HP variant "current" and variant "+3 x stars" (monsters only).
- No items. Loyalty full (no disobedience).

## 9. Stat blocks
HP column: current formula / variant (+3 x stars). Tamer has a single HP.

| Unit | POW | AGI | VIT | INT | SEN | SPI | HP | Move | Guard | Ward | Attack bonus | Main damage |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Fangrel 1* | 14 | 12 | 10 | 8 | 12 | 8 | 16 / 19 | 4 | 11 | 9 | +2 | 1d8+2 |
| Fangrel 4* | 22 | 18 | 14 | 10 | 16 | 12 | 19 / 31 | 5 | 14 | 11 | +5 | 1d8+6 |
| Tidewall 1* | 12 | 8 | 14 | 8 | 10 | 12 | 28 / 31 | 2 | 9 | 11 | +1 | 1d8+1 |
| Tidewall 4* | 16 | 10 | 22 | 10 | 14 | 18 | 38 / 50 | 2 | 10 | 14 | +4 | 1d8+3 |
| Wispling 1* | 8 | 12 | 8 | 14 | 12 | 12 | 14 / 17 | 4 | 11 | 11 | +2 | Bolt 1d8+2 |
| Wispling 4* | 10 | 16 | 12 | 22 | 18 | 18 | 17 / 29 | 4 | 13 | 14 | +6 | Bolt 1d8+6 |
| Quillfox 1* | 12 | 12 | 10 | 8 | 14 | 8 | 16 / 19 | 4 | 11 | 9 | +3 | 1d8+1 |
| Quillfox 4* | 16 | 18 | 12 | 10 | 22 | 12 | 17 / 29 | 5 | 14 | 11 | +8 | 1d8+3 |
| Tamer Lv1 | 10 | 12 | 12 | 10 | 12 | 12 | 25 | 3 | 11 | 11 | +3 | 1d8 |
| Tamer Lv6 | 10 | 14 | 14 | 10 | 14 | 16 | 32 | 3 | 12 | 13 | +5 | 1d8 |

## 10. Design targets to measure
- Battle length about 5-6 turns per side (about 10 minutes for humans).
- A monster survives about 3-4 hits that land.
- Tamer should not routinely die first.
- Terrain and positioning should change decisions.
- First-mover advantage should be small.
