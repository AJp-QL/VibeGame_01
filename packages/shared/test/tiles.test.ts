import { describe, expect, it } from 'vitest'
import { isOnBoard, rotate180, tileFromName, tileName } from '../src/index.ts'

describe('tile names (rules §2.1)', () => {
  it('maps column a–g to x 0–6 and row 1–7 to y 0–6', () => {
    expect(tileFromName('a1')).toEqual({ x: 0, y: 0 })
    expect(tileFromName('d4')).toEqual({ x: 3, y: 3 })
    expect(tileFromName('g7')).toEqual({ x: 6, y: 6 })
    expect(tileName({ x: 2, y: 5 })).toBe('c6')
  })

  it('a name is a column letter and a row number; whether it is on a Board is isOnBoard (7x7 unless a size is given)', () => {
    expect(tileFromName('h1')).toEqual({ x: 7, y: 0 })
    expect(tileFromName('a8')).toEqual({ x: 0, y: 7 })
    expect(tileFromName('o15')).toEqual({ x: 14, y: 14 })
    expect(tileName({ x: 8, y: 9 })).toBe('i10')
    for (const bad of ['p1', 'a16', 'a0', '1a', 'aa', 'a', '', 'A1', 'a01']) expect(() => tileFromName(bad), bad).toThrow()
    expect(isOnBoard({ x: 7, y: 0 }, 7)).toBe(false)
    expect(isOnBoard({ x: 7, y: 0 }, 9)).toBe(true)
    expect(isOnBoard({ x: 9, y: 0 }, 9)).toBe(false)
    expect(isOnBoard({ x: -1, y: 3 }, 7)).toBe(false)
    expect(isOnBoard({ x: 1.5, y: 3 }, 9)).toBe(false)
  })

  it('turns a tile 180 degrees on a Board of any size', () => {
    expect(tileName(rotate180(tileFromName('a1'), 9))).toBe('i9')
    expect(tileName(rotate180(tileFromName('c2'), 9))).toBe('g8')
    expect(tileName(rotate180(tileFromName('e5'), 9))).toBe('e5')
  })

  it('turns a tile 180 degrees around d4', () => {
    const turned = (name: string) => tileName(rotate180(tileFromName(name), 7))
    expect(turned('a1')).toBe('g7')
    expect(turned('c2')).toBe('e6')
    expect(turned('g4')).toBe('a4')
    expect(turned('d4')).toBe('d4')
  })
})
