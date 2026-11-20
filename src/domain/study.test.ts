import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { addCard, createState, deleteCard, grade, orderedCards, restore, undo, updateCard, withToday, LADDER_DAYS } from './study'
import type { Card } from './types'

const today = '2026-11-20'

function card(partial: Partial<Card> & Pick<Card, 'id'>): Card {
  return {
    ru: partial.id,
    en: partial.id,
    source: 'built-in',
    rank: Number(partial.id.replace(/\D/g, '')) || 1,
    createdAt: Number(partial.id.replace(/\D/g, '')) || 1,
    status: 'new',
    step: null,
    due: null,
    ...partial,
  }
}

describe('dates', () => {
  it('adds calendar days across a month boundary', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-11-20', 180)).toBe('2027-05-19')
  })
})

describe('session', () => {
  it('shows due cards before new ones, most overdue first', () => {
    const state = createState(
      [
        card({ id: 'b1', rank: 1, createdAt: 1 }),
        card({ id: 'b2', status: 'learning', due: '2026-11-18', step: 2, createdAt: 2, rank: 2 }),
        card({ id: 'b3', status: 'learning', due: '2026-11-20', step: 0, createdAt: 3, rank: 3 }),
        card({ id: 'b4', status: 'learning', due: '2026-11-18', step: 1, createdAt: 4, rank: 4 }),
      ],
      today,
    )
    expect(state.queue.map((item) => item.id)).toEqual(['b2', 'b4', 'b3'])
  })

  it('breaks a due-date tie by earlier creation', () => {
    const state = createState(
      [
        card({ id: 'b2', status: 'learning', due: today, step: 0, createdAt: 2 }),
        card({ id: 'b1', status: 'learning', due: today, step: 0, createdAt: 1 }),
      ],
      today,
    )
    expect(state.queue.map((item) => item.id)).toEqual(['b1', 'b2'])
  })

  it('keeps the same-day queue and rolls it on the next day', () => {
    const started = createState([card({ id: 'b1' }), card({ id: 'b2', status: 'learning', due: today, step: 0 })], today)
    const answered = grade(started, 'b2', 'fail', today)
    expect(withToday(answered, today).queue.map((item) => item.id)).toEqual(['b2'])
    const tomorrow = withToday(answered, '2026-11-21')
    expect(tomorrow.queue[0]).toEqual({ id: 'b2', phase: 'due' })
    expect(tomorrow.newAnswers).toEqual({ date: '2026-11-21', count: 0 })
    expect(tomorrow.undo).toBeNull()
  })

  it('sends a miss to the end of the due cards and ahead of new ones', () => {
    const state = createState(
      [
        card({ id: 'b1', status: 'learning', due: today, step: 1 }),
        card({ id: 'b2', status: 'learning', due: today, step: 1, createdAt: 2, rank: 2 }),
        card({ id: 'b3', rank: 3, createdAt: 3 }),
      ],
      today,
    )
    const failed = grade(state, 'b1', 'fail', today)
    expect(failed.queue.map((item) => item.id)).toEqual(['b2', 'b1'])
    const cleared = grade(failed, 'b2', 'pass', today)
    const again = grade(cleared, 'b1', 'pass', today)
    expect(again.queue[0]?.id).toBe('b3')
    expect(again.queue.every((item) => item.phase === 'new')).toBe(true)
  })

  it('repeats the only due card until it is closed', () => {
    const state = createState([card({ id: 'b1', status: 'learning', due: today, step: 3 })], today)
    const failed = grade(state, 'b1', 'fail', today)
    expect(failed.queue).toEqual([{ id: 'b1', phase: 'due' }])
    expect(failed.cards[0]).toMatchObject({ step: null, due: today, status: 'learning' })
  })

  it('walks the ladder and keeps the ceiling at 180 days', () => {
    let state = createState([card({ id: 'b1' })], today)
    let cursor = today
    const gaps: number[] = []
    for (let index = 0; index < 8; index += 1) {
      state = grade(state, 'b1', 'pass', cursor)
      const due = state.cards[0].due ?? ''
      gaps.push(daysBetween(cursor, due))
      cursor = due
      state = withToday(state, cursor)
    }
    expect(gaps).toEqual([1, 3, 7, 14, 30, 90, 180, 180])
    expect(LADDER_DAYS[6]).toBe(180)
  })

  it('resets the ladder after a miss', () => {
    let state = createState([card({ id: 'b1' })], today)
    state = grade(state, 'b1', 'pass', today)
    const due = state.cards[0].due ?? today
    state = withToday(state, due)
    state = grade(state, 'b1', 'fail', due)
    state = grade(state, 'b1', 'pass', due)
    expect(state.cards[0].due).toBe(addDays(due, 1))
  })

  it('takes older custom cards before the frequency list and stops at 10', () => {
    const built = Array.from({ length: 12 }, (_, index) =>
      card({ id: `b${index + 1}`, rank: index + 1, createdAt: index + 1 }),
    )
    const older = card({ id: 'c1', source: 'custom', rank: null, createdAt: 10, ru: 'старше', en: 'older' })
    const newer = card({ id: 'c2', source: 'custom', rank: null, createdAt: 20, ru: 'новее', en: 'newer' })
    const state = createState([newer, ...built, older], today)
    expect(state.queue).toHaveLength(10)
    expect(state.queue.map((item) => item.id).slice(0, 2)).toEqual(['c1', 'c2'])
    expect(state.queue[2]?.id).toBe('b1')
  })

  it('does not offer new cards while a due card is still open', () => {
    const state = createState(
      [card({ id: 'b1' }), card({ id: 'b2', status: 'learning', due: '2026-11-01', step: 0, createdAt: 2, rank: 2 })],
      today,
    )
    expect(state.queue).toEqual([{ id: 'b2', phase: 'due' }])
  })

  it('spends a new slot on the first answer, including already known', () => {
    const state = createState([card({ id: 'b1' }), card({ id: 'b2', rank: 2, createdAt: 2 })], today)
    const known = grade(state, 'b1', 'known', today)
    expect(known.newAnswers.count).toBe(1)
    expect(known.cards[0].status).toBe('known')
    const failed = grade(known, 'b2', 'fail', today)
    expect(failed.newAnswers.count).toBe(2)
    expect(failed.cards.find((item) => item.id === 'b2')?.status).toBe('learning')
  })

  it('puts an unfinished new card into tomorrow’s due queue without a second new slot', () => {
    const started = createState([card({ id: 'b1' })], today)
    const failed = grade(started, 'b1', 'fail', today)
    const tomorrow = withToday(failed, '2026-11-21')
    expect(tomorrow.queue[0]).toEqual({ id: 'b1', phase: 'due' })
    expect(tomorrow.newAnswers.count).toBe(0)
    expect(tomorrow.cards[0].status).toBe('learning')
  })

  it('returns a known card as the next one and does not spend a new slot', () => {
    const started = createState([card({ id: 'b1' }), card({ id: 'b2', rank: 2, createdAt: 2 })], today)
    const known = grade(started, 'b1', 'known', today)
    const returned = restore(known, 'b1', today)
    expect(returned.newAnswers.count).toBe(1)
    expect(returned.queue[0]?.id).toBe('b2')
    expect(returned.queue[1]).toEqual({ id: 'b1', phase: 'due' })
    const passed = grade(returned, 'b2', 'pass', today)
    const again = grade(passed, 'b1', 'pass', today)
    expect(again.cards.find((item) => item.id === 'b1')?.due).toBe(addDays(today, 1))
  })

  it('restores the previous card, queue, and new-slot count', () => {
    const started = createState([card({ id: 'b1' })], today)
    const passed = grade(started, 'b1', 'pass', today)
    const restored = undo(passed)
    expect(restored.cards[0]).toMatchObject({ status: 'new', step: null, due: null })
    expect(restored.queue.map((item) => item.id)).toEqual(['b1'])
    expect(restored.newAnswers.count).toBe(0)
    expect(restored.undo).toBeNull()
  })

  it('keeps the schedule when the text changes and removes a deleted custom card', () => {
    let state = createState([card({ id: 'b1', ru: 'яблоко', en: 'apple' })], today)
    state = grade(state, 'b1', 'pass', today)
    const due = state.cards[0].due
    state = updateCard(state, 'b1', ' яблочко ', 'pear')
    expect(state.cards[0]).toMatchObject({ ru: 'яблочко', en: 'apple', due })
    state = addCard(state, 'дом', 'house', today, 50)
    const custom = state.cards.find((item) => item.en === 'house')
    expect(custom).toBeTruthy()
    state = deleteCard(state, custom?.id ?? '', today)
    expect(state.cards.some((item) => item.en === 'house')).toBe(false)
  })

  it('puts a new custom card ahead of built-in cards that have not been answered', () => {
    const built = Array.from({ length: 12 }, (_, index) =>
      card({ id: `b${index + 1}`, rank: index + 1, createdAt: index + 1 }),
    )
    let state = createState(built, today)
    state = addCard(state, 'мост', 'bridge', today, 80)
    expect(state.queue).toHaveLength(10)
    expect(state.cards.find((item) => item.id === state.queue[0]?.id)?.en).toBe('bridge')
    expect(state.queue[1]?.id).toBe('b1')
    expect(state.queue.some((item) => item.id === 'b10')).toBe(false)
  })

  it('holds a custom card behind unfinished due cards, then places it ahead of the list', () => {
    let state = createState(
      [card({ id: 'b1' }), card({ id: 'b2', status: 'learning', due: today, step: 0, createdAt: 2, rank: 2 })],
      today,
    )
    state = addCard(state, 'мост', 'bridge', today, 80)
    expect(state.queue.map((item) => item.id)).toEqual(['b2'])
    state = grade(state, 'b2', 'pass', today)
    expect(state.queue[0]?.id).not.toBe('b1')
    expect(state.cards.find((item) => item.id === state.queue[0]?.id)?.en).toBe('bridge')
    expect(state.queue[1]?.id).toBe('b1')
  })

  it('orders the word list with newest custom cards first', () => {
    const cards = [
      card({ id: 'b2', rank: 2, createdAt: 2, ru: 'и', en: 'and' }),
      card({ id: 'c2', source: 'custom', rank: null, createdAt: 20, ru: 'мост', en: 'bridge' }),
      card({ id: 'b1', rank: 1, createdAt: 1, ru: 'яблоко', en: 'apple' }),
      card({ id: 'c1', source: 'custom', rank: null, createdAt: 10, ru: 'дом', en: 'house' }),
    ]
    expect(orderedCards(cards, '  BRI').map((item) => item.id)).toEqual(['c2'])
    expect(orderedCards(cards, '').map((item) => item.id)).toEqual(['c2', 'c1', 'b1', 'b2'])
  })
})

function daysBetween(start: string, end: string): number {
  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)
  const from = Date.UTC(sy, sm - 1, sd)
  const to = Date.UTC(ey, em - 1, ed)
  return Math.round((to - from) / 86_400_000)
}
