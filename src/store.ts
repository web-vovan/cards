import { reactive } from 'vue'
import { builtInWords } from './data/words'
import { localToday } from './domain/dates'
import {
  addCard,
  createState,
  deleteCard,
  grade,
  restore,
  undo,
  updateCard,
  withToday,
} from './domain/study'
import type { Card, Grade, StudyState } from './domain/types'

const STORAGE_KEY = 'kartochki-v1'

export const study = reactive<StudyState>(load())

export function answer(kind: Grade) {
  const today = localToday()
  if (study.queueDate !== today) {
    commit(withToday(study, today))
    return
  }
  const id = study.queue[0]?.id
  if (!id) return
  commit(grade(study, id, kind, today))
}

export function undoLast() {
  commit(undo(study))
}

export function addCustom(ru: string, en: string) {
  commit(addCard(study, ru, en, localToday()))
}

export function editCard(id: string, ru: string, en: string) {
  commit(updateCard(study, id, ru, en))
}

export function removeCard(id: string) {
  commit(deleteCard(study, id, localToday()))
}

export function returnToStudy(id: string) {
  commit(restore(study, id, localToday()))
}

export function refreshDay() {
  commit(withToday(study, localToday()))
}

function commit(next: StudyState) {
  study.version = next.version
  study.cards = next.cards
  study.queue = next.queue
  study.queueDate = next.queueDate
  study.newAnswers = next.newAnswers
  study.undo = next.undo
  persist()
}

function load(): StudyState {
  const today = localToday()
  const raw = readStorage()
  if (!raw) return fresh(today)
  try {
    const parsed = JSON.parse(raw) as StudyState
    if (!parsed || !Array.isArray(parsed.cards) || !Array.isArray(parsed.queue)) return fresh(today)
    const merged = mergeBuiltIns(parsed)
    return withToday(merged, today)
  } catch {
    return fresh(today)
  }
}

function fresh(today: string): StudyState {
  return createState(seedCards(), today)
}

function seedCards(): Card[] {
  return builtInWords.map(([en, ru], index) => ({
    id: `b${index + 1}`,
    ru,
    en,
    source: 'built-in' as const,
    rank: index + 1,
    createdAt: index + 1,
    status: 'new' as const,
    step: null,
    due: null,
  }))
}

function mergeBuiltIns(state: StudyState): StudyState {
  const ids = new Set(state.cards.map((card) => card.id))
  const missing = seedCards().filter((card) => !ids.has(card.id))
  if (missing.length === 0) return { ...state, version: 1 }
  const known = new Set(state.cards.map((card) => card.id))
  return {
    ...state,
    version: 1,
    cards: [...state.cards, ...missing],
    queue: state.queue.filter((item) => known.has(item.id)),
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(study))
  } catch {
    // Телефон может запретить запись. Сессия живёт до перезагрузки.
  }
}

function readStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshDay()
})
