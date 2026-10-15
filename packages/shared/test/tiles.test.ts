import { describe, expect, it } from 'vitest'
import { isOnBoard, rotate180, tileFromName, tileName } from '../src/index.ts'

describe('tile names (rules §2.1)', () => {
  it('maps column a–g to x 0–6 and row 1–7 to y 0–6', () => {
    expect(tileFromName('a1')).toEqual({ x: 0, y: 0 })
    expect(tileFromName('d4')).toEqual({ x: 3, y: 3 })
    expect(tileFromName('g7')).toEqual({ x: 6, y: 6 })
    expect(tileName({ x: 2, y: 5 })).toBe('c6')
  })

  it('rejects names outside the 7x7 Board', () => {
    expect(() => tileFromName('h1')).toThrow()
    expect(() => tileFromName('a8')).toThrow()
    expect(isOnBoard({ x: 7, y: 0 })).toBe(false)
    expect(isOnBoard({ x: -1, y: 3 })).toBe(false)
  })

  it('turns a tile 180 degrees around d4', () => {
    const turned = (name: string) => tileName(rotate180(tileFromName(name)))
    expect(turned('a1')).toBe('g7')
    expect(turned('c2')).toBe('e6')
    expect(turned('g4')).toBe('a4')
    expect(turned('d4')).toBe('d4')
  })
})
