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
  hintMove: 'แตะช่องที่สว่างเพื่อเดิน หรือแตะ Unit เดิมอีกครั้งเพื่อยกเลิก',
  hintMoveOrAttack: 'แตะช่องที่สว่างเพื่อเดิน กด "โจมตี" เพื่อเลือกเป้า หรือกด "ป้องกัน"',
  hintMoveOrDefend: 'แตะช่องที่สว่างเพื่อเดิน หรือกด "ป้องกัน" (Guard และ Ward +2 จนถึง Turn ถัดไปของทีมตัวเอง)',
  hintAttackOnly: 'Unit นี้เดินแล้ว กด "โจมตี" เพื่อเลือกเป้า หรือกด "ป้องกัน" ได้',
  hintDefendOnly: 'Unit นี้เดินแล้ว ยังกด "ป้องกัน" ได้',
  hintAlreadyMoved: 'Unit นี้เดินไปแล้วใน Turn นี้',
  hintNothingLeft: 'Unit นี้เดินและใช้ Action ไปแล้วใน Turn นี้',
  hintChooseTarget: 'แตะศัตรูที่ไฮไลต์สีแดงเพื่อดูโอกาสโดนก่อนยืนยัน',
  hintConfirm: 'ดูโอกาสโดนและ damage แล้วกดยืนยัน หรือแตะศัตรูตัวอื่นเพื่อเปลี่ยนเป้า',
  hintAllBlocked: 'ศัตรูในระยะเลือกไม่ได้ทั้งหมด (ช่องที่ขีดกากบาท: ถูกขวางแนวเล็ง หรือติด Hidden) ลองเดินไปตำแหน่งอื่นก่อน',
  blockedTitle: 'เลือกไม่ได้',
  blockedBy: (target: string, blockers: string) => `${target}: ${blockers} ขวางแนวเล็ง (line of sight)`,
  blockedHidden: (target: string) => `${target}: ติด Hidden ซ่อนตัวในป่า เล็งได้จากระยะ 1 เท่านั้น`,
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
      ai: 'เล่นคนเดียวกับ AI เลือกทีมได้ AI วางก่อนแบบซ่อน',
    } satisfies Record<Mode, string>,
    side: (side: Side) => `ทีม ${side}`,
    start: 'เริ่ม Battle',
    guide: 'วิธีเล่น',
    playtestTitle: 'สำหรับ playtester',
  },

  /** Local play stats and the feedback form (ticket 17). */
  playtest: {
    feedback: 'ส่งความเห็น (แบบฟอร์มสั้น)',
    feedbackHint: 'เปิดแบบฟอร์มในแท็บใหม่ แนบไฟล์ Replay และไฟล์สถิติได้ถ้ามี',
    exportStats: 'ส่งออกสถิติการเล่น',
    statsSummary: (opens: number, started: number, finished: number, days: number) =>
      `เปิดเกม ${opens} ครั้ง · เริ่ม Battle ${started} · เล่นจบ ${finished} · เล่น ${days} วัน`,
    statsLocal: 'สถิติเก็บในเครื่องนี้เท่านั้น ไม่ถูกส่งไปไหน จนกว่าคุณจะบันทึกไฟล์แล้วส่งเอง ไฟล์ Replay ทุกไฟล์มีสถิตินี้แนบไปด้วย',
    statsMemoryOnly: 'เบราว์เซอร์นี้ไม่ให้เก็บข้อมูล สถิตินับเฉพาะรอบที่เปิดอยู่ (เกมยังเล่นได้ปกติ)',
  },

  /** The playtester guide page (docs/playtest/playtester-guide.md is the same text). */
  guide: {
    title: 'วิธีเล่น (สำหรับ playtester)',
    back: 'กลับไปเมนู',
    sections: [
      {
        title: 'เล่นยังไง',
        body: [
          'ที่เมนู เลือก Scenario, Board และโหมด: "เล่นกับ AI" (เล่นคนเดียว เลือกทีม A หรือ B) หรือ Hotseat (สองคนผลัดกันบนเครื่องเดียว) แล้วกด "เริ่ม Battle"',
          'แต่ละทีมมี Tamer 1 ตัวและ Monster 2 ตัว เริ่มด้วยการวาง Unit ในโซนของทีม (แตะ Unit แล้วแตะช่องที่สว่าง) แล้วกดยืนยัน',
          'ใน Turn ของคุณ แตะ Unit เพื่อเลือก แตะช่องที่สว่างเพื่อเดิน กด "โจมตี", "ป้องกัน" หรือปุ่ม skill แล้วแตะเป้า ดู % โอกาสโดนและ damage ก่อนกดยืนยัน กด "จบ Turn" เมื่อเสร็จ',
          'ชนะเมื่อ Tamer ของอีกฝั่งล้ม หรือ Monster ทุกตัวของอีกฝั่งล้ม ถ้าครบ 10 Round ทีมที่ทำ damage รวมมากกว่าชนะ',
          'แตะ "Terrain และธาตุ" ใต้ Board เพื่อดูกฎธาตุและ terrain ได้ตลอด',
        ],
      },
      {
        title: 'ส่งไฟล์ Replay และสถิติ',
        body: [
          'จบ Battle แล้ว กด "Export Replay" ที่หน้าสรุปผล (หรือ "เมนู Battle" ระหว่างเล่น) เบราว์เซอร์จะบันทึกไฟล์ .json ลงเครื่อง',
          'ไฟล์ Replay มีสถิติการเล่นแนบไปด้วย ถ้าอยากส่งสถิติอย่างเดียว กด "ส่งออกสถิติการเล่น" ที่เมนู',
          'สถิติคือจำนวนครั้งที่เปิดเกม, Battle ที่เริ่มและจบ (โหมด, Scenario, Board, ผล) และวันที่เล่น เก็บในเครื่องนี้เท่านั้น เกมไม่ส่งอะไรออกไปเอง',
        ],
      },
      {
        title: 'ส่งให้ใคร',
        body: [
          'ส่งไฟล์ให้ผู้พัฒนาทางช่องทางที่ได้รับลิงก์เกมมา หรือแนบในแบบฟอร์มความเห็น (ปุ่ม "ส่งความเห็น" ที่เมนูและหน้าสรุปผล ถ้ามี)',
          'บอกด้วยว่าเล่นบนอุปกรณ์อะไร และเวอร์ชันที่ท้ายหน้าจอ',
        ],
      },
    ],
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
  initiativeRerolled: (side: Side) => `ทีม ${side} ใช้ Inspiration ทอย d20 ของตัวเองใหม่`,
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
  sourceTargetStatus: (status: string) => `เป้าติด ${status}: ผู้โจมตีทุกตัวได้ advantage`,
  sourceAttackerStatus: (status: string) => `ผู้โจมตีติด ${status}: attack roll ครั้งนี้ได้ disadvantage แล้ว ${status} หลุด`,
  sourceCommand: (tamer: string) => `Command ของ ${tamer}: attack roll ครั้งนี้ได้ advantage`,
  sourceCommandDropped: (tamer: string) =>
    `Command ของ ${tamer}: ไม่นับ เพราะเป้าเป็น Tamer ที่ได้รับการป้องกัน (หักล้างไม่ได้) แต่ attack roll ครั้งนี้ยังใช้ Command ไป`,
  sourceTamerProtected: (protectors: string) =>
    `เป้าเป็น Tamer ที่ได้รับการป้องกัน (${protectors} ยืนติด) Command หักล้างไม่ได้`,

  boardMiss: 'พลาด',
  boardCritical: 'critical!',
  boardCounter: 'โจมตีกลับ!',
  boardPushBlocked: 'ผลักไม่ได้',

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
  logDamage: (
    target: string,
    amount: number,
    dice: string,
    rolls: readonly number[],
    modifier: number,
    hp: number,
    maxHp: number,
    note = '',
  ) =>
    `${target} เสีย ${amount} HP (${dice}: ${rolls.join(' + ')}${modifier === 0 ? '' : ` ${signed(modifier)}`}${note ? `, ${note}` : ''}) เหลือ HP ${hp}/${maxHp}`,
  logDamageStatus: (status: string, bonus: number) => `รวม ${status} ${signed(bonus)}`,
  logTeleported: (unit: string, skill: string, from: string, to: string) =>
    `${unit} ใช้ ${skill} เทเลพอร์ตจาก ${from} ไป ${to} (แทนการเดิน)`,
  logAreaSkill: (unit: string, skill: string, centre: string, targets: string) =>
    `${unit} ใช้ ${skill} ที่ช่อง ${centre} ใส่ ${targets} ตามลำดับ`,
  logUnitDown: (unit: string) => `${unit} ล้มและออกจาก Board`,
  logDefended: (unit: string) => `${unit} ใช้ Defend`,
  logStatusEnded: (unit: string, status: string) => `${status} ของ ${unit} หมดแล้ว`,
  logStatusBroken: {
    attackRoll: (unit: string, status: string) => `${status} ของ ${unit} หลุด เพราะทอย attack roll`,
    terrain: (unit: string, status: string, terrain: string) => `${status} ของ ${unit} หลุด เพราะไม่ได้ยืนบนช่อง${terrain}แล้ว`,
  },
  logSkillUsed: (unit: string, skill: string, targets: string) => `${unit} ใช้ ${skill}${targets ? ` กับ ${targets}` : ''}`,
  logSave: (unit: string, status: string, stat: string, roll: number, modifier: number, total: number, dc: number, saved: boolean) =>
    `${unit} ทอย save ${stat} ต้าน ${status}: d20 ได้ ${roll} ${signed(modifier)} = ${total} เทียบ DC ${dc} → ${saved ? 'ต้านได้' : 'ไม่ผ่าน'}`,
  logStatusApplied: (unit: string, status: string, effect: string, duration: string, refreshed: boolean) =>
    `${unit} ติด ${status}${refreshed ? ' ซ้ำ (เริ่มนับใหม่ ไม่ซ้อน)' : ''}: ${effect} (${duration})`,
  logStatusTicked: (unit: string, status: string, amount: number, dice: string, rolls: readonly number[], hp: number, maxHp: number) =>
    `${status}: ${unit} เสีย ${amount} HP (${dice}: ${rolls.join(' + ')}) เหลือ HP ${hp}/${maxHp}`,
  logRetreated: (unit: string, from: string, to: string) => `${unit} ถอยจาก ${from} ไป ${to} (ไม่ใช่การเดิน ยังเดินต่อได้)`,
  logRetreatDeclined: (unit: string) => `${unit} เลือกไม่ถอย`,
  logPushed: (unit: string, by: string, from: string, to: string) => `${by} ผลัก ${unit} จาก ${from} ไป ${to}`,
  logPushBlocked: (unit: string, tile: string, blocker: string | null) =>
    `${unit} ไม่ถูกผลัก: ${blocker === null ? 'ช่องที่จะถูกผลักไปอยู่นอก Board' : `${tile} มี ${blocker} ยืนอยู่`}`,
  logCounterattack: (unit: string, target: string, dice: string) => `${unit} โจมตีกลับ (Counter) ใส่ ${target} ด้วย ${dice}`,
  logDamageCovered: (target: string, tamer: string, amount: number, hp: number, maxHp: number) =>
    `Cover: damage ${amount} ที่ ${target} ได้รับโอนไปที่ ${tamer} เหลือ HP ${hp}/${maxHp}`,
  logHealed: (user: string, skill: string, target: string, amount: number, dice: string, rolls: readonly number[], modifier: number, hp: number, maxHp: number) =>
    `${user} ใช้ ${skill} กับ ${target}: heal ${amount} (${dice}: ${rolls.join(' + ')} ${signed(modifier)}) HP ${hp}/${maxHp} (ไม่เกิน HP สูงสุด, heal ไม่หักลบ damage รวม)`,
  logCoverApplied: (tamer: string, unit: string, refreshed: boolean) =>
    `${tamer} ใช้ Cover กับ ${unit}${refreshed ? ' ซ้ำ (เริ่มนับใหม่)' : ''}: damage ที่ ${unit} ได้รับโอนมาที่ ${tamer} จนถึงเริ่ม Turn ถัดไปของทีม`,
  logCoverEnded: (unit: string, tamer: string) => `Cover ของ ${tamer} บน ${unit} หมดแล้ว`,
  logTerrainChanged: (unit: string, skill: string, tile: string, from: string, to: string, turns: number) =>
    `${unit} ใช้ ${skill}: ช่อง ${tile} เปลี่ยนจาก${from}เป็น${to} (ส่วนที่เหลือของ Turn นี้ และอีก ${turns} Turn ของทีม แล้วกลับเป็นเดิม)`,
  logTerrainReverted: (tile: string, from: string, to: string) => `ช่อง ${tile} กลับจาก${from}เป็น${to}ตามเดิมของ Board`,
  logCommandIssued: (tamer: string, unit: string, option: string) => `${tamer} ใช้ Command กับ ${unit}: ${option} (ไม่ใช้ Action)`,
  logCommandSpent: (unit: string) => `${unit} ใช้ advantage จาก Command ไปกับ attack roll นี้`,
  counterattackName: 'การโจมตีกลับ',

  // Skills and statuses (rules §13–§15): names come from data, everything else from here.
  skillsTitle: 'Skill',
  tier: { minor: 'Minor', major: 'Major', signature: 'Signature', passive: 'Passive' },
  cooldownBadge: (turns: number) => `อีก ${turns}`,
  cooldownTitle: (turns: number) => `cooldown: ใช้ได้อีกใน ${turns} Turn ของทีมตัวเอง`,
  skillSpent: 'ใช้ไปแล้วใน Battle นี้',
  skillPassive: 'ทำงานตลอด ไม่ต้องกดใช้',
  skillNotYet: 'ยังไม่เปิดใช้ในเวอร์ชันนี้',
  skillRange: (range: number) => (range === 0 ? 'ตัวเอง' : `ระยะ ${range}`),
  skillRangeAllies: (range: number) => `ตัวเองและพวกในระยะ ${range}`,
  skillDamage: (dice: string) => `damage ${dice}`,
  skillAttack: { physical: 'กายภาพ', elemental: 'ธาตุ' },
  skillRetreat: 'ถอยฟรี 1 ช่องหลังโจมตี',
  skillRequiresTerrain: (terrain: string) => `ใช้ได้เฉพาะเมื่อยืนบนช่อง${terrain} (หลุดเมื่อออกจากช่อง${terrain}หรือทอย attack roll)`,
  skillNoDamage: 'ไม่ทำ damage',
  skillAreaRange: (range: number, size: number, max: number) =>
    `ช่องกลางระยะ 0–${range} · พื้นที่ ${size}x${size} ศัตรูไม่เกิน ${max} ตัวที่เลือก ไม่โดนพวกเดียวกัน`,
  skillTeleport: (range: number) => `เทเลพอร์ต 1–${range} ช่อง ใช้แทนการเดิน ไม่ใช้ Action`,
  hintChooseCentre: (skill: string) =>
    `${skill}: แตะช่องกลางของพื้นที่ (ช่องที่สว่างสีฟ้า หรือ Unit บนช่องนั้น) ต้องมีศัตรูในพื้นที่อย่างน้อย 1 ตัว`,
  hintChooseAreaTargets: (skill: string, max: number) =>
    `${skill}: แตะศัตรูในพื้นที่ตามลำดับที่จะโจมตี ไม่เกิน ${max} ตัว (ไม่โดนพวกเดียวกัน) แตะช่องสว่างอื่นเพื่อเปลี่ยนช่องกลาง`,
  hintAreaMore: (skill: string, chosen: number, max: number) =>
    `${skill}: เลือกแล้ว ${chosen}/${max} ตัว แตะศัตรูอีกตัวเพื่อเพิ่ม แตะตัวที่เลือกแล้วเพื่อเอาออก หรือกดยืนยัน`,
  hintChooseTile: (skill: string) => `${skill}: แตะช่องว่างที่สว่างสีฟ้าเพื่อเทเลพอร์ต (ใช้แทนการเดิน ไม่ใช้ Action)`,
  hintChooseAttuneTile: (skill: string) => `${skill}: แตะช่องที่สว่างสีฟ้าติดกับ Tamer (ว่างหรือมี Unit ก็ได้) แล้วเลือกธาตุ`,
  hintChooseElement: (skill: string, tile: string) => `${skill}: เลือกธาตุให้ช่อง ${tile}`,
  skillAttune: (turns: number) => `ช่องติดกัน 1 ช่อง เปลี่ยนเป็นธาตุที่เลือก ${turns} Turn แล้วกลับเป็นเดิม`,
  skillHeal: (dice: string, stat: string) => `heal ${dice} + ${stat} mod (ไม่เกิน HP สูงสุด)`,
  skillCover: 'damage ที่ Monster ตัวนั้นได้รับโอนมาที่ Tamer จนถึงเริ่ม Turn ถัดไปของทีม',
  skillRangeSelfOrAlly: (range: number) => `ตัวเองหรือพวกในระยะ ${range}`,
  skillRangeAllyMonster: (range: number) => `Monster พวกเดียวกันในระยะ ${range}`,
  elementsTitle: 'ธาตุ',
  previewHeal: (user: string, skill: string, target: string, min: number, max: number, hp: number, maxHp: number) =>
    `${user} ใช้ ${skill} กับ ${target}: heal ${min}–${max} (HP ตอนนี้ ${hp}/${maxHp} ไม่เกิน HP สูงสุด) ไม่ต้องทอยโจมตี`,
  previewTerrain: (user: string, skill: string, tile: string, from: string, to: string, turns: number, original: string) =>
    `${user} ใช้ ${skill}: ช่อง ${tile} จาก${from}เป็น${to} ส่วนที่เหลือของ Turn นี้และอีก ${turns} Turn ของทีม แล้วกลับเป็น${original}`,
  previewCover: (tamer: string, unit: string) => `damage ที่ ${unit} จะได้รับโอนมาที่ ${tamer} จนถึงเริ่ม Turn ถัดไปของทีม ไม่ต้องอยู่ติดกัน`,

  // Command (rules §16): not a skill, uses no Action.
  command: 'Command',
  commandTitle: 'Command (1 ครั้งต่อ Turn ไม่ใช้ Action)',
  commandOption: { advantage: 'Advantage', move: 'ขยับ +1' } satisfies Record<CommandOption, string>,
  commandOptionNote: {
    advantage: 'attack roll ครั้งถัดไปใน Turn นี้ได้ advantage (หักล้างการป้องกัน Tamer ไม่ได้)',
    move: 'ระยะเดินใน Turn นี้ +1',
  } satisfies Record<CommandOption, string>,
  commandLoyalty: 'ผ่าน loyalty check: ไม่มีใน phase 1 (ถือว่า loyalty เต็ม)',
  hintChooseCommandTarget: 'Command: แตะ Monster พวกเดียวกันที่สว่าง (ระยะไม่เกิน 3 และยังไม่ได้เล่นใน Turn นี้)',
  hintChooseCommandOption: (unit: string) => `Command ${unit}: เลือก Advantage หรือ ขยับ +1`,
  hintConfirmCommand: (unit: string, option: string) => `Command ${unit}: ${option} กดยืนยัน หรือกดยกเลิก`,
  confirmCommand: 'ยืนยัน Command',
  commandTag: (option: string) => `Command: ${option}`,
  commandSpentTag: 'Command: ใช้แล้ว',
  coveredTag: (tamer: string) => `Cover โดย ${tamer}`,
  attunedTag: (turns: number) => `Attune เหลือ ${turns}`,
  skillGives: (status: string) => `ติด ${status}`,
  skillGivesSave: (status: string, stat: string) => `ติด ${status} (save ${stat})`,
  hintChooseSkillTarget: (skill: string) => `แตะเป้าที่ไฮไลต์สีแดงเพื่อดูผลของ ${skill} ก่อนยืนยัน`,
  hintConfirmSkill: (skill: string) => `ดูผลของ ${skill} แล้วกดยืนยัน หรือกดยกเลิก`,
  hintSkillBlocked: 'เป้าในระยะเลือกไม่ได้ทั้งหมด (ถูกขวางแนวเล็ง หรือติด Hidden) ลองเดินไปตำแหน่งอื่นก่อน',
  hintRetreat: (unit: string) =>
    `Hit and Run: แตะช่องที่สว่างเพื่อให้ ${unit} ถอยฟรี 1 ช่อง (ไม่นับเป็นการเดิน) หรือกด "ไม่ถอย"`,
  stayInPlace: 'ไม่ถอย',

  // Inspiration (rules §18): one reroll of a side's own d20 per Battle.
  inspiration: {
    name: 'Inspiration',
    title: (side: Side) => `Inspiration ของทีม ${side}`,
    body: 'ทอย d20 ของทีมตัวเองใหม่ได้ 1 ครั้งต่อ Battle (attack roll, save หรือ initiative) ต้องใช้ผลใหม่แม้แย่กว่าเดิม',
    hint: (side: Side) => `ทีม ${side} เลือก: ใช้ Inspiration ทอยใหม่ หรือไม่ใช้`,
    use: 'ใช้ Inspiration ทอยใหม่',
    decline: 'ไม่ใช้',
    handoffTitle: (side: Side) => `ส่งเครื่องให้ทีม ${side}`,
    handoffDecide: (side: Side, turnOf: Side) =>
      `ทีม ${side} ตัดสินใจว่าจะใช้ Inspiration ทอย d20 ของตัวเองใหม่หรือไม่ (ระหว่าง Turn ของทีม ${turnOf})`,
    handoffBack: (side: Side) => `ทีม ${side} เล่นต่อ`,
    handoffReady: (side: Side) => `ทีม ${side} พร้อม`,
    aiDeciding: (side: Side) => `AI (ทีม ${side}) กำลังตัดสินใจว่าจะใช้ Inspiration หรือไม่`,
  },

  /** Playing against the AI (ticket 15). */
  ai: {
    sides: (human: Side, ai: Side) => `คุณเล่นทีม ${human} · AI เล่นทีม ${ai}`,
    playing: (side: Side) => `AI (ทีม ${side}) กำลังเล่น ดูผลแต่ละขั้นใน Board และ log`,
    deploymentHint: (side: Side, aiSide: Side) =>
      `วาง Tamer และ Monster 2 ตัวบนช่องว่างในโซนเริ่มของทีม ${side} (2 แถวหลัง) AI (ทีม ${aiSide}) วางไว้ก่อนแล้วแบบซ่อน จะเปิดเผยพร้อมกันเมื่อคุณยืนยัน`,
  },
  logInspirationUsed: (side: Side) => `ทีม ${side} ใช้ Inspiration ทอยใหม่`,
  logInspirationDeclined: (side: Side) => `ทีม ${side} ไม่ใช้ Inspiration`,
  logRerolled: 'ทอยใหม่',
  confirmSkill: 'ยืนยันใช้ skill',
  previewIfHit: 'ถ้าโดน',
  previewCounterattack: (unit: string, percent: string, min: number, max: number) =>
    `${unit} ติด Countering จะโจมตีกลับ (โดนหรือพลาดก็ตาม): โอกาสโดน ${percent}, damage ${min}–${max}`,
  previewSave: (status: string, percent: string, stat: string, dc: number, modifier: number) =>
    `${status}: โอกาสเป้าไม่ผ่าน save ${percent} (d20 ${signed(modifier)} ${stat} ต้องได้อย่างน้อย ${dc})`,
  previewNoSave: (status: string) => `${status}: ติดทันที ไม่มี save`,
  previewNoDamage: 'ไม่ทำ damage',
  previewEffect: (statuses: string, units: string) => `${statuses} กับ ${units} ไม่ต้องทอย`,
  previewTeleport: (unit: string, tile: string) => `${unit} เทเลพอร์ตไป ${tile} ใช้แทนการเดิน (ไม่ใช้ Action) ไม่ต้องทอย`,
  previewArea: (user: string, skill: string, centre: string, count: number) =>
    `${user} ใช้ ${skill} ที่ช่อง ${centre}: โจมตี ${count} เป้าตามลำดับ ทอยแยกทุกเป้า`,
  previewAreaTarget: (index: number, target: string) => `เป้าที่ ${index}: ${target}`,
  previewDamageStatus: (status: string, bonus: number) => `damage ${status} ${signed(bonus)}`,
  previewSaveTitle: (user: string, skill: string, target: string) => `${user} ใช้ ${skill} ใส่ ${target}: ไม่ทอยโจมตี เป้าทอย save`,
  previewAttackBonusStatus: (status: string, bonus: number) => `${status} ${signed(bonus)}`,
  statusesTitle: 'Status',
  noStatuses: 'ไม่มี status',
  statusDuration: {
    turns: (turns: number, skip: boolean) =>
      skip ? `ส่วนที่เหลือของ Turn นี้ และอีก ${turns} Turn ของทีมตัวเอง` : `อีก ${turns} Turn ของทีมตัวเอง (หมดตอนจบ Turn)`,
    applierTurns: (turns: number, skip: boolean) =>
      skip ? `ส่วนที่เหลือของ Turn นี้ และอีก ${turns} Turn ของทีมที่ทำให้ติด` : `อีก ${turns} Turn ของทีมที่ทำให้ติด (หมดตอนจบ Turn)`,
    untilOwnTurnStart: 'จนถึงเริ่ม Turn ถัดไปของทีมตัวเอง',
    untilAttackRoll: 'จนถึง attack roll ครั้งถัดไป',
    untilBroken: 'จนกว่าจะหลุดตามเงื่อนไข',
  },
  statusTurnsBadge: (turns: number) => `${turns}`,
  statusEffect: {
    startOfTurnDamage: (dice: string) => `เสีย HP ${dice} ตอนเริ่ม Turn ของทีมตัวเอง`,
    attackRoll: (bonus: number) => `attack roll ${signed(bonus)}`,
    defence: (bonus: number) => `Guard และ Ward +${bonus}`,
    immobile: 'เดินไม่ได้ (รวมการถอยของ Hit and Run) แต่ยังใช้ Action ได้',
    damageDealt: (bonus: number) => `damage ที่ทำ ${signed(bonus)} (ขั้นต่ำ 1)`,
    attackersAdvantage: 'ผู้โจมตีทุกตัวได้ advantage เมื่อโจมตี Unit นี้',
    nextAttackDisadvantage: 'attack roll ครั้งถัดไปได้ disadvantage',
    untargetable: (distance: number) => `ศัตรูเล็งจากระยะ ${distance} ขึ้นไปไม่ได้`,
    taunted: 'ต้องโจมตีผู้ taunt ถ้าทำได้',
    counterattack: (dice: string) => `โจมตีกลับ ${dice} เมื่อถูกโจมตีจากระยะ 1`,
  },
  statusPositive: 'บวก',
  statusNegative: 'ลบ',
  logBattleEnded: (winner: Side | null, round: number) =>
    `Battle จบใน Round ${round}: ${winner === null ? 'เสมอ' : `ทีม ${winner} ชนะ`}`,

  cause: {
    tamerDown: (loser: Side) => `Tamer ของทีม ${loser} ล้ม`,
    monstersDown: (loser: Side) => `Monster ทุกตัวของทีม ${loser} ล้ม`,
  } satisfies Record<Exclude<BattleEndCause, 'turnLimit'>, (loser: Side) => string>,
  turnLimitCause: (rounds: number) => `ครบ ${rounds} Round: ตัดสินด้วย damage รวมตลอด Battle (heal ไม่หักลบ)`,
  turnLimitResult: (a: number, b: number, winner: Side | null) =>
    winner === null
      ? `damage รวมเท่ากัน (ทีม A ${a} ทีม B ${b}) จึงเสมอ`
      : `ทีม ${winner} ทำ damage รวมมากกว่า (ทีม A ${a} ทีม B ${b})`,
  resultTitle: (winner: Side | null) => (winner === null ? 'เสมอ' : `ทีม ${winner} ชนะ`),
  resultRounds: (round: number) => `จบใน Round ${round}`,
  resultDamage: (a: number, b: number) => `damage รวมตลอด Battle: ทีม A ${a} · ทีม B ${b}`,

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
    'target-hidden': 'เป้าติด Hidden (ซ่อนตัวในป่า): ศัตรูเล็งได้จากระยะ 1 เท่านั้น ระยะ 2 ขึ้นไปเล็งไม่ได้',
    'wrong-terrain': 'skill นี้ใช้ได้เฉพาะเมื่อยืนบน terrain ที่กำหนด (Camouflage: ช่องป่า)',
    'decision-pending': 'ต้องตัดสินใจก่อน: เลือกช่องถอยของ Hit and Run (หรือไม่ถอย) หรือเลือกว่าจะใช้ Inspiration หรือไม่',
    'no-decision': 'ตอนนี้ไม่มีเรื่องให้ทีมนี้ตัดสินใจ',
    'not-in-loadout': 'Unit นี้ไม่มี skill นี้',
    'skill-not-available': 'skill นี้ยังใช้ไม่ได้',
    'on-cooldown': 'skill นี้ยังติด cooldown',
    'invalid-target': 'skill นี้เลือกเป้าแบบนี้ไม่ได้',
    'not-an-ally': 'skill นี้ใช้ได้กับพวกเดียวกันเท่านั้น',
    taunted: 'ติด Taunted: ถ้าโจมตีผู้ taunt ได้ Action ต้องเป็นการโจมตีผู้ taunt ถ้าไม่ได้ ต้องเดินเข้าใกล้ที่สุดและห้ามโจมตี',
    'not-a-tamer': 'Command ใช้ได้เฉพาะ Tamer',
    'command-used': 'ทีมนี้ใช้ Command ไปแล้วใน Turn นี้ (1 ครั้งต่อ Turn)',
    'command-first-turn': 'ใช้ Command ใน Turn แรกของทีมไม่ได้',
    'already-activated': 'Monster ตัวนี้เริ่มเล่นไปแล้วใน Turn นี้ Command ได้เฉพาะตัวที่เล่นหลัง Tamer',
  } satisfies Record<RejectionCode, string>,

  battleMenu: {
    open: 'เมนู Battle',
    close: 'ปิดเมนู',
    title: 'เมนู Battle',
    leave: 'ออกจาก Battle',
    leaveConfirm: 'ออกจาก Battle นี้แล้วกลับไปเมนู? Battle นี้จะหายไป ถ้าจะเก็บไว้ให้ export Replay ก่อน',
    leaveYes: 'ออกจาก Battle',
    leaveNo: 'เล่นต่อ',
  },

  replay: {
    export: 'Export Replay',
    exportHint: 'บันทึกไฟล์ Replay ของ Battle นี้ (Dice Seed และทุก action) ส่งให้ผู้พัฒนาเล่นซ้ำได้',
    open: 'เปิดไฟล์ Replay',
    openTitle: 'Replay',
    openHint: 'สำหรับผู้พัฒนา: เปิดไฟล์ Replay แล้วดู Battle ซ้ำทีละ action',
    invalidTitle: 'ไฟล์นี้ไม่ใช่ Replay ที่ถูกต้อง',
    mismatchTitle: 'เวอร์ชันไม่ตรง',
    mismatchBody:
      'Replay นี้บันทึกด้วย engine หรือข้อมูลเกมคนละชุดกับ build นี้ ระบบจะไม่แปลงให้ เปิดด้วย build ที่ตรงกัน (checkout git tag ของ build ที่บันทึก)',
    mismatchTag: (tag: string) => `build ที่บันทึก: ${tag}`,
    engineVersion: 'เวอร์ชัน engine',
    dataHash: 'hash ของ data',
    inReplay: 'ใน Replay',
    inBuild: 'build นี้',
    brokenTitle: 'เล่น Replay นี้ซ้ำไม่ได้',
    brokenAction: (index: number, reason: string) => `action ที่ ${index} ถูกปฏิเสธ: ${reason}`,
    brokenSetup: (message: string) => `สร้าง Battle จาก Replay ไม่ได้: ${message}`,
    dismiss: 'ปิด',

    title: 'ดู Replay',
    details: (scenario: string, board: string, mode: string) => `${scenario} บน Board ${board} · ${mode}`,
    recorded: (engine: string, app: string | undefined, at: string | undefined) =>
      [`engine ${engine}`, app ? `build ${app}` : null, at ? `บันทึกเมื่อ ${at}` : null].filter(Boolean).join(' · '),
    step: (step: number, total: number) => `action ${step}/${total}`,
    atStart: 'จุดเริ่ม Battle (ก่อน action แรก)',
    first: 'ไปต้นเกม',
    back: 'ย้อน 1 action',
    forward: 'ถัดไป 1 action',
    last: 'ไปท้ายเกม',
    readOnly: 'ดูอย่างเดียว ทำ action ใหม่ไม่ได้',
    action: {
      deploy: (unit: string, tile: string) => `${unit} วางที่ ${tile}`,
      confirmDeployment: (side: string) => `ทีม ${side} ยืนยันการวาง`,
      move: (unit: string, tile: string) => `${unit} เดินไป ${tile}`,
      attack: (unit: string, skill: string, target: string) => `${unit} ใช้ ${skill} ใส่ ${target}`,
      area: (unit: string, skill: string, tile: string, targets: string) => `${unit} ใช้ ${skill} ที่ช่อง ${tile} ใส่ ${targets} ตามลำดับ`,
      teleport: (unit: string, skill: string, tile: string) => `${unit} ใช้ ${skill} เทเลพอร์ตไป ${tile}`,
      skill: (unit: string, skill: string) => `${unit} ใช้ ${skill}`,
      skillOn: (unit: string, skill: string, target: string) => `${unit} ใช้ ${skill} กับ ${target}`,
      attune: (unit: string, skill: string, tile: string, element: string) => `${unit} ใช้ ${skill} เปลี่ยนช่อง ${tile} เป็น${element}`,
      command: (unit: string, target: string, option: string) => `${unit} ใช้ Command กับ ${target}: ${option}`,
      retreat: (unit: string, tile: string) => `${unit} ถอยไป ${tile} (Hit and Run)`,
      stay: (unit: string) => `${unit} ไม่ถอย (Hit and Run)`,
      defend: (unit: string) => `${unit} ป้องกัน (Defend)`,
      endTurn: (side: string) => `ทีม ${side} จบ Turn`,
      useInspiration: (side: string) => `ทีม ${side} ใช้ Inspiration ทอยใหม่`,
      declineInspiration: (side: string) => `ทีม ${side} ไม่ใช้ Inspiration`,
      other: (type: string) => `action "${type}"`,
    },
  },

  dataErrorTitle: 'ข้อมูลเกมไม่ผ่านการตรวจ',
  dataErrorBody: 'ไฟล์ใน data/ ไม่ตรงกับ schema รายละเอียดด้านล่าง',
} as const
