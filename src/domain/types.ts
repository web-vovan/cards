export type CardStatus = 'new' | 'learning' | 'known'
export type CardSource = 'built-in' | 'custom'
export type QueuePhase = 'due' | 'new'
export type Grade = 'fail' | 'pass' | 'known'

export interface Card {
  id: string
  ru: string
  en: string
  source: CardSource
  rank: number | null
  createdAt: number
  status: CardStatus
  /** Индекс лестницы после «Помню». null, пока успешного ответа не было. */
  step: number | null
  /** Местная дата повтора. null у новых и у «знаю». */
  due: string | null
}

export interface QueueItem {
  id: string
  phase: QueuePhase
}

export interface DayCount {
  date: string
  count: number
}

export interface UndoSnapshot {
  card: Card
  queue: QueueItem[]
  newAnswers: DayCount
}

export interface StudyState {
  version: 1
  cards: Card[]
  queue: QueueItem[]
  queueDate: string
  newAnswers: DayCount
  undo: UndoSnapshot | null
}
