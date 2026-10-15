/**
 * Thai string table: every piece of UI text comes from here. Game terms stay
 * in English as in CONTEXT.md (Battle, Board, Unit, Turn, Round, Tamer,
 * Monster, Star, Level, Dice Seed, Scenario, Move), as do skill names and
 * Guard/Ward. An English table can be added later with the same shape (spec:
 * English UI is out of scope).
 */
import type { Element, Side } from '@mt/shared'
import type { BattleEndCause, RejectionCode } from '@mt/engine'

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

  hintSelect: (side: Side) => `แตะ Unit ของทีม ${side} เพื่อดูช่องที่เดินได้และศัตรูที่โจมตีได้`,
  hintMove: 'แตะช่องที่สว่างเพื่อเดิน หรือแตะ Unit เดิมอีกครั้งเพื่อยกเลิก',
  hintMoveOrAttack: 'แตะช่องที่สว่างเพื่อเดิน หรือกด "โจมตี" เพื่อเลือกเป้า',
  hintAttackOnly: 'Unit นี้เดินแล้ว กด "โจมตี" เพื่อเลือกเป้าได้',
  hintAlreadyMoved: 'Unit นี้เดินไปแล้วใน Turn นี้',
  hintNothingLeft: 'Unit นี้เดินและใช้ Action ไปแล้วใน Turn นี้',
  hintChooseTarget: 'แตะศัตรูที่ไฮไลต์สีแดงเพื่อดูโอกาสโดนก่อนยืนยัน',
  hintConfirm: 'ดูโอกาสโดนและ damage แล้วกดยืนยัน หรือแตะศัตรูตัวอื่นเพื่อเปลี่ยนเป้า',
  hintBattleOver: 'Battle จบแล้ว',

  attack: 'โจมตี',
  confirmAttack: 'ยืนยันโจมตี',
  cancel: 'ยกเลิก',
  restart: 'เริ่ม Battle ใหม่',

  tamer: 'Tamer',
  level: (level: number) => `Level ${level}`,
  star: (star: number) => `${star} Star`,
  move: (tiles: number) => `Move ${tiles} ช่อง`,
  hp: (hp: number, maxHp: number) => `HP ${hp}/${maxHp}`,
  defences: (guard: number, ward: number) => `Guard ${guard} / Ward ${ward}`,
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

  rosterTitle: 'Unit บน Board',

  previewTitle: (attacker: string, skill: string, target: string) => `${attacker} ใช้ ${skill} ใส่ ${target}`,
  previewRoll: (bonus: number, defenceName: string, defence: number) =>
    `ทอย d20 ${signed(bonus)} ต้องได้อย่างน้อย ${defenceName} ${defence}`,
  previewHit: (percent: string) => `โอกาสโดน ${percent}`,
  previewDamage: (min: number, max: number) => `damage ${min}–${max}`,
  previewCritical: (percent: string, min: number, max: number) => `โอกาส critical ${percent} (damage ${min}–${max})`,
  previewRules: 'ทอย 20 = critical โดนเสมอ, ทอย 1 พลาดเสมอ',

  boardMiss: 'พลาด',
  boardCritical: 'critical!',

  logTitle: 'บันทึก',
  logEmpty: 'ยังไม่มีเหตุการณ์',
  logMoved: (unit: string, from: string, to: string) => `${unit} เดินจาก ${from} ไป ${to}`,
  logTurnStarted: (side: Side, turn: number, round: number) => `Round ${round}: เริ่ม Turn ${turn} ของทีม ${side}`,
  logTurnEnded: (side: Side) => `ทีม ${side} จบ Turn`,
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
    'already-moved': 'Unit นี้เดินไปแล้วใน Turn นี้',
    'off-board': 'ช่องนี้อยู่นอก Board',
    'tile-occupied': 'ช่องนี้มี Unit อยู่แล้ว',
    'out-of-reach': 'เดินไปไม่ถึงช่องนี้',
    'battle-over': 'Battle จบแล้ว',
    'already-acted': 'Unit นี้ใช้ Action ไปแล้วใน Turn นี้',
    'unknown-skill': 'ไม่พบ skill นี้',
    'not-an-enemy': 'โจมตีได้เฉพาะ Unit ของอีกทีม',
    'out-of-range': 'เป้าอยู่นอกระยะ',
  } satisfies Record<RejectionCode, string>,

  dataErrorTitle: 'ข้อมูลเกมไม่ผ่านการตรวจ',
  dataErrorBody: 'ไฟล์ใน data/ ไม่ตรงกับ schema รายละเอียดด้านล่าง',
} as const
