/**
 * The Phaser scene that draws the Board and its Units from the session's
 * snapshot, animates the engine's events (Moves, attacks, damage, Units going
 * down) and turns taps into BoardInput. It keeps view objects only, never
 * game state. It draws only the Units in `snapshot.units`, so Units hidden
 * during deployment never appear and cannot be tapped.
 */
import * as Phaser from 'phaser'
import { BOARD_SIZE, type Tile } from '@mt/shared'
import { derivedValues, type BattleState, type UnitId, type UnitState } from '@mt/engine'
import {
  GRID_LINE,
  HP_BAR_BACK,
  HP_BAR_FILL,
  HP_BAR_LOW,
  PENDING_TARGET,
  REACHABLE,
  SELECTED,
  TARGET,
  TERRAIN_COLOURS,
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

/** Units of the side to act that have nothing left to do this Turn. */
const SPENT_ALPHA = 0.5

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
      view.container.setAlpha(spent ? SPENT_ALPHA : 1)
      // Units being placed are not on the Board yet, and are at full HP.
      const maxHp = state.phase === 'play' ? derivedValues(state, unit.id).maxHp : unit.hp
      this.drawHpBar(view.hpBar, unit.hp, maxHp)
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
    container.add([g, hpBar])
    const view = { container, hpBar }
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

  private drawHighlights(snapshot: BattleSnapshot): void {
    const g = this.highlights
    g.clear()
    for (const tile of snapshot.reachable) {
      g.fillStyle(REACHABLE, 0.22)
      g.fillRect(tile.x * TILE_SIZE + 1, tile.y * TILE_SIZE + 1, TILE_SIZE - 1, TILE_SIZE - 1)
      g.lineStyle(1, REACHABLE, 0.9)
      g.strokeRect(tile.x * TILE_SIZE + 2.5, tile.y * TILE_SIZE + 2.5, TILE_SIZE - 4, TILE_SIZE - 4)
    }
    for (const tile of snapshot.targets) {
      g.fillStyle(TARGET, 0.3)
      g.fillRect(tile.x * TILE_SIZE + 1, tile.y * TILE_SIZE + 1, TILE_SIZE - 1, TILE_SIZE - 1)
      g.lineStyle(1, TARGET, 1)
      g.strokeRect(tile.x * TILE_SIZE + 2.5, tile.y * TILE_SIZE + 2.5, TILE_SIZE - 4, TILE_SIZE - 4)
    }
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
