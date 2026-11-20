import { addDays } from './dates'
import type { Card, DayCount, Grade, QueueItem, StudyState } from './types'

export const LADDER_DAYS = [1, 3, 7, 14, 30, 90, 180] as const
export const NEW_LIMIT = 10

export function createState(cards: Card[], today: string): StudyState {
  const newAnswers = { date: today, count: 0 }
  return {
    version: 1,
    cards,
    queue: buildQueue(cards, today, 0),
    queueDate: today,
    newAnswers,
    undo: null,
  }
}

export function withToday(state: StudyState, today: string): StudyState {
  if (state.queueDate === today) return state
  const newAnswers = { date: today, count: 0 }
  return {
    ...state,
    queueDate: today,
    newAnswers,
    queue: buildQueue(state.cards, today, 0),
    undo: null,
  }
}

export function grade(state: StudyState, id: string, kind: Grade, today: string): StudyState {
  const aligned = withToday(state, today)
  if (aligned.queue[0]?.id !== id) return aligned

  const card = aligned.cards.find((item) => item.id === id)
  if (!card) return aligned

  const undo = {
    card: cloneCard(card),
    queue: aligned.queue.map((item) => ({ ...item })),
    newAnswers: { ...dayCount(aligned.newAnswers, today) },
  }

  let newAnswers = dayCount(aligned.newAnswers, today)
  if (card.status === 'new') {
    newAnswers = { date: today, count: newAnswers.count + 1 }
  }

  const rest = aligned.queue.slice(1)
  let nextCard = card
  let queue = rest

  if (kind === 'pass') {
    nextCard = passCard(card, today)
  } else if (kind === 'fail') {
    nextCard = failCard(card, today)
    queue = requeueDue(rest, id)
  } else {
    nextCard = knowCard(card)
  }

  const cards = aligned.cards.map((item) => (item.id === id ? nextCard : item))
  queue = appendNewCards(cards, queue, newAnswers.count)

  return {
    ...aligned,
    cards,
    queue,
    newAnswers,
    undo,
  }
}

export function undo(state: StudyState): StudyState {
  if (!state.undo) return state
  const { card, queue, newAnswers } = state.undo
  const cards = state.cards.some((item) => item.id === card.id)
    ? state.cards.map((item) => (item.id === card.id ? cloneCard(card) : item))
    : [...state.cards, cloneCard(card)]
  return {
    ...state,
    cards,
    queue: queue.map((item) => ({ ...item })),
    newAnswers: { ...newAnswers },
    undo: null,
  }
}

export function restore(state: StudyState, id: string, today: string): StudyState {
  const aligned = withToday(state, today)
  const card = aligned.cards.find((item) => item.id === id)
  if (!card || card.status !== 'known') return aligned

  const nextCard: Card = { ...card, status: 'learning', step: null, due: today }
  const cards = aligned.cards.map((item) => (item.id === id ? nextCard : item))
  const without = aligned.queue.filter((item) => item.id !== id)
  const item: QueueItem = { id, phase: 'due' }
  const queue = without.length === 0 ? [item] : [without[0], item, ...without.slice(1)]

  return { ...aligned, cards, queue, undo: null }
}

