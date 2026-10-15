/**
 * Thai string table: every piece of UI text comes from here. Game terms stay
 * in English as in CONTEXT.md (Battle, Board, Unit, Turn, Round, Tamer,
 * Monster, Star, Level, Dice Seed, Scenario, Move), as do skill names and
 * Guard/Ward. An English table can be added later with the same shape (spec:
 * English UI is out of scope).
 */
import type { Element, Side, Terrain } from '@mt/shared'
import type { BattleEndCause, RejectionCode, StatusId } from '@mt/engine'
import type { Mode } from './battleChoice.ts'

/** "+2", "0", "−1" (true minus sign). */
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0')

export const th = {
  appTitle: 'Monster Tactics',
  version: (version: string) => `เวอร์ชัน ${version}`,
  diceSeed: (seed: string) => `Dice Seed ${seed}`,
  scenarioOnBoard: (scenario: string, board: string) => `${scenario} บน Board ${board}`,

  round: (round: number) => `Round ${round}`,
  team: (side: Side) => `ทีม ${side}`,
  turnOf: (side: Side, turn: number) => `Turn ${turn} ของทีม ${side}`,
  endTurn: 'จบ Turn',
  firstTurnLimit: (limit: number, used: number) => `Turn แรกของทีมที่เริ่มก่อน: เล่นได้แค่ ${limit} จาก 3 Unit (เล่นไปแล้ว ${used})`,

  hintSelect: (side: Side) =>
    `แตะ Unit ของทีม ${side} เพื่อดูช่องที่เดินได้และศัตรูที่โจมตีได้ เล่นทีละ Unit ตามลำดับที่เลือกเอง`,
  hintMove: 'แตะช่องที่สว่างเพื่อเดิน หรือแตะ Unit เดิมอีกครั้งเพื่อยกเลิก',
  hintMoveOrAttack: 'แตะช่องที่สว่างเพื่อเดิน กด "โจมตี" เพื่อเลือกเป้า หรือกด "ป้องกัน"',
  hintMoveOrDefend: 'แตะช่องที่สว่างเพื่อเดิน หรือกด "ป้องกัน" (Guard และ Ward +2 จนถึง Turn ถัดไปของทีมตัวเอง)',
  hintAttackOnly: 'Unit นี้เดินแล้ว กด "โจมตี" เพื่อเลือกเป้า หรือกด "ป้องกัน" ได้',
  hintDefendOnly: 'Unit นี้เดินแล้ว ยังกด "ป้องกัน" ได้',
  hintAlreadyMoved: 'Unit นี้เดินไปแล้วใน Turn นี้',
  hintNothingLeft: 'Unit นี้เดินและใช้ Action ไปแล้วใน Turn นี้',
  hintChooseTarget: 'แตะศัตรูที่ไฮไลต์สีแดงเพื่อดูโอกาสโดนก่อนยืนยัน',
  hintConfirm: 'ดูโอกาสโดนและ damage แล้วกดยืนยัน หรือแตะศัตรูตัวอื่นเพื่อเปลี่ยนเป้า',
  hintAllBlocked: 'ศัตรูในระยะถูก Unit อื่นขวางแนวเล็งทั้งหมด (ช่องที่ขีดกากบาท) ลองเดินไปตำแหน่งอื่นก่อน',
  blockedTitle: 'เลือกไม่ได้: ถูกขวางแนวเล็ง (line of sight)',
  blockedBy: (target: string, blockers: string) => `${target}: ${blockers} ขวางอยู่`,
  hintBattleOver: 'Battle จบแล้ว',
  hintSwitchEnds: (unit: string) => `ถ้าเริ่มเล่น Unit อื่น ${unit} จะเล่นต่อใน Turn นี้ไม่ได้`,
  hintActivationOver: 'Unit นี้เล่นจบแล้วใน Turn นี้ เพราะเริ่มเล่น Unit อื่นไปแล้ว',
  hintActivationLimit: (limit: number) => `Turn นี้เล่นครบ ${limit} Unit แล้ว Unit นี้ต้องรอ Turn หน้า`,

  endTurnWarnTitle: 'ยังมี Unit ที่ยังไม่ได้ทำอะไร',
  endTurnWarnBody: (units: string) => `${units} ยังไม่ได้ทำอะไรใน Turn นี้ จะจบ Turn เลยไหม`,
  endTurnAnyway: 'จบ Turn เลย',
  keepPlaying: 'กลับไปเล่นต่อ',

  attack: 'โจมตี',
  defend: 'ป้องกัน',
  confirmAttack: 'ยืนยันโจมตี',
  cancel: 'ยกเลิก',
  playAgain: 'เล่นอีกครั้ง (ตั้งค่าเดิม)',
  backToMenu: 'กลับไปเมนู',

  menu: {
    title: 'ตั้งค่า Battle',
    scenarioTitle: 'Scenario',
    boardTitle: 'Board',
    modeTitle: 'โหมด',
    sideTitle: 'ทีมที่เล่น',
    /** Stage names by Scenario id; other Scenarios show their data name only. */
    stage: { scenario_1: 'ต้นเกม', scenario_2: 'กลางเกม' } as Readonly<Record<string, string>>,
    scenarioLabel: (name: string, stage: string | undefined) => (stage ? `${name}: ${stage}` : name),
    scenarioDetails: (level: number, star: number) => `Tamer Level ${level} · Monster ${star} Star`,
    /** One-line Board descriptions by Board id (data/boards/README.md has the full design notes). */
    boardBlurb: {
      crossroads: 'ทางแยกกลาง Board: แสงและมืดเรียงกลางแนวตั้ง ธาตุอื่นกระจายรอบสี่มุม',
      shallows: 'แม่น้ำตื้นพาดทแยงจากมุมถึงมุมผ่านกลาง Board ป่าอยู่สองข้างแม่น้ำ',
    } as Readonly<Record<string, string>>,
    boardPreview: (name: string) => `แผนที่ Board ${name}`,
    mode: {
      hotseat: 'Hotseat',
      ai: 'เล่นกับ AI',
    } satisfies Record<Mode, string>,
    modeNote: {
      hotseat: 'สองคนผลัดกันเล่นบนเครื่องเดียว',
      ai: 'เร็ว ๆ นี้ ยังเล่นไม่ได้',
    } satisfies Record<Mode, string>,
    side: (side: Side) => `ทีม ${side}`,
    start: 'เริ่ม Battle',
  },

  deploymentStatus: (side: Side) => `Deployment: ทีม ${side} วาง Unit`,
  deploymentHint: (side: Side) =>
    `วาง Tamer และ Monster 2 ตัวบนช่องว่างในโซนเริ่มของทีม ${side} (2 แถวหลัง) ดู terrain ทั้ง Board ได้ อีกฝั่งห้ามดูจอ`,
  deploymentPick: 'เลือก Unit แล้วแตะช่องที่สว่างเพื่อวาง แตะ Unit ที่วางแล้วเพื่อย้ายที่ได้จนกว่าจะยืนยัน',
  notPlaced: 'ยังไม่วาง',
  placedOn: (tile: string) => `อยู่ที่ ${tile}`,
  confirmDeployment: 'ยืนยันการวาง',
  confirmNeedsAll: 'วางให้ครบ 3 Unit ก่อนจึงยืนยันได้',
  handoffTitle: (from: Side) => `ทีม ${from} วางเสร็จแล้ว`,
  handoffBody: (from: Side, to: Side) =>
    `ส่งเครื่องให้ทีม ${to} การวางของทีม ${from} ถูกซ่อนไว้ แล้วจะเปิดเผยพร้อมกันเมื่อทั้งสองฝั่งยืนยัน`,
  handoffReady: (to: Side) => `ทีม ${to} พร้อมวาง`,

  revealTitle: 'เปิดเผยการวางของทั้งสองฝั่ง',
  initiativeTitle: 'Initiative: d20 + AGI mod สูงสุดในทีม',
  initiativeRoll: (side: Side, d20: number, modifier: number, total: number) =>
    `ทีม ${side}: d20 ได้ ${d20} ${modifier < 0 ? '−' : '+'} ${Math.abs(modifier)} = ${total}`,
  initiativeTie: 'เสมอ ทอยใหม่ทั้งสองฝั่ง',
  initiativeFirst: (side: Side) => `ทีม ${side} เริ่มก่อน`,
  initiativeFirstTurn: (side: Side) => `Turn แรกของทีม ${side} เล่นได้แค่ 2 จาก 3 Unit (เลือกเองว่าตัวไหน)`,
  startBattle: 'เริ่ม Battle',

  tamer: 'Tamer',
  level: (level: number) => `Level ${level}`,
  star: (star: number) => `${star} Star`,
  move: (tiles: number) => `Move ${tiles} ช่อง`,
  hp: (hp: number, maxHp: number) => `HP ${hp}/${maxHp}`,
  defences: (guard: number, ward: number) => `Guard ${guard} / Ward ${ward}`,
  defencesGuarded: (guard: number, ward: number, bonus: number) =>
    `Guard ${guard} / Ward ${ward} (Guarded +${bonus} จนถึงเริ่ม Turn ถัดไปของทีมตัวเอง)`,
  standingOn: (terrain: string) => `ยืนบนช่อง${terrain}`,
  guardedTag: (bonus: number) => `Guarded +${bonus}`,
  attackBonus: (bonus: number) => `โจมตี ${signed(bonus)}`,
  down: 'ล้ม',
  element: {
    forest: 'ป่า',
    water: 'น้ำ',
    mountain: 'ภูเขา',
    desert: 'ทะเลทราย',
    light: 'แสง',
    dark: 'มืด',
  } satisfies Record<Element, string>,
  movementType: {
    ground: 'Ground',
    flying: 'Flying',
    aquatic: 'Aquatic',
  },
  defence: { guard: 'Guard', ward: 'Ward' },
  terrain: {
    normal: 'ปกติ',
    forest: 'ป่า',
    water: 'น้ำ',
    mountain: 'ภูเขา',
    desert: 'ทะเลทราย',
    light: 'แสง',
    dark: 'มืด',
  } satisfies Record<Terrain, string>,

  legendTitle: 'Terrain และธาตุ',
  legendWheel: 'ธาตุ: ป่า > น้ำ > ภูเขา > ทะเลทราย > ป่า และแสงกับมืดชนะกันและกัน ธาตุที่ชนะได้ advantage ธาตุที่แพ้ได้ disadvantage (Tamer ไม่มีธาตุ)',
  legendTerrain:
    'Monster ที่ยืนบนช่องธาตุเดียวกับตัวเองโจมตีด้วย advantage บนช่องธาตุที่ชนะธาตุตัวเองโจมตีด้วย disadvantage Tamer และ Flying ไม่ได้รับผล Aquatic นับช่องน้ำเป็นธาตุตัวเอง terrain ไม่บังแนวเล็ง',
  legendProtection: 'Tamer ที่มี Monster ฝ่ายเดียวกันยืนติด: ศัตรูโจมตี Tamer ด้วย disadvantage ทุกระยะ',
  legendLineOfSight: 'โจมตีจากระยะ 2 ขึ้นไป: Unit ใดก็ตามที่อยู่บนเส้นระหว่างผู้โจมตีกับเป้าจะบัง ยกเว้นผู้โจมตีเป็น Flying',

  hpTitle: 'HP ของ Unit บน Board',

  previewTitle: (attacker: string, skill: string, target: string) => `${attacker} ใช้ ${skill} ใส่ ${target}`,
  previewRoll: (bonus: number, defenceName: string, defence: number) =>
    `ทอย d20 ${signed(bonus)} ต้องได้อย่างน้อย ${defenceName} ${defence}`,
  previewHit: (percent: string) => `โอกาสโดน ${percent}`,
  previewDamage: (min: number, max: number) => `damage ${min}–${max}`,
  previewCritical: (percent: string, min: number, max: number) => `โอกาส critical ${percent} (damage ${min}–${max})`,
  previewRules: 'ทอย 20 = critical โดนเสมอ, ทอย 1 พลาดเสมอ',
  previewGuarded: (bonus: number) => `(รวม Guarded +${bonus})`,
  rollEffect: { advantage: 'Advantage', disadvantage: 'Disadvantage' },
  previewNoSources: 'ไม่มี advantage หรือ disadvantage: ทอย d20 ลูกเดียว',
  previewNet: {
    advantage: 'ผลรวม: advantage ทอย d20 2 ลูกเอาค่าสูง',
    disadvantage: 'ผลรวม: disadvantage ทอย d20 2 ลูกเอาค่าต่ำ',
    cancelled: 'ผลรวม: advantage กับ disadvantage หักล้างกัน ทอย d20 ลูกเดียว',
  },
  sourceElementWins: (attacker: string, target: string) => `ธาตุ${attacker}ชนะธาตุ${target}ของเป้า`,
  sourceElementLoses: (attacker: string, target: string) => `ธาตุ${target}ของเป้าชนะธาตุ${attacker}`,
  sourceTerrainMatch: (terrain: string) => `ยืนบนช่อง${terrain} ตรงกับธาตุตัวเอง`,
  sourceTerrainAquatic: 'ยืนบนช่องน้ำ: Aquatic นับช่องน้ำเป็นธาตุตัวเอง',
  sourceTerrainWeak: (terrain: string, own: string) => `ยืนบนช่อง${terrain} ซึ่งชนะธาตุ${own}ของตัวเอง`,
  sourceTamerProtected: (protectors: string) =>
    `เป้าเป็น Tamer ที่ได้รับการป้องกัน (${protectors} ยืนติด) Command หักล้างไม่ได้`,

  boardMiss: 'พลาด',
  boardCritical: 'critical!',

  logTitle: 'บันทึก',
  logEmpty: 'ยังไม่มีเหตุการณ์',
  logMoved: (unit: string, from: string, to: string) => `${unit} เดินจาก ${from} ไป ${to}`,
  logTurnStarted: (side: Side, turn: number, round: number) => `Round ${round}: เริ่ม Turn ${turn} ของทีม ${side}`,
  logTurnEnded: (side: Side) => `ทีม ${side} จบ Turn`,
  logDeploymentConfirmed: (side: Side) => `ทีม ${side} ยืนยันการวาง`,
  logRevealed: 'เปิดเผยการวางของทั้งสองฝั่ง',
  logInitiative: (a: number, b: number, tie: boolean) =>
    `Initiative: ทีม A ${a} ทีม B ${b}${tie ? ' เสมอ ทอยใหม่' : ''}`,
  logInitiativeDecided: (side: Side) => `ทีม ${side} เริ่มก่อน`,
  logAttackRolled: (
    attacker: string,
    skill: string,
    target: string,
    rolls: readonly number[],
    bonus: number,
    total: number,
    defenceName: string,
    defence: number,
  ) =>
    `${attacker} ใช้ ${skill} ใส่ ${target}: ทอย d20 ได้ ${rolls.join(', ')} ${signed(bonus)} = ${total} เทียบ ${defenceName} ${defence}`,
  logHit: 'โดน',
  logMiss: 'พลาด',
  logCritical: 'ทอย 20 critical! โดน',
  logNatural1: 'ทอย 1 พลาดเสมอ',
  logDamage: (target: string, amount: number, dice: string, rolls: readonly number[], modifier: number, hp: number, maxHp: number) =>
    `${target} เสีย ${amount} HP (${dice}: ${rolls.join(' + ')}${modifier === 0 ? '' : ` ${signed(modifier)}`}) เหลือ HP ${hp}/${maxHp}`,
  logUnitDown: (unit: string) => `${unit} ล้มและออกจาก Board`,
  logDefended: (unit: string) => `${unit} ใช้ Defend`,
  logGuarded: (unit: string, bonus: number) =>
    `${unit} ติด Guarded: Guard และ Ward +${bonus} จนถึงเริ่ม Turn ถัดไปของทีมตัวเอง`,
  logStatusEnded: (unit: string, status: string) => `${status} ของ ${unit} หมดแล้ว`,
  status: { guarded: 'Guarded' } satisfies Record<StatusId, string>,
  logBattleEnded: (winner: Side, round: number) => `Battle จบใน Round ${round}: ทีม ${winner} ชนะ`,

  cause: {
    tamerDown: (loser: Side) => `Tamer ของทีม ${loser} ล้ม`,
    monstersDown: (loser: Side) => `Monster ทุกตัวของทีม ${loser} ล้ม`,
  } satisfies Record<BattleEndCause, (loser: Side) => string>,
  resultTitle: (winner: Side) => `ทีม ${winner} ชนะ`,
  resultRounds: (round: number) => `จบใน Round ${round}`,

  rejection: {
    'unknown-action': 'ทำแบบนี้ไม่ได้',
    'unknown-unit': 'ไม่พบ Unit นี้',
    'not-your-turn': 'ยังไม่ใช่ Turn ของทีมนี้',
    'wrong-phase': 'ทำแบบนี้ในช่วงนี้ของ Battle ไม่ได้',
    'outside-start-zone': 'วางได้เฉพาะช่องว่างในโซนเริ่มของทีมตัวเอง (2 แถวหลัง)',
    'deployment-incomplete': 'ต้องวางให้ครบ 3 Unit ก่อนยืนยัน',
    'activation-over': 'Unit นี้เล่นจบแล้วใน Turn นี้',
    'activation-limit': 'Turn นี้เล่นครบจำนวน Unit ที่เล่นได้แล้ว',
    'already-moved': 'Unit นี้เดินไปแล้วใน Turn นี้',
    'off-board': 'ช่องนี้อยู่นอก Board',
    'tile-occupied': 'ช่องนี้มี Unit อยู่แล้ว',
    'out-of-reach': 'เดินไปไม่ถึงช่องนี้',
    'battle-over': 'Battle จบแล้ว',
    'already-acted': 'Unit นี้ใช้ Action ไปแล้วใน Turn นี้',
    'unknown-skill': 'ไม่พบ skill นี้',
    'not-an-enemy': 'โจมตีได้เฉพาะ Unit ของอีกทีม',
    'out-of-range': 'เป้าอยู่นอกระยะ',
    'no-line-of-sight': 'มี Unit ขวางแนวเล็ง (line of sight) จึงโจมตีเป้านี้ไม่ได้',
  } satisfies Record<RejectionCode, string>,

  dataErrorTitle: 'ข้อมูลเกมไม่ผ่านการตรวจ',
  dataErrorBody: 'ไฟล์ใน data/ ไม่ตรงกับ schema รายละเอียดด้านล่าง',
} as const
