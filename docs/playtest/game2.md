# Game 2: Scenario 2 (Tamer Lv6, monsters 4 star), HP variant "+3 x stars"

Dice: real `random` via `roll.py` / `atk.py`; every roll is in `rolls.log` after "# G2 start". Same legend as game1.md.

## Derived numbers
| Unit | HP | Move | Guard/Ward | Atk | Dmg mod | Role DC | Save mods VIT/SPI |
|---|---|---|---|---|---|---|---|
| FG | 31 | 5 | 14/11 | +5 | POW +6 | 16 | +2 / +1 |
| WS | 29 | 4 | 13/14 | +6 | INT +6 | 16 | +1 / +4 |
| TA | 32 | 3 | 12/13 | +5 | +0 (First Aid +3 SPI) | 14 | +2 / +3 |
| TW | 50 | 2 | 10/14 | +4 | POW +3 | 16 | +6 / +4 |
| QF | 29 | 5 | 14/11 | +8 | POW +3 | 16 | +1 / +1 |
| TB | 32 | 3 | 12/13 | +5 | +0 | 14 | +2 / +3 |
Initiative mod = highest AGI mod = +4 for both sides.

## Deployment
- A: TA d1, FG c1 (forest), WS b2. *Why: after Game 1 shows that Long Shot focuses WS, WS starts on the flank, not centre-front.*
- B: TB d7, TW b6 (desert = own tile, adv on TW attacks), QF c7 (water = own tile). *Why: TW on home terrain beside QF so Shield Wall covers it.*

## Initiative
A [9]+4 = 13, B [18]+4 = 22. **B goes first** (2 of 3 act).

```
row1 .    .    FFG  .TA  W    .    .
row2 .    MWS  .    .    .    D    .
row3 W    .    .    L    .    .    F
row4 .    F    .    K    .    F    .
row5 F    .    .    L    .    .    W
row6 .    DTW  .    .    .    M    .
row7 .    .    WQF  .TB  F    .    .
```

---
## B turn 1 (2 of 3)
- TW (b6): Shield Wall -> TW + QF (c7 adjacent) Guarded +2. TB d7 is not adjacent. CD: usable B3. *Why: same alpha-strike fear as Game 1.*
- QF (c7, water, adv): Long Shot -> WS b2 (dist 5, Flying). [3,14]->14 +8 = 22 vs 13 HIT, 1d8 [7]+3 = **10**. WS 29 -> 19.
- TB idle.

## A turn 1
- TA: move d1->c2. First Aid -> WS b2: 1d8 [1]+3 = **4**, WS 19 -> 23. **Command (b) FG +2 move** (FG c1, dist 1). *Why: identical plan to Game 1. Command +2 is what puts FG into the back row on turn 1.*
- FG: move 7, c1 -> d6 (path verified with reach helper). Heavy Blow -> QF c7. Adv (forest>water). Guard 14+2 = 16. [15,19]->19 +5 = 24 HIT, 2d8 [2,3]+6 = **11**. QF 29 -> 18. CD: usable A3. *Why: no one-shot now (+3 x stars HP), but it is the only target where FG has adv.*
- WS (b2): Element Bolt -> TW b6 (dist 4). Adv (mountain>desert). Ward 14+2 = 16. [12,8]->12 +6 = 18 HIT, 1d8 [1]+6 = **7**. TW 50 -> 43. *Why: Burst could not reach both B units around FG without moving into QF range. Took the safe chip.*

```
row1 .    .    F    .    W    .    .
row2 .    MWS  .TA  .    .    D    .
row3 W    .    .    L    .    .    F
row4 .    F    .    K    .    F    .
row5 F    .    .    L    .    .    W
row6 .    DTW  .    .FG  .    M    .
row7 .    .    WQF  .TB  F    .    .
```
HP: FG 31, WS 23, TA 32 | TW 43, QF 18, TB 32.

