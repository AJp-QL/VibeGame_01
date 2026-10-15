/**
 * The Phaser scene that draws the Board and its Units from the session's
 * snapshot, animates Moves from the engine's events and turns taps into
 * BoardInput. It keeps view objects only, never game state.
 */
import * as Phaser from 'phaser'
import { BOARD_SIZE, type Tile } from '@mt/shared'
import type { BattleState, UnitId } from '@mt/engine'
import { GRID_LINE, REACHABLE, SELECTED, TERRAIN_COLOURS } from './palette.ts'
import type { BattleSessionPort, BattleSnapshot } from './port.ts'
import { drawUnit } from './silhouettes.ts'

export const TILE_SIZE = 32
export const BOARD_PIXELS = TILE_SIZE * BOARD_SIZE

/** Milliseconds per step when a Unit walks its path. */
const STEP_MS = 90

export interface BattleSceneData {
  readonly session: BattleSessionPort
}

const tileCentre = (tile: Tile) => ({
  x: tile.x * TILE_SIZE + TILE_SIZE / 2,
  y: tile.y * TILE_SIZE + TILE_SIZE / 2,
})

export class BattleScene extends Phaser.Scene {
  private session!: BattleSessionPort
  private highlights!: Phaser.GameObjects.Graphics
  private readonly unitViews = new Map<UnitId, Phaser.GameObjects.Container>()
  private readonly walking = new Set<UnitId>()
  private shownRevision = -1

  constructor() {
    super('battle')
  }

  init(data: BattleSceneData): void {
    this.session = data.session
  }

  create(): void {
    const snapshot = this.session.getSnapshot()
    this.drawBoard(snapshot.state)
    this.highlights = this.add.graphics()
    for (const unit of snapshot.state.units) {
      const view = this.add.container(0, 0)
      const g = this.add.graphics()
      drawUnit(g, unit)
      view.add(g)
      this.unitViews.set(unit.id, view)
    }
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
    for (const unit of snapshot.state.units) {
      const view = this.unitViews.get(unit.id)
      if (view === undefined || this.walking.has(unit.id)) continue
      const { x, y } = tileCentre(unit.tile)
      view.setPosition(x, y)
    }
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
    const selected = snapshot.state.units.find((u) => u.id === snapshot.selectedUnit)
    if (selected !== undefined) {
      g.lineStyle(2, SELECTED, 1)
      g.strokeRect(selected.tile.x * TILE_SIZE + 2, selected.tile.y * TILE_SIZE + 2, TILE_SIZE - 3, TILE_SIZE - 3)
    }
  }

  /** Walk each moved Unit along the path the engine reported. */
  private animateEvents(snapshot: BattleSnapshot): void {
    for (const event of snapshot.events) {
      if (event.type !== 'unitMoved') continue
      const view = this.unitViews.get(event.unit)
      if (view === undefined) continue
      this.walking.add(event.unit)
      const steps = event.path.map(tileCentre)
      const walk = (index: number): void => {
        const step = steps[index]
        if (step === undefined) {
          this.walking.delete(event.unit)
          this.render()
          return
        }
        this.tweens.add({ targets: view, x: step.x, y: step.y, duration: STEP_MS, onComplete: () => walk(index + 1) })
      }
      walk(0)
    }
  }

  private onTap(pointer: Phaser.Input.Pointer): void {
    const tile = { x: Math.floor(pointer.x / TILE_SIZE), y: Math.floor(pointer.y / TILE_SIZE) }
    if (tile.x < 0 || tile.y < 0 || tile.x >= BOARD_SIZE || tile.y >= BOARD_SIZE) return
    const unit = this.session.getSnapshot().state.units.find((u) => u.tile.x === tile.x && u.tile.y === tile.y)
    this.session.input(unit ? { type: 'tapUnit', unit: unit.id } : { type: 'tapTile', tile })
  }
}
