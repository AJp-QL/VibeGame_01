/**
 * Thai string table: every piece of UI text comes from here. Game terms stay
 * in English as in CONTEXT.md (Battle, Board, Unit, Turn, Round, Tamer,
 * Monster, Star, Level, Dice Seed, Scenario, Move). An English table can be
 * added later with the same shape (spec: English UI is out of scope).
 */
import type { Element, Side } from '@mt/shared'
import type { RejectionCode } from '@mt/engine'

export const th = {
  appTitle: 'Monster Tactics',
  version: (version: string) => `เวอร์ชัน ${version}`,
  diceSeed: (seed: string) => `Dice Seed ${seed}`,
  scenarioOnBoard: (scenario: string, board: string) => `${scenario} บน Board ${board}`,

  round: (round: number) => `Round ${round}`,
  team: (side: Side) => `ทีม ${side}`,
  turnOf: (side: Side, turn: number) => `Turn ${turn} ของทีม ${side}`,
  endTurn: 'จบ Turn',

  hintSelect: (side: Side) => `แตะ Unit ของทีม ${side} เพื่อดูช่องที่เดินได้`,
  hintMove: 'แตะช่องที่สว่างเพื่อเดิน หรือแตะ Unit เดิมอีกครั้งเพื่อยกเลิก',
  hintAlreadyMoved: 'Unit นี้เดินไปแล้วใน Turn นี้',

  tamer: 'Tamer',
  level: (level: number) => `Level ${level}`,
  star: (star: number) => `${star} Star`,
  move: (tiles: number) => `Move ${tiles} ช่อง`,
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

  logTitle: 'บันทึก',
  logEmpty: 'ยังไม่มีเหตุการณ์',
  logMoved: (unit: string, from: string, to: string) => `${unit} เดินจาก ${from} ไป ${to}`,
  logTurnStarted: (side: Side, turn: number, round: number) => `Round ${round}: เริ่ม Turn ${turn} ของทีม ${side}`,
  logTurnEnded: (side: Side) => `ทีม ${side} จบ Turn`,

  rejection: {
    'unknown-action': 'ทำแบบนี้ไม่ได้',
    'unknown-unit': 'ไม่พบ Unit นี้',
    'not-your-turn': 'ยังไม่ใช่ Turn ของทีมนี้',
    'already-moved': 'Unit นี้เดินไปแล้วใน Turn นี้',
    'off-board': 'ช่องนี้อยู่นอก Board',
    'tile-occupied': 'ช่องนี้มี Unit อยู่แล้ว',
    'out-of-reach': 'เดินไปไม่ถึงช่องนี้',
  } satisfies Record<RejectionCode, string>,

  dataErrorTitle: 'ข้อมูลเกมไม่ผ่านการตรวจ',
  dataErrorBody: 'ไฟล์ใน data/ ไม่ตรงกับ schema รายละเอียดด้านล่าง',
} as const