## B turn 2 (Shield Wall ends)
- TW (b6): Taunt -> FG d6 (dist 2). DC 16. FG SPI [14]+1 = 15 FAILED. **A spends Inspiration** (A's own save roll): reroll [19]+1 = 20 RESISTED. CD: usable B4. *A's reason: a Taunted FG would be locked onto the 43-HP wall while TB, the actual win condition, sits next to it.*
- QF: move c7 -> g5 (5 tiles, water tile, own terrain). Long Shot -> WS b2 (dist 5). Adv. [10,7]->10 +8 = 18 vs 13 HIT, 1d8 [7]+3 = **10**. WS 23 -> 13. *Why: free disengage from adjacent FG (no opportunity attacks exist), back onto water for adv, keep focusing the caster.*
- TB (d7): Basic Attack -> FG d6. [19]+5 = 24 vs 14 HIT, 1d8 [8] = **8**. FG 31 -> 23. *Why: TB is adjacent anyway; retreating 3 tiles would not escape FG's 5 move.*

```
row1 .    .    F    .    W    .    .
row2 .    MWS  .TA  .    .    D    .
row3 W    .    .    L    .    .    F
row4 .    F    .    K    .    F    .
row5 F    .    .    L    .    .    WQF
row6 .    DTW  .    .FG  .    M    .
row7 .    .    W    .TB  F    .    .
```
HP: FG 23, WS 13, TA 32 | TW 43, QF 18, TB 32.

## A turn 2
- TA: move c2 -> b3. **Command (a) FG adv** (b3-d6 dist 3). Distract -> TW b6 (dist 3, DC 14): TW SPI [12]+4 = 16 RESISTED. *Why: tried to put Off-balance on TW before it could swing at FG; wasted, because TW's SPI +4 makes a DC 14 save a coin flip.*
- FG (d6, not Taunted): Rend -> **TB** d7. Command adv. Guard 12. [4,14]->14 +5 = 19 HIT, 1d6 [3]+6 = **9**. TB 32 -> 23. Bleed save VIT DC 16: [4]+2 = 6 FAILED -> Bleed 3. CD: usable A4. *Why: going for the Tamer win condition. Bleed on a Tamer with no cleanse is a clock.*
- WS: move b2 -> a3 (a3 to QF g5 = dist 6, out of Long Shot range 5). Burst centred c6 (dist 3), area b5-d7: TW b6, TB d7 (FG d6 inside, no friendly fire).
  - TW: adv, Ward 14. [14,12]->14 +6 = 20 HIT, 1d6 [4]+6 = **10**. TW 43 -> 33.
  - TB: Ward 13. [14]+6 = 20 HIT, 1d6 [4]+6 = **10**. TB 23 -> 13.
  - CD: usable A4. *Why: the range-6 hiding spot plus a two-target Burst. Positioning was the whole decision.*

```
row1 .    .    F    .    W    .    .
row2 .    M    .    .    .    D    .
row3 WWS  .TA  .    L    .    .    F
row4 .    F    .    K    .    F    .
row5 F    .    .    L    .    .    WQF
row6 .    DTW  .    .FG  .    M    .
row7 .    .    W    .TB  F    .    .
```
HP: FG 23, WS 13, TA 32 | TW 33, QF 18, TB 13 (Bleed).

## B turn 3
- Start: TB Bleed 1d4 [4] = 4. TB 13 -> 9.
- TW: move b6 -> c6 (adjacent to FG). Counter (Countering, 2d8 via Pincer Guard). CD: usable B5. *Why: Taunt is on cooldown. Shield Wall would cover nobody once TB runs. Counter punishes FG if it hits TW, and TW sits between FG and the a/b-file approach to TA.*
- QF (g5, water adv; FG>QF dis -> normal): Pin -> FG d6 (dist 3, LoS f5/e6 clear). [17]+8 = 25 vs 14 HIT, 1d6 [1]+3 = **4**. FG 23 -> 19. Pin save VIT DC 16: [8]+2 = 10 FAILED -> Pinned. CD: usable B5. *Why: FG is the unit about to kill TB; Pin stops it following.*
- TB: First Aid on self (**ruling: range 1 includes self**) 1d8 [3]+3 = **6**, TB 9 -> 15. Then move d7 -> g7 (3). *Why: get out of FG reach (Pinned anyway) and out of Burst centre range from a3; g7 is dist 6 from a3 and dist 4 from WS's possible tiles.* B considered Cover but no ally adjacent to TB was taking hits.

```
row1 .    .    F    .    W    .    .
row2 .    M    .    .    .    D    .
row3 WWS  .TA  .    L    .    .    F
row4 .    F    .    K    .    F    .
row5 F    .    .    L    .    .    WQF
row6 .    D    .TW  .FG  .    M    .
row7 .    .    W    .    F    .    .TB
```
HP: FG 19 (Pinned), WS 13, TA 32 | TW 33 (Countering), QF 18, TB 15 (Bleed).

## A turn 3
- TA (b3): **Command (a) WS adv first, while WS (a3) is within 3**, then move b3 -> e5, then First Aid -> FG d6: 1d8 [5]+3 = **8**, FG 19 -> 27. **Ruling: Command is free and is not the Action, so Command, then move, then Action is allowed (the move itself is not split).** *Why: WS needs adv to reliably finish TB. TA moves forward to heal FG.*
- WS: move a3 -> e3 (4). Element Bolt -> TB g7 (dist 4, Flying ignores LoS). Adv. [20,11]->20 **CRIT** +6 = 26, 1d8x2 [6,5]+6 = **17**. TB 15 -> **0**.
- **Team A wins** (enemy Tamer at 0 HP). FG (Pinned) did not need to act.

```
row1 .    .    F    .    W    .    .
row2 .    M    .    .    .    D    .
row3 W    .    .    L    .WS  .    F
row4 .    F    .    K    .    F    .
row5 F    .    .    L    .TA  .    WQF
row6 .    D    .TW  .FG  .    M    .
row7 .    .    W    .    F    .    .TB(KO)
```

## Result
- Winner: A (Tamer KO). Turns: B 3, A 3.
- Final HP%: A (27+13+32)/92 = 78%; B (33+18+0)/111 = 46%.
- Without the crit (normal 1d8+6 avg 10.5), TB survives at about 4-5 HP and B3's plan works. Bleed ticks would then likely finish TB at the start of B4 (4 HP left vs 1d4).
- Inspiration: A used it (Taunt save). B never used it; B's best moment was TB's Bleed save (6 vs 16).
- Counter, Cover, Attune, Camouflage/Hidden, Mark, Hex, Blink, Pack Howl, Hit and Run: never chosen.
- Estimated human time: 12-15 minutes (more modifiers to look up at 4 stars).
