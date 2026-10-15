/**
 * The Phaser scene that draws the Board and its Units from the session's
 * snapshot, animates the engine's events (Moves, attacks, damage, Units going
 * down) and turns taps into BoardInput. It keeps view objects only, never
 * game state. Each element tile carries a small corner mark (palette
 * TERRAIN_GLYPHS); statuses show as small icons (Guarded shield, Bleed drop, Rallied arrow); enemies that line of
 * sight blocks are crossed out while choosing a target. Tile and area skills
 * light up the tiles they can be aimed at, Burst's 3x3 area shows around its
 * centre and its chosen targets carry their order number; Blink plays as a
 * fade out and in. It draws only the Units in `snapshot.units`, so Units hidden
 * during deployment never appear and cannot be tapped.
 */
import * as Phaser from 'phaser'
import { BOARD_SIZE, type Tile } from '@mt/shared'
import { derivedValues, type BattleState, type UnitId, type UnitState } from '@mt/engine'
import {
  AREA,
  BLOCKED_TARGET,
  GLYPH_ALPHA,
  glyphColour,
  GRID_LINE,
  HP_BAR_BACK,
  HP_BAR_FILL,
  HP_BAR_LOW,
  PENDING_TARGET,
  REACHABLE,
  SELECTED,
  OUTLINE,
  ORDER_DIGITS,
  STATUS_DOT,
  STATUS_ICONS,
  STATUS_NEGATIVE,
  STATUS_POSITIVE,
  TARGET,
  TERRAIN_COLOURS,
  TERRAIN_GLYPHS,
  TILE_CHOICE,
} from './palette.ts'
import type { BattleSessionPort, BattleSnapshot, BoardLabels } from './port.ts'
import { drawUnit } from './silhouettes.ts'

export const TILE_SIZE = 32
export const BOARD_PIXELS = TILE_SIZE * BOARD_SIZE

/** Milliseconds per step when a Unit walks its path. */
const STEP_MS = 90
/** Attack placeholder animation: lunge, then the result, then a fall. */
const LUNGE_MS = 110
const LUNGE_PIXELS = 9
const RESULT_AT_MS = 2 * LUNGE_MS
const FALL_AT_MS = RESULT_AT_MS + 350
const FALL_MS = 300
const FLOAT_MS = 800
/** Blink: fade out, appear on the new tile, fade in. */
const TELEPORT_FADE_MS = 140

/** Units of the side to act that have nothing left to do this Turn. */
const SPENT_ALPHA = 0.5

/** Status icons drawn on a Unit; the Unit card lists them all. */
const MAX_STATUS_ICONS = 3

export interface BattleSceneData {
  readonly session: BattleSessionPort
  readonly labels: BoardLabels
}

const tileCentre = (tile: Tile) => ({
  x: tile.x * TILE_SIZE + TILE_SIZE / 2,
  y: tile.y * TILE_SIZE + TILE_SIZE / 2,
})

interface UnitView {
  readonly container: Phaser.GameObjects.Container
  readonly hpBar: Phaser.GameObjects.Graphics
  readonly statusIcons: Phaser.GameObjects.Graphics
}

/** Draw a pixel pattern (rows of "#" and ".") with its top-left corner at (x, y). */
function drawPattern(g: Phaser.GameObjects.Graphics, pattern: readonly string[], x: number, y: number): void {
  pattern.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) if (row[dx] === '#') g.fillRect(x + dx, y + dy, 1, 1)
  })
}

export class BattleScene extends Phaser.Scene {
  private session!: BattleSessionPort
  private labels!: BoardLabels
  private highlights!: Phaser.GameObjects.Graphics
  private readonly unitViews = new Map<UnitId, UnitView>()
  /** Units whose position a running animation owns (walking, lunging, falling). */
  private readonly animating = new Set<UnitId>()
  private shownRevision = -1

  constructor() {
    super('battle')
  }

  init(data: BattleSceneData): void {
    this.session = data.session
    this.labels = data.labels
  }

