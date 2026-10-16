/**
 * Placeholder Unit art: one silhouette per species (plus the Tamer), filled
 * with the element colour, with a team marker (base plate + corner pennant).
 * Drawn with integer coordinates around (0, 0) = tile centre, inside 32x32.
 */
import type * as Phaser from 'phaser'
import type { UnitState } from '@mt/session'
import { ELEMENT_COLOURS, OUTLINE, SIDE_COLOURS, TAMER_COLOUR } from './palette.ts'

type Graphics = Phaser.GameObjects.Graphics

export function drawUnit(g: Graphics, unit: UnitState): void {
  const side = SIDE_COLOURS[unit.side]
  const flying = unit.kind === 'monster' && unit.movement === 'flying'

  // Team marker 1: a base plate in the team colour under the Unit.
  g.fillStyle(OUTLINE, 1)
  g.fillEllipse(0, 11, 24, 9)
  g.fillStyle(side, 1)
  g.fillEllipse(0, 11, 22, 7)

  // Team marker 2: a pennant in the top corner (A left, B right).
  const px = unit.side === 'A' ? -15 : 15
  const dir = unit.side === 'A' ? 1 : -1
  g.fillStyle(OUTLINE, 1)
  g.fillTriangle(px, -16, px + dir * 9, -16, px, -6)
  g.fillStyle(side, 1)
  g.fillTriangle(px, -15, px + dir * 7, -15, px, -8)

  const body = unit.kind === 'tamer' ? TAMER_COLOUR : ELEMENT_COLOURS[unit.element]
  // Flying Units hover above their plate.
  const lift = flying ? -4 : 0

  if (unit.kind === 'tamer') {
    drawTamer(g, body)
    return
  }
  switch (unit.species) {
    case 'fangrel':
      drawFangrel(g, body)
      break
    case 'tidewall':
      drawTidewall(g, body)
      break
    case 'wispling':
      drawWispling(g, body, lift)
      break
    case 'quillfox':
      drawQuillfox(g, body)
      break
    default:
      drawUnknown(g, body)
  }
}

function outline(g: Graphics): void {
  g.lineStyle(1, OUTLINE, 1)
}

/** Upright figure: head, cloak, legs. */
function drawTamer(g: Graphics, colour: number): void {
  g.fillStyle(colour, 1)
  g.fillTriangle(-7, 10, 7, 10, 0, -4)
  g.fillCircle(0, -7, 4)
  outline(g)
  g.strokeTriangle(-7, 10, 7, 10, 0, -4)
  g.strokeCircle(0, -7, 4)
}

/** Low wolf: long body, head forward, pointed ears, tail. */
function drawFangrel(g: Graphics, colour: number): void {
  g.fillStyle(colour, 1)
  g.fillTriangle(-13, -4, -8, 2, -11, 5) // tail
  g.fillEllipse(-1, 3, 18, 10) // body
  g.fillCircle(8, -3, 5) // head
  g.fillTriangle(5, -7, 8, -14, 9, -7) // ear
  g.fillTriangle(9, -6, 13, -12, 12, -4) // ear
  g.fillRect(-8, 6, 3, 5) // legs
  g.fillRect(4, 6, 3, 5)
  outline(g)
  g.strokeEllipse(-1, 3, 18, 10)
  g.strokeCircle(8, -3, 5)
}

/** Heavy guardian: broad shell with a shield face. */
function drawTidewall(g: Graphics, colour: number): void {
  g.fillStyle(colour, 1)
  g.fillRoundedRect(-11, -9, 22, 19, 5)
  outline(g)
  g.strokeRoundedRect(-11, -9, 22, 19, 5)
  g.fillStyle(OUTLINE, 1)
  g.fillRect(-6, -3, 12, 2) // shield band
  g.fillCircle(0, 4, 3)
}

/** Floating wisp: flame-shaped body with small wings. */
function drawWispling(g: Graphics, colour: number, lift: number): void {
  g.fillStyle(colour, 1)
  g.fillTriangle(-11, -2 + lift, -4, -6 + lift, -4, 3 + lift) // wing
  g.fillTriangle(11, -2 + lift, 4, -6 + lift, 4, 3 + lift) // wing
  g.fillTriangle(-6, 0 + lift, 6, 0 + lift, 0, -14 + lift) // flame tip
  g.fillCircle(0, 1 + lift, 6)
  outline(g)
  g.strokeCircle(0, 1 + lift, 6)
  g.fillStyle(OUTLINE, 1)
  g.fillRect(-3, 0 + lift, 2, 2) // eyes
  g.fillRect(1, 0 + lift, 2, 2)
}

/** Slim fox with a quill crest and tall ears. */
function drawQuillfox(g: Graphics, colour: number): void {
  g.fillStyle(colour, 1)
  g.fillTriangle(-6, -2, -3, -10, 0, -2) // quills
  g.fillTriangle(-2, -2, 1, -11, 4, -2)
  g.fillTriangle(-14, -6, -6, 0, -10, 6) // tail
  g.fillEllipse(0, 3, 14, 9) // body
  g.fillTriangle(5, -2, 13, 1, 6, 4) // snout
  g.fillTriangle(5, -3, 6, -12, 9, -3) // ear
  g.fillRect(-5, 6, 2, 5) // legs
  g.fillRect(3, 6, 2, 5)
  outline(g)
  g.strokeEllipse(0, 3, 14, 9)
}

function drawUnknown(g: Graphics, colour: number): void {
  g.fillStyle(colour, 1)
  g.fillRect(-7, -7, 14, 16)
  outline(g)
  g.strokeRect(-7, -7, 14, 16)
}
