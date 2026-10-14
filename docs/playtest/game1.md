# Game 1: Scenario 1 (Tamer Lv1, monsters 1 star, current HP)

Dice: real `random` via `roll.py` / `atk.py`; every roll is in `rolls.log`. Board helper: `board.py` (Chebyshev reach, Bresenham LoS).
Legend: grid cells are `<terrain><unit>`. TA/TB = Tamers, FG Fangrel (forest), WS Wispling (mountain, Flying), TW Tidewall (desert, Aquatic), QF Quillfox (water).

## Derived numbers
| Unit | HP | Move | Guard/Ward | Atk | Role DC | Save mods (VIT/SPI) |
|---|---|---|---|---|---|---|
| FG | 16 | 4 | 11/9 | +2 | 11 (POW) | +0 / -1 |
| WS | 14 | 4 | 11/11 | +2 | 11 (INT) | -1 / +1 |
| TA | 25 | 3 | 11/11 | +3 | 11 (SPI) | +1 / +1 |
| TW | 28 | 2 | 9/11 | +1 | 11 (VIT) | +2 / +1 |
| QF | 16 | 4 | 11/9 | +3 | 11 (SEN) | +0 / -1 |
| TB | 25 | 3 | 11/11 | +3 | 11 (SPI) | +1 / +1 |

Cross-element: FG adv vs QF, dis vs TW. WS adv vs TW, dis vs QF. QF adv vs WS. TW adv vs FG.

## Deployment (hidden, then revealed)
- A: TA d1, FG c1 (forest tile = own terrain, adv), WS d2. Why: FG gets home-terrain adv from turn 1; WS central.
- B: TB d7, TW d6, QF c7 (water tile = own terrain, adv). Why: QF on its own tile shoots with adv; TW screens in front.

## Initiative
A d20 [6]+1 = 7, B d20 [8]+1 = 9. **B goes first** (first turn: only 2 of 3 units act).

```
      a    b    c    d    e    f    g
row1 .    .    FFG  .TA  W    .    .
row2 .    M    .    .WS  .    D    .
row3 W    .    .    L    .    .    F
row4 .    F    .    K    .    F    .
row5 F    .    .    L    .    .    W
row6 .    D    .    .TW  .    M    .
row7 .    .    WQF  .TB  F    .    .
```

---
## B turn 1 (2 of 3 act)
- TW: move d6->c6; Shield Wall (self + adjacent QF c7, TB d7: Guarded +2 Guard/Ward). *Why: QF and TB are the obvious alpha-strike targets; TW makes a wall on the c-file.* Shield Wall CD: usable B3.
- QF (c7, own water tile = adv; water>mountain also adv, no stacking): Long Shot -> WS d2 (dist 5, WS Flying so LoS irrelevant). d20 [10,17]->17 +3 = 20 vs 11 HIT, 1d8 [8]+1 = **9**. WS 14 -> 5. *Why: WS is the squishiest enemy and the one with elemental adv against TW.*
- TB: did not act (first-turn limit). *Picked TB as the idle unit since it had no useful target in range.*
- State: WS 5/14. TW, QF, TB Guarded (+2) until B's next turn.

```
row1 .    .    FFG  .TA  W    .    .
row2 .    M    .    .WS  .    D    .
row3 W    .    .    L    .    .    F
row4 .    F    .    K    .    F    .
row5 F    .    .    L    .    .    W
row6 .    D    .TW  .    .    M    .
row7 .    .    WQF  .TB  F    .    .
```

## A turn 1
- TA (d1): First Aid -> WS (adjacent) 1d8 [8]+1 = 9; WS 5 -> 14 (cap). **Command (b) on FG: +2 move** (FG at c1, dist 1). Then TA moved d1->d4 (move after action). *Why: WS at 5 HP would die to one more Long Shot; Command +2 lets FG reach QF this turn. TA advances to keep FG within Command range 3 next turn and to body-block LoS to WS's row.*
- FG: move 6 (4+2) c1->c2->c3->b4->b5->b6->b7. Heavy Blow -> QF c7. Adv (forest > water). QF Guarded: Guard 13. d20 [3,11]->11 +2 = 13 vs 13 HIT, 2d8 [8,6]+2 = **16**. QF 16 -> **0 (KO)**. Heavy Blow CD: usable A3. *Why: one-shot range on the enemy shooter; the only way the 16 HP Quillfox dies on turn 1.*
- WS: move d2->d3 (Flying, ignores light tile). Burst centered d6 (dist 3), hits TW c6 and TB d7.
  - vs TW: adv (mountain > desert). Ward 11+2 = 13. d20 [19,2]->19 +2 = 21 HIT, 1d6 [6]+2 = **8**. TW 28 -> 20.
  - vs TB: neutral. **Log error found afterwards:** I used Ward 11, but TB was Guarded (Ward 13). The roll was 17, which hits either way, so the result stands. 1d6 [3]+2 = **5**. TB 25 -> 20.
  - Burst CD: usable A3. *Why: Burst was the only way to hit two targets; TW is weak to mountain.*

