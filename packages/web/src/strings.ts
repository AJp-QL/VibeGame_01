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
  firstTurnLimit: (limit: number, used: number) => `Turn แรกของทีมที่เริ่มก่อน: เล่นได้แค่ ${limit} จาก 3 Unit (เล่นไปแล้ว ${used})`,

  hintSelect: (side: Side) => `แตะ Unit ของทีม ${side} เพื่อดูช่องที่เดินได้ เล่นทีละ Unit ตามลำดับที่เลือกเอง`,
  hintMove: 'แตะช่องที่สว่างเพื่อเดิน หรือแตะ Unit เดิมอีกครั้งเพื่อยกเลิก',
  hintAlreadyMoved: 'Unit นี้เดินไปแล้วใน Turn นี้',
  hintSwitchEnds: (unit: string) => `ถ้าเริ่มเล่น Unit อื่น ${unit} จะเล่นต่อใน Turn นี้ไม่ได้`,
  hintActivationOver: 'Unit นี้เล่นจบแล้วใน Turn นี้ เพราะเริ่มเล่น Unit อื่นไปแล้ว',
  hintActivationLimit: (limit: number) => `Turn นี้เล่นครบ ${limit} Unit แล้ว Unit นี้ต้องรอ Turn หน้า`,

  endTurnWarnTitle: 'ยังมี Unit ที่ยังไม่ได้ทำอะไร',
  endTurnWarnBody: (units: string) => `${units} ยังไม่ได้ทำอะไรใน Turn นี้ จะจบ Turn เลยไหม`,
  endTurnAnyway: 'จบ Turn เลย',
  keepPlaying: 'กลับไปเล่นต่อ',

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
  logDeploymentConfirmed: (side: Side) => `ทีม ${side} ยืนยันการวาง`,
  logRevealed: 'เปิดเผยการวางของทั้งสองฝั่ง',
  logInitiative: (a: number, b: number, tie: boolean) =>
    `Initiative: ทีม A ${a} ทีม B ${b}${tie ? ' เสมอ ทอยใหม่' : ''}`,
  logInitiativeDecided: (side: Side) => `ทีม ${side} เริ่มก่อน`,

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
  } satisfies Record<RejectionCode, string>,

  dataErrorTitle: 'ข้อมูลเกมไม่ผ่านการตรวจ',
  dataErrorBody: 'ไฟล์ใน data/ ไม่ตรงกับ schema รายละเอียดด้านล่าง',
} as const
