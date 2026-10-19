/**
 * Thai string table: every piece of UI text comes from here. Game terms stay
 * in English as in CONTEXT.md (Battle, Board, Unit, Turn, Round, Tamer,
 * Monster, Star, Level, Dice Seed, Scenario, Move), as do skill names and
 * Guard/Ward. An English table can be added later with the same shape (spec:
 * English UI is out of scope).
 */
import type { Element, Side, Terrain } from '@mt/shared'
import type { BattleEndCause, CommandOption, Mode, RejectionCode } from '@mt/session'

/** "+2", "0", "−1" (true minus sign). */
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0')

export const th = {
  appTitle: 'Monster Tactics',
  version: (version: string) => `เวอร์ชัน ${version}`,
  diceSeed: (seed: string) => `Dice Seed ${seed}`,
  scenarioOnBoard: (scenario: string, board: string) => `${scenario} บน Board ${board}`,

  round: (round: number, limit: number) => `Round ${round}/${limit}`,
  damageTotals: 'damage รวม',
  damageTotal: (side: Side, total: number) => `ทีม ${side} ${total}`,
  inspirationLeft: (side: Side, left: boolean) => `ทีม ${side} ${left ? 'เหลือ 1' : 'ใช้แล้ว'}`,
  team: (side: Side) => `ทีม ${side}`,
  turnOf: (side: Side, turn: number) => `Turn ${turn} ของทีม ${side}`,
  endTurn: 'จบ Turn',
  firstTurnLimit: (limit: number, used: number) => `Turn แรกของทีมที่เริ่มก่อน: เล่นได้แค่ ${limit} จาก 3 Unit (เล่นไปแล้ว ${used})`,

  hintSelect: (side: Side) =>
    `แตะ Unit ของทีม ${side} เพื่อดูช่องที่เดินได้และศัตรูที่โจมตีได้ เล่นทีละ Unit ตามลำดับที่เลือกเอง`,
  hintMove: 'แตะช่องที่สว่างเพื่อดู Move preview แล้วกด "เดิน" หรือแตะ Unit เดิมอีกครั้งเพื่อยกเลิก',
  hintMoveOrAttack: 'แตะศัตรูที่มีดาบเพื่อวางแผนโจมตี หรือแตะช่องน้ำเงินเพื่อดู Move preview แล้วกดยืนยัน',
  hintMoveOrDefend: 'แตะช่องที่สว่างเพื่อดู Move preview แล้วกด "เดิน" หรือกด "ป้องกัน" (Guard และ Ward +2 จนถึง Turn ถัดไปของทีมตัวเอง)',
  hintAttackOnly: 'Unit นี้ไม่มีช่องที่เดินได้ กด "โจมตี" เพื่อเลือกเป้า หรือกด "ป้องกัน" ได้',
  hintDefendOnly: 'Unit นี้ไม่มีช่องที่เดินได้ ยังกด "ป้องกัน" ได้',
  },
  actionPlan: {
    title: 'Action plan',
    hint: 'แตะจุดสีแดงเพื่อเปลี่ยนช่องที่จะโจมตี เปลี่ยน skill ได้ แล้วยืนยันด้วยปุ่มเท่านั้น',
    origin: (unit: string, tile: string) => `${unit} จะทำ Action จากช่อง ${tile}`,
    confirm: 'ยืนยันแผน',
    rolls: 'ทอยลูกเต๋าแล้วย้อนผลไม่ได้',
    choices: 'เลือก Action หรือ skill',
    via: { stay: 'อยู่ที่เดิม', move: 'เดิน', blink: 'Blink' },
    legend: 'ดาบ = ศัตรูที่โจมตีได้ใน activation นี้ · จุดแดง = ช่องที่ยืนโจมตีได้ · น้ำเงิน = เดิน',