```
row1 .    .    F    .    W    .    .
row2 .    M    .    .    .    D    .
row3 W    .    .    LWS  .    .    F
row4 .    F    .    KTA  .    F    .
row5 F    .    .    L    .    .    W
row6 .    D    .TW  .    .    M    .
row7 .    .FG  W    .TB  F    .    .
```
HP: FG 16, WS 14, TA 25 | TW 20, TB 20, QF 0.

## B turn 2 (Guarded from Shield Wall ends at start of this turn)
- TW (c6): Taunt -> FG b7 (dist 1). DC 8+1+2 = 11. FG SPI save d20 [2]-1 = 1 FAILED -> Taunted 1. TW did not move. Taunt CD: usable B4. *Why: FG is the only real threat to TW; Taunt forces it to keep hitting the 20 HP Tidewall instead of walking to the Tamer.*
- TB: move d7->c7 (water; Tamer ignores terrain). Basic Attack -> FG b7: d20 [18]+3 = 21 vs 11 HIT, 1d8 [8] = **8**. FG 16 -> 8. *Why: with QF gone, B's only extra damage is the Tamer. Risky, but FG at 8 HP could die next turn to TW + TB.*
- (QF KO.)

```
row6 .    D    .TW  .    .    M    .
row7 .    .FG  WTB  .    F    .    .
```
HP: FG 8, WS 14, TA 25 | TW 20, TB 20.

## A turn 2
- TA (d4): Distract -> TB c7 (dist 3). **Ruling: LoS blocked by TW at c6 on the Bresenham line, but Distract is a save skill, not an "attack", so LoS was not applied.** DC 8+2+1 = 11. TB SPI d20 [2]+1 = 3 FAILED -> Off-balance. **Command (a) on FG: advantage on its next attack.** TA stays. *Why: Off-balance blunts TB's next swing on 8-HP FG; Command cancels FG's elemental disadvantage vs TW.*
- FG (Taunted -> must attack TW, in range): Rend -> TW. Disadvantage (desert > forest) + Command advantage = normal roll. d20 [20] **CRIT**, 1d6x2 [3,3]+2 = **8**. TW 20 -> 12. Bleed save VIT DC 11: d20 [5]+2 = 7 FAILED -> Bleed 3. Rend CD: usable A4. *Why: Heavy Blow on cooldown; Rend adds a damage clock.*
- WS (d3): Element Bolt -> TW c6 (dist 3; the line crosses TA at d4 but WS is Flying, so no block). Adv (mountain > desert). d20 [4,17]->17 +2 = 19 vs 11 HIT, 1d8 [7]+2 = **9**. TW 12 -> 3. *Why: focus fire; TW must spend its turn defending or die to Bleed.*

```
row3 W    .    .    LWS  .    .    F
row4 .    F    .    KTA  .    F    .
row5 F    .    .    L    .    .    W
row6 .    D    .TW  .    .    M    .
row7 .    .FG  WTB  .    F    .    .
```
HP: FG 8, WS 14, TA 25 | TW 3 (Bleed), TB 20 (Off-balance).

## B turn 3
- Start of turn: TW Bleed tick 1d4 [4] = 4. TW 3 -> **0 (KO)**.
- All B monsters at 0 HP. **Team A wins.** (B considered First Aid on TW, but Bleed triggers at turn start before any action. B's Inspiration was never usable: a Bleed tick is not a d20.)

## Result
- Winner: A (all enemy monsters KO). Turns: B 2 full turns (+ start of a 3rd), A 2 turns.
- Final HP%: A 47/55 = 85%; B 20/69 = 29%.
- Inspiration: neither side used it. **Player mistake on B's side:** B should have rerolled TW's Bleed save (rolled 7 vs DC 11). That Bleed tick is what ended the game. Saves get rolled mid-opponent-turn and are easy to forget, so this is worth a reminder on the rules card.
- Estimated human time: about 8-10 minutes, including deployment and rules lookups.