export function addCard(state: StudyState, ru: string, en: string, today: string, now = Date.now()): StudyState {
  const aligned = withToday(state, today)
  const russian = ru.trim()
  const english = en.trim()
  if (!russian || !english) return aligned

  const card: Card = {
    id: `c${now.toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    ru: russian,
    en: english,
    source: 'custom',
    rank: null,
    createdAt: now,
    status: 'new',
    step: null,
    due: null,
  }
  const cards = [...aligned.cards, card]
  let queue = aligned.queue

  if (!queue.some((item) => item.phase === 'due')) {
    queue = pickNew(cards, dayCount(aligned.newAnswers, today).count).map((item) => ({
      id: item.id,
      phase: 'new' as const,
    }))
  }

  return { ...aligned, cards, queue, undo: null }
}

export function updateCard(state: StudyState, id: string, ru: string, en: string): StudyState {
  const card = state.cards.find((item) => item.id === id)
  if (!card) return state
  const russian = ru.trim()
  const english = card.source === 'built-in' ? card.en : en.trim()
  if (!russian || !english) return state
  const next: Card = { ...card, ru: russian, en: english }
  return {
    ...state,
    cards: state.cards.map((item) => (item.id === id ? next : item)),
    undo: null,
  }
}

export function deleteCard(state: StudyState, id: string, today: string): StudyState {
  const aligned = withToday(state, today)
  const card = aligned.cards.find((item) => item.id === id)
  if (!card || card.source !== 'custom') return aligned
  const cards = aligned.cards.filter((item) => item.id !== id)
  const queue = appendNewCards(
    cards,
    aligned.queue.filter((item) => item.id !== id),
    dayCount(aligned.newAnswers, today).count,
  )
  return { ...aligned, cards, queue, undo: null }
}

export function counts(cards: Card[]): { fresh: number; learning: number; known: number } {
  return {
    fresh: cards.filter((card) => card.status === 'new').length,
    learning: cards.filter((card) => card.status === 'learning').length,
    known: cards.filter((card) => card.status === 'known').length,
  }
}

export function orderedCards(cards: Card[], query: string): Card[] {
  const needle = query.trim().toLocaleLowerCase()
  const filtered = needle
    ? cards.filter(
        (card) =>
          card.ru.toLocaleLowerCase().includes(needle) || card.en.toLocaleLowerCase().includes(needle),
      )
    : cards
  const custom = filtered
    .filter((card) => card.source === 'custom')
    .sort((a, b) => b.createdAt - a.createdAt)
  const built = filtered
    .filter((card) => card.source === 'built-in')
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
  return [...custom, ...built]
}

export function buildQueue(cards: Card[], today: string, newCount: number): QueueItem[] {
  const due = cards
    .filter((card) => card.status !== 'known' && card.due !== null && card.due <= today)
    .sort((a, b) => (a.due ?? '').localeCompare(b.due ?? '') || a.createdAt - b.createdAt)
    .map((card) => ({ id: card.id, phase: 'due' as const }))
  if (due.length > 0) return due
  return pickNew(cards, newCount).map((card) => ({ id: card.id, phase: 'new' as const }))
}

function passCard(card: Card, today: string): Card {
  const step = card.step === null ? 0 : Math.min(card.step + 1, LADDER_DAYS.length - 1)
  return {
    ...card,
    status: 'learning',
    step,
    due: addDays(today, LADDER_DAYS[step]),
  }
}

function failCard(card: Card, today: string): Card {
  return { ...card, status: 'learning', step: null, due: today }
}

function knowCard(card: Card): Card {
  return { ...card, status: 'known', step: null, due: null }
}

function requeueDue(queue: QueueItem[], id: string): QueueItem[] {
  const rest = queue.filter((item) => item.id !== id)
  const item: QueueItem = { id, phase: 'due' }
  const index = rest.findIndex((entry) => entry.phase === 'new')
  if (index === -1) return [...rest, item]
  return [...rest.slice(0, index), item, ...rest.slice(index)]
}

function appendNewCards(cards: Card[], queue: QueueItem[], newCount: number): QueueItem[] {
  if (queue.some((item) => item.phase === 'due')) return queue
  const queued = new Set(queue.map((item) => item.id))
  const queuedNew = queue.filter((item) => item.phase === 'new').length
  const open = NEW_LIMIT - newCount - queuedNew
  if (open <= 0) return queue
  const picked = pickNew(
    cards.filter((card) => !queued.has(card.id)),
    NEW_LIMIT - open,
  )
  return [...queue, ...picked.map((card) => ({ id: card.id, phase: 'new' as const }))]
}

function pickNew(cards: Card[], alreadyAnswered: number): Card[] {
  const slots = Math.max(0, NEW_LIMIT - alreadyAnswered)
  const fresh = cards.filter((card) => card.status === 'new')
  const custom = fresh
    .filter((card) => card.source === 'custom')
    .sort((a, b) => a.createdAt - b.createdAt)
  const built = fresh
    .filter((card) => card.source === 'built-in')
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
  return [...custom, ...built].slice(0, slots)
}

function dayCount(count: DayCount, today: string): DayCount {
  return count.date === today ? { ...count } : { date: today, count: 0 }
}

function cloneCard(card: Card): Card {
  return { ...card }
}
