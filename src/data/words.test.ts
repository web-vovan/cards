import { describe, expect, it } from 'vitest'
import { builtInWords } from './words'

describe('built-in words', () => {
  it('ships 500 unique American lemmas', () => {
    expect(builtInWords).toHaveLength(500)
    const english = builtInWords.map(([en]) => en)
    expect(new Set(english).size).toBe(500)
    expect(english[0]).toBe('the')
    expect(english).toContain('color')
    expect(english).not.toContain('colour')
    expect(builtInWords.every(([en, ru]) => en.trim() === en && ru.trim() === ru && en && ru)).toBe(true)
  })
})
