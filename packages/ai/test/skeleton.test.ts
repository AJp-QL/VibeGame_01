import { describe, expect, it } from 'vitest'
import * as ai from '../src/index.ts'

describe('ai package', () => {
  it('loads', () => expect(ai).toBeDefined())
})
