/**
 * The Phaser scene that draws the Board and its Units from the session's
 * snapshot, animates the engine's events (Moves, attacks, damage, Units going
 * down) and turns taps into BoardInput. It keeps view objects only, never
 * game state. Each element tile carries a small corner mark (palette
 * TERRAIN_GLYPHS); statuses show as small icons (Guarded shield, Bleed drop, Rallied arrow, Pin cross, Marked
 * crosshair, Hidden leaf); enemies that line of sight blocks, or that are Hidden 2 or more tiles away, are crossed
 * out while choosing a target. A tile Attune changed shows its new terrain
 * with a white frame and the Turns it has left; Cover and Command show as
 * icons next to the statuses. Tile and area skills
 * light up the tiles they can be aimed at, Burst's 3x3 area shows around its
 * centre and its chosen targets carry their order number; Blink plays as a
 * fade out and in. It draws only the Units in `snapshot.units`, so Units hidden
 * during deployment never appear and cannot be tapped.
 */
import * as Phaser from 'phaser'
import type { Tile } from '@mt/shared'
import { boardPixels, tileAtPoint, tileCentre, TILE_SIZE } from './boardGeometry.ts'
import { derivedValues, type BattleSessionPort, type BattleSnapshot, type BattleState, type SessionSnapshot, type UnitId, type UnitState } from '@mt/session'
import {
  AREA,
  ATTUNED,
  COMMAND_ICON,
  COVER_ICON,
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
import type { BoardLabels } from './labels.ts'
import { drawUnit } from './silhouettes.ts'


/** Milliseconds per step when a Unit walks its path. */
const STEP_MS = 90
/** Attack placeholder animation: lunge, then the result, then a fall. */
const LUNGE_MS = 110
const LUNGE_PIXELS = 9
const RESULT_AT_MS = 2 * LUNGE_MS
const FALL_AT_MS = RESULT_AT_MS + 350
const FALL_MS = 300
const FLOAT_MS = 800
/** A counterattack (and whatever follows it, e.g. Shield Bash's push) starts once the attack it answers has shown its result. */
const FOLLOW_UP_MS = RESULT_AT_MS + 250
const PUSH_MS = 160
/** Blink: fade out, appear on the new tile, fade in. */
const TELEPORT_FADE_MS = 140

/** Units of the side to act that have nothing left to do this Turn. */
const SPENT_ALPHA = 0.5

/** Status icons drawn on a Unit; the Unit card lists them all. */
const MAX_STATUS_ICONS = 3

type PlanSnapshot = BattleSnapshot & Partial<Pick<SessionSnapshot, 'attackable' | 'plan' | 'mode'>>

export interface BattleSceneData {
  readonly session: BattleSessionPort
  readonly labels: BoardLabels
}

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
  private planMarkers!: Phaser.GameObjects.Graphics
  private highlights!: Phaser.GameObjects.Graphics
  private movePreview!: Phaser.GameObjects.Graphics
  private terrainLayer!: Phaser.GameObjects.Graphics
  /** What the terrain layer shows, to redraw it only when Attune changed something. */
  private terrainKey = ''
  private readonly unitViews = new Map<UnitId, UnitView>()
  /** Units whose position a running animation owns (walking, lunging, falling). */
  private readonly animating = new Set<UnitId>()
  private readonly floatingLabels = new Set<Phaser.GameObjects.Text>()
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
    this.terrainLayer = this.add.graphics()
    this.drawBoard(snapshot.state)
    this.highlights = this.add.graphics()
    this.planMarkers = this.add.graphics().setDepth(6)
    this.movePreview = this.add.graphics().setDepth(5).setAlpha(0.5)
    this.shownRevision = snapshot.revision
    this.render()

    // pointerdown covers both mouse click and touch tap; nothing uses hover.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => this.onTap(pointer))

    const unsubscribe = this.session.subscribe(() => this.render())
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe)
    this.events.once(Phaser.Scenes.Events.DESTROY, unsubscribe)
  }

  /** Terrain now (Attune included, rules §4.3), grid, and on attuned tiles a frame with the Turns left. */
  private drawBoard(state: BattleState): void {
    const key = JSON.stringify([state.terrain, state.attuned])
    if (key === this.terrainKey) return
    this.terrainKey = key
    const g = this.terrainLayer
    g.clear()
    state.terrain.forEach((row, y) =>
      row.forEach((terrain, x) => {
        g.fillStyle(TERRAIN_COLOURS[terrain], 1)
        g.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        g.fillStyle(glyphColour(terrain), GLYPH_ALPHA)
        drawPattern(g, TERRAIN_GLYPHS[terrain], x * TILE_SIZE + 3, y * TILE_SIZE + 3)
      }),
    )
    g.fillStyle(GRID_LINE, 1)
    const pixels = boardPixels(state)
    for (let i = 0; i <= state.terrain.length; i++) {
      const at = Math.min(i * TILE_SIZE, pixels - 1)
      g.fillRect(at, 0, 1, pixels)
      g.fillRect(0, at, pixels, 1)
    }
    for (const attuned of state.attuned) {
      const left = attuned.tile.x * TILE_SIZE
      const top = attuned.tile.y * TILE_SIZE
      g.lineStyle(1, ATTUNED, 0.9)
      g.strokeRect(left + 2, top + 2, TILE_SIZE - 4, TILE_SIZE - 4)
      const digit = ORDER_DIGITS[attuned.turnsLeft - 1]
      g.fillStyle(OUTLINE, 1)
      g.fillRect(left + TILE_SIZE - 8, top + 3, 5, 7)
      g.fillStyle(ATTUNED, 1)
      drawPattern(g, digit ?? STATUS_DOT, left + TILE_SIZE - 7, top + 4)
    }
  }

  private render(): void {
    const snapshot: PlanSnapshot = this.session.getSnapshot()
    this.drawBoard(snapshot.state)
    this.drawHighlights(snapshot)
    const plan = snapshot.plan
    const preview = plan == null ? snapshot.movePreview : { unit: plan.unit, tile: plan.origin.tile }
    this.movePreview.clear()
    const previewUnit = preview == null ? undefined : snapshot.units.find(unit => unit.id === preview.unit)
    if (preview != null && previewUnit !== undefined) {
      const centre = tileCentre(preview.tile)
      this.movePreview.setPosition(centre.x, centre.y)
      drawUnit(this.movePreview, previewUnit)
      this.movePreview.lineStyle(2, SELECTED, 1)
      this.movePreview.strokeRect(-TILE_SIZE / 2 + 2, -TILE_SIZE / 2 + 2, TILE_SIZE - 3, TILE_SIZE - 3)
    }
    if (snapshot.revision !== this.shownRevision) {
      this.shownRevision = snapshot.revision
      // Undo and Replay jumps redraw an earlier state without animation events.
      // Stop queued movement too, so it cannot carry a Unit back to the withdrawn tile.
      if (snapshot.events.length === 0) {
        this.tweens.killAll()
        this.time.removeAllEvents()
        this.animating.clear()
        for (const label of this.floatingLabels) label.destroy()
        this.floatingLabels.clear()
      }
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
    const icons: { colour: number; pattern: readonly string[] }[] = unit.statuses.map((status) => {
      const icon = STATUS_ICONS[status.id]
      const colour = icon?.colour ?? (state.statusTypes[status.id]?.polarity === 'negative' ? STATUS_NEGATIVE : STATUS_POSITIVE)
      return { colour, pattern: icon?.pattern ?? STATUS_DOT }
    })
    if (unit.coveredBy !== undefined) icons.push(COVER_ICON)
    if (state.command?.target === unit.id && state.command.spent !== true) icons.push(COMMAND_ICON)
    icons.slice(0, MAX_STATUS_ICONS).forEach((icon, index) => {
      const left = (unit.side === 'A' ? 8 : -15) + index * step
      g.fillStyle(OUTLINE, 1)
      g.fillRect(left, -15, 7, 7)
      g.fillStyle(icon.colour, 1)
      drawPattern(g, icon.pattern, left + 1, -14)
    })
  }

  private drawHighlights(snapshot: PlanSnapshot): void {
    const g = this.highlights
    g.clear()
    for (const tile of snapshot.reachable) {
      g.fillStyle(REACHABLE, 0.22)
      g.fillRect(tile.x * TILE_SIZE + 1, tile.y * TILE_SIZE + 1, TILE_SIZE - 1, TILE_SIZE - 1)
      g.lineStyle(1, REACHABLE, 0.9)
      g.strokeRect(tile.x * TILE_SIZE + 2.5, tile.y * TILE_SIZE + 2.5, TILE_SIZE - 4, TILE_SIZE - 4)
    }
    // Attack origins and enemies come entirely from the session's Action plan data.
    const enemies = snapshot.mode === 'move' ? snapshot.attackable ?? [] : []
    const origins = snapshot.plan?.originChoices ?? enemies.flatMap(enemy => enemy.origins)
    for (const origin of origins) {
      const centre = tileCentre(origin.tile)
      g.fillStyle(OUTLINE, 1)
      g.fillCircle(centre.x, centre.y + 9, 3)
      g.fillStyle(TARGET, 1)
      g.fillCircle(centre.x, centre.y + 9, 2)
    }
    const markers = this.planMarkers
    markers.clear()
    for (const enemy of enemies) {
      // A small sword in a dark badge; status icons keep their own corners.
      const left = enemy.tile.x * TILE_SIZE + 12
      const top = enemy.tile.y * TILE_SIZE + 2
      markers.fillStyle(OUTLINE, 1)
      markers.fillRect(left - 1, top - 1, 9, 10)
      markers.fillStyle(TARGET, 1)
      drawPattern(markers, ['.....##', '....###', '...###.', '#.###..', '.###...', '..###..', '.#..#..'], left, top)
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
    const batches = snapshot.eventBatches
    if (batches !== undefined && batches.length > 1) {
      const play = (index: number): void => {
        const events = batches[index]
        if (events === undefined) return
        const move = events.find(event => event.type === 'unitMoved')
        const blink = events.find(event => event.type === 'unitTeleported')
        // Chain on the actual animation completion, not an estimated delay: a slow
        // frame must not start the attack while the Unit is still walking.
        if (move?.type === 'unitMoved') this.walk(move.unit, move.path, () => play(index + 1))
        else if (blink?.type === 'unitTeleported') this.teleport(blink.unit, blink.to, () => play(index + 1))
        else {
          this.animateEvents({ ...snapshot, events, eventBatches: [] })
          play(index + 1)
        }
      }
      play(0)
      return
    }
    let critical = false
    // Events after an attack's result (counterattack, push) wait for it to show.
    let offset = 0
    let attacked = false
    const later = (ms: number, run: () => void) => this.time.delayedCall(offset + ms, run)
    for (const event of snapshot.events) {
      switch (event.type) {
        case 'unitMoved':
          this.walk(event.unit, event.path)
          break
        case 'attackRolled':
          critical = event.critical
          attacked = true
          later(0, () => this.lunge(event.attacker, event.target))
          if (!event.hit) later(RESULT_AT_MS, () => this.floatText(event.target, this.labels.miss, '#d8d8d8'))
          break
        case 'damageDealt': {
          const text = critical ? `-${event.amount} ${this.labels.critical}` : `-${event.amount}`
          const colour = critical ? '#ffe14d' : '#ff6b5e'
          later(RESULT_AT_MS, () => {
            this.flash(event.target)
            this.floatText(event.target, text, colour)
          })
          break
        }
        case 'counterattack':
          // Countering strikes back once the attack has landed or missed.
          offset += FOLLOW_UP_MS
          later(0, () => this.floatText(event.unit, this.labels.counter, '#7fd4ff'))
          break
        case 'unitPushed':
          // Shield Bash: the push comes after the hit (and any counterattack).
          if (attacked) offset += FOLLOW_UP_MS
          this.slide(event.unit, event.to, offset)
          break
        case 'pushBlocked':
          if (attacked) offset += FOLLOW_UP_MS
          later(0, () => this.floatText(event.unit, this.labels.pushBlocked, '#d8d8d8'))
          break
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
          this.fall(event.unit, offset)
          break
        default:
          break
      }
    }
  }

  /** Walk a moved Unit along the path the engine reported. */
  private walk(unit: UnitId, path: readonly Tile[], onComplete?: () => void): void {
    const view = this.unitViews.get(unit)
    if (view === undefined) return
    this.animating.add(unit)
    const steps = path.map(tileCentre)
    const next = (index: number): void => {
      const step = steps[index]
      if (step === undefined) {
        this.animating.delete(unit)
        this.render()
        onComplete?.()
        return
      }
      this.tweens.add({ targets: view.container, x: step.x, y: step.y, duration: STEP_MS, onComplete: () => next(index + 1) })
    }
    next(0)
  }

  /** Pushed (Shield Bash): one quick slide to the new tile after `delay` ms. Not a walk: no steps. */
  private slide(unit: UnitId, to: Tile, delay: number): void {
    const view = this.unitViews.get(unit)
    if (view === undefined) return
    this.animating.add(unit)
    const target = tileCentre(to)
    this.time.delayedCall(delay, () => {
      this.tweens.add({
        targets: view.container,
        x: target.x,
        y: target.y,
        duration: PUSH_MS,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.animating.delete(unit)
          this.render()
        },
      })
    })
  }

  /** Blink: the Unit fades out where it was and fades in on its new tile; nothing in between. */
  private teleport(unit: UnitId, to: Tile, onComplete?: () => void): void {
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
            onComplete?.()
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
  private fall(unit: UnitId, delay = 0): void {
    const view = this.unitViews.get(unit)
    if (view === undefined) return
    this.animating.add(unit)
    this.time.delayedCall(delay + FALL_AT_MS, () => {
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
        fontFamily: this.labels.fontFamily ?? 'monospace',
        fontSize: '10px',
        fontStyle: 'bold',
        color: colour,
        stroke: '#141414',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(10)
    this.floatingLabels.add(label)
    this.tweens.add({
      targets: label,
      y: label.y - 10,
      alpha: 0,
      delay: FLOAT_MS / 2,
      duration: FLOAT_MS / 2,
      onComplete: () => { this.floatingLabels.delete(label); label.destroy() },
    })
  }

  private onTap(pointer: Phaser.Input.Pointer): void {
    const snapshot = this.session.getSnapshot()
    const tile = tileAtPoint(pointer.x, pointer.y, snapshot.state.terrain.length)
    if (tile === null) return
    const unit = snapshot.units.find((u) => u.tile.x === tile.x && u.tile.y === tile.y)
    this.session.input(unit ? { type: 'tapUnit', unit: unit.id } : { type: 'tapTile', tile })
  }
}