  create(): void {
    const snapshot = this.session.getSnapshot()
    this.drawBoard(snapshot.state)
    this.highlights = this.add.graphics()
    this.shownRevision = snapshot.revision
    this.render()

    // pointerdown covers both mouse click and touch tap; nothing uses hover.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => this.onTap(pointer))

    const unsubscribe = this.session.subscribe(() => this.render())
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe)
    this.events.once(Phaser.Scenes.Events.DESTROY, unsubscribe)
  }

  private drawBoard(state: BattleState): void {
    const g = this.add.graphics()
    state.terrain.forEach((row, y) =>
      row.forEach((terrain, x) => {
        g.fillStyle(TERRAIN_COLOURS[terrain], 1)
        g.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        g.fillStyle(glyphColour(terrain), GLYPH_ALPHA)
        drawPattern(g, TERRAIN_GLYPHS[terrain], x * TILE_SIZE + 3, y * TILE_SIZE + 3)
      }),
    )
    g.fillStyle(GRID_LINE, 1)
    for (let i = 0; i <= BOARD_SIZE; i++) {
      const at = Math.min(i * TILE_SIZE, BOARD_PIXELS - 1)
      g.fillRect(at, 0, 1, BOARD_PIXELS)
      g.fillRect(0, at, BOARD_PIXELS, 1)
    }
  }

  private render(): void {
    const snapshot = this.session.getSnapshot()
    this.drawHighlights(snapshot)
    if (snapshot.revision !== this.shownRevision) {
      this.shownRevision = snapshot.revision
      this.animateEvents(snapshot)
    }
    const { state } = snapshot
    // A Unit that went down (rules §10.4) stays visible only while its fall plays.
    const shown = new Set(snapshot.units.map((u) => u.id))
    for (const [id, view] of this.unitViews) view.container.setVisible(shown.has(id) || this.animating.has(id))
    for (const unit of snapshot.units) {
      const view = this.unitView(unit)
      const spent = state.phase === 'play' && unit.side === state.sideToAct && !snapshot.canAct.includes(unit.id)
      // A running animation (Blink's fade) owns the alpha until it ends.
      if (!this.animating.has(unit.id)) view.container.setAlpha(spent ? SPENT_ALPHA : 1)
      // Units being placed are not on the Board yet, and are at full HP.
      const maxHp = state.phase === 'play' ? derivedValues(state, unit.id).maxHp : unit.hp
      this.drawHpBar(view.hpBar, unit.hp, maxHp)
      this.drawStatusIcons(view.statusIcons, unit, state)
      if (this.animating.has(unit.id)) continue
      const { x, y } = tileCentre(unit.tile)
      view.container.setPosition(x, y)
    }
    for (const unit of state.fallen) {
      const view = this.unitViews.get(unit.id)
      if (view !== undefined) this.drawHpBar(view.hpBar, 0, 1)
    }
  }

  /** The view of a Unit, created the first time the Unit is shown. */
  private unitView(unit: UnitState): UnitView {
    const existing = this.unitViews.get(unit.id)
    if (existing !== undefined) return existing
    const container = this.add.container(0, 0)
    const g = this.add.graphics()
    drawUnit(g, unit)
    const hpBar = this.add.graphics()
    const statusIcons = this.add.graphics()
    container.add([g, hpBar, statusIcons])
    const view = { container, hpBar, statusIcons }
    this.unitViews.set(unit.id, view)
    return view
  }

  private drawHpBar(g: Phaser.GameObjects.Graphics, hp: number, maxHp: number): void {
    const width = 22
    const filled = maxHp > 0 ? Math.ceil((width * hp) / maxHp) : 0
    g.clear()
    g.fillStyle(HP_BAR_BACK, 1)
    g.fillRect(-width / 2 - 1, 13, width + 2, 4)
    g.fillStyle(hp * 3 <= maxHp ? HP_BAR_LOW : HP_BAR_FILL, 1)
    g.fillRect(-width / 2, 14, filled, 2)
  }

  /**
   * Status icons (Guarded shield, Bleed drop, Rallied arrow, …) in a row from
   * the top corner the team pennant does not use (A's pennant is left, B's
   * right), up to 3; tap the Unit for the full list with durations.
   */
  private drawStatusIcons(g: Phaser.GameObjects.Graphics, unit: UnitState, state: BattleState): void {
    g.clear()
    const step = unit.side === 'A' ? -8 : 8
    unit.statuses.slice(0, MAX_STATUS_ICONS).forEach((status, index) => {
      const left = (unit.side === 'A' ? 8 : -15) + index * step
      const icon = STATUS_ICONS[status.id]
      const colour = icon?.colour ?? (state.statusTypes[status.id]?.polarity === 'negative' ? STATUS_NEGATIVE : STATUS_POSITIVE)
      g.fillStyle(OUTLINE, 1)
      g.fillRect(left, -15, 7, 7)
      g.fillStyle(colour, 1)
      drawPattern(g, icon?.pattern ?? STATUS_DOT, left + 1, -14)
    })
  }

  private drawHighlights(snapshot: BattleSnapshot): void {
    const g = this.highlights
    g.clear()
    for (const tile of snapshot.reachable) {
      g.fillStyle(REACHABLE, 0.22)
      g.fillRect(tile.x * TILE_SIZE + 1, tile.y * TILE_SIZE + 1, TILE_SIZE - 1, TILE_SIZE - 1)
      g.lineStyle(1, REACHABLE, 0.9)
      g.strokeRect(tile.x * TILE_SIZE + 2.5, tile.y * TILE_SIZE + 2.5, TILE_SIZE - 4, TILE_SIZE - 4)
    }
    for (const tile of snapshot.area) {
      g.fillStyle(AREA, 0.25)
      g.fillRect(tile.x * TILE_SIZE + 1, tile.y * TILE_SIZE + 1, TILE_SIZE - 1, TILE_SIZE - 1)
    }
    for (const tile of snapshot.tileChoices) {
      g.fillStyle(TILE_CHOICE, 0.2)
      g.fillRect(tile.x * TILE_SIZE + 1, tile.y * TILE_SIZE + 1, TILE_SIZE - 1, TILE_SIZE - 1)
      g.lineStyle(1, TILE_CHOICE, 0.9)
      g.strokeRect(tile.x * TILE_SIZE + 2.5, tile.y * TILE_SIZE + 2.5, TILE_SIZE - 4, TILE_SIZE - 4)
    }
    if (snapshot.pendingTile !== null) {
      const tile = snapshot.pendingTile
      g.lineStyle(2, TILE_CHOICE, 1)
      g.strokeRect(tile.x * TILE_SIZE + 2, tile.y * TILE_SIZE + 2, TILE_SIZE - 3, TILE_SIZE - 3)
    }
    for (const tile of snapshot.targets) {
      g.fillStyle(TARGET, 0.3)
      g.fillRect(tile.x * TILE_SIZE + 1, tile.y * TILE_SIZE + 1, TILE_SIZE - 1, TILE_SIZE - 1)
      g.lineStyle(1, TARGET, 1)
      g.strokeRect(tile.x * TILE_SIZE + 2.5, tile.y * TILE_SIZE + 2.5, TILE_SIZE - 4, TILE_SIZE - 4)
    }
    for (const tile of snapshot.blockedTargets) {
      // Crossed out: in range, but a Unit stands in the line of sight.
      const left = tile.x * TILE_SIZE + 4
      const top = tile.y * TILE_SIZE + 4
      const size = TILE_SIZE - 8
      g.lineStyle(2, BLOCKED_TARGET, 0.9)
      g.lineBetween(left, top, left + size, top + size)
      g.lineBetween(left + size, top, left, top + size)
    }
    snapshot.chosenTargets.forEach((id, index) => {
      const unit = snapshot.units.find((u) => u.id === id)
      const digit = ORDER_DIGITS[index]
      if (unit === undefined || digit === undefined) return
      const left = unit.tile.x * TILE_SIZE + 2
      const top = unit.tile.y * TILE_SIZE + TILE_SIZE - 9
      g.lineStyle(2, PENDING_TARGET, 1)
      g.strokeRect(unit.tile.x * TILE_SIZE + 2, unit.tile.y * TILE_SIZE + 2, TILE_SIZE - 3, TILE_SIZE - 3)
      g.fillStyle(OUTLINE, 1)
      g.fillRect(left, top, 5, 7)
      g.fillStyle(PENDING_TARGET, 1)
      drawPattern(g, digit, left + 1, top + 1)
    })
    const pending = snapshot.units.find((u) => u.id === snapshot.pendingTarget)
    if (pending !== undefined) {
      g.lineStyle(2, PENDING_TARGET, 1)
      g.strokeRect(pending.tile.x * TILE_SIZE + 2, pending.tile.y * TILE_SIZE + 2, TILE_SIZE - 3, TILE_SIZE - 3)
    }
    const selected = snapshot.units.find((u) => u.id === snapshot.selectedUnit)
    if (selected !== undefined) {
      g.lineStyle(2, SELECTED, 1)
      g.strokeRect(selected.tile.x * TILE_SIZE + 2, selected.tile.y * TILE_SIZE + 2, TILE_SIZE - 3, TILE_SIZE - 3)
    }
  }

  /** Play the events of the latest action, in order. */
  private animateEvents(snapshot: BattleSnapshot): void {
    let critical = false
    for (const event of snapshot.events) {
      switch (event.type) {
        case 'unitMoved':
          this.walk(event.unit, event.path)
          break
        case 'attackRolled':
          critical = event.critical
          this.lunge(event.attacker, event.target)
          if (!event.hit) {
            this.time.delayedCall(RESULT_AT_MS, () => this.floatText(event.target, this.labels.miss, '#d8d8d8'))
          }
          break
        case 'damageDealt': {
          const text = critical ? `-${event.amount} ${this.labels.critical}` : `-${event.amount}`
          const colour = critical ? '#ffe14d' : '#ff6b5e'
          this.time.delayedCall(RESULT_AT_MS, () => {
            this.flash(event.target)
            this.floatText(event.target, text, colour)
          })
          break
        }
        case 'unitTeleported':
          this.teleport(event.unit, event.to)
          break
        case 'unitRetreated':
          // Hit and Run's free step: a one-tile walk.
          this.walk(event.unit, [event.to])
          break
        case 'statusTicked':
          // Bleed at the start of the Turn: no attack, just the HP lost.
          this.flash(event.unit)
          this.floatText(event.unit, `-${event.amount}`, '#ff6b5e')
          break
        case 'unitDown':
          this.fall(event.unit)
          break
        default:
          break
      }
    }
  }

  /** Walk a moved Unit along the path the engine reported. */
  private walk(unit: UnitId, path: readonly Tile[]): void {
    const view = this.unitViews.get(unit)
    if (view === undefined) return
    this.animating.add(unit)
    const steps = path.map(tileCentre)
    const next = (index: number): void => {
      const step = steps[index]
      if (step === undefined) {
        this.animating.delete(unit)
        this.render()
        return
      }
      this.tweens.add({ targets: view.container, x: step.x, y: step.y, duration: STEP_MS, onComplete: () => next(index + 1) })
    }
    next(0)
  }

  /** Blink: the Unit fades out where it was and fades in on its new tile; nothing in between. */
  private teleport(unit: UnitId, to: Tile): void {
    const view = this.unitViews.get(unit)
    if (view === undefined) return
    this.animating.add(unit)
    const { x, y } = tileCentre(to)
    this.tweens.add({
      targets: view.container,
      alpha: 0,
      duration: TELEPORT_FADE_MS,
      onComplete: () => {
        view.container.setPosition(x, y)
        this.tweens.add({
          targets: view.container,
          alpha: 1,
          duration: TELEPORT_FADE_MS,
          onComplete: () => {
            this.animating.delete(unit)
            this.render()
          },
        })
      },
    })
  }

  /** Placeholder attack: the attacker hops toward its target and back. */
  private lunge(attacker: UnitId, target: UnitId): void {
    const view = this.unitViews.get(attacker)
    const to = this.unitViews.get(target)?.container
    if (view === undefined || to === undefined) return
    const from = view.container
    const dx = Math.sign(to.x - from.x) * LUNGE_PIXELS
    const dy = Math.sign(to.y - from.y) * LUNGE_PIXELS
    this.animating.add(attacker)
    this.tweens.add({
      targets: view.container,
      x: from.x + dx,
      y: from.y + dy,
      duration: LUNGE_MS,
      yoyo: true,
      onComplete: () => {
        this.animating.delete(attacker)
        this.render()
      },
    })
  }

  private flash(unit: UnitId): void {
    const view = this.unitViews.get(unit)
    if (view === undefined) return
    this.tweens.add({ targets: view.container, alpha: 0.2, duration: 60, yoyo: true, repeat: 2 })
  }

  /** A Unit that went down blinks out and leaves the Board. */
  private fall(unit: UnitId): void {
    const view = this.unitViews.get(unit)
    if (view === undefined) return
    this.animating.add(unit)
    this.time.delayedCall(FALL_AT_MS, () => {
      this.tweens.add({
        targets: view.container,
        alpha: 0,
        y: view.container.y + 4,
        duration: FALL_MS,
        onComplete: () => {
          this.animating.delete(unit)
          view.container.setVisible(false)
        },
      })
    })
  }

  private floatText(unit: UnitId, text: string, colour: string): void {
    const view = this.unitViews.get(unit)
    if (view === undefined) return
    const label = this.add
      .text(view.container.x, view.container.y - 14, text, {
        fontFamily: 'monospace',
        fontSize: '10px',
        fontStyle: 'bold',
        color: colour,
        stroke: '#141414',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(10)
    this.tweens.add({
      targets: label,
      y: label.y - 10,
      alpha: 0,
      delay: FLOAT_MS / 2,
      duration: FLOAT_MS / 2,
      onComplete: () => label.destroy(),
    })
  }

  private onTap(pointer: Phaser.Input.Pointer): void {
    const tile = { x: Math.floor(pointer.x / TILE_SIZE), y: Math.floor(pointer.y / TILE_SIZE) }
    if (tile.x < 0 || tile.y < 0 || tile.x >= BOARD_SIZE || tile.y >= BOARD_SIZE) return
    const unit = this.session.getSnapshot().units.find((u) => u.tile.x === tile.x && u.tile.y === tile.y)
    this.session.input(unit ? { type: 'tapUnit', unit: unit.id } : { type: 'tapTile', tile })
  }
}
