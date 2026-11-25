// История России: ключевые события и правители по порядку.
// Данные разбиты по эпохам: history-data/part-a.ts (Русь — Смута), part-b.ts (Романовы), part-c.ts (XX век — наши дни).

import { EVENTS_A, RULERS_A } from './history-data/part-a'
import { EVENTS_B, RULERS_B } from './history-data/part-b'
import { EVENTS_C, RULERS_C } from './history-data/part-c'
import type { HistoryEvent, Ruler } from './history-types'

export type { HistoryEvent, Ruler } from './history-types'

export const HISTORY: HistoryEvent[] = [...EVENTS_A, ...EVENTS_B, ...EVENTS_C].sort((a, b) => a.year - b.year)
export const HISTORY_BY_ID = new Map(HISTORY.map((e) => [e.id, e]))

export const RULERS: Ruler[] = [...RULERS_A, ...RULERS_B, ...RULERS_C].sort((a, b) => a.from - b.from)
export const RULER_BY_ID = new Map(RULERS.map((r) => [r.id, r]))

export function eventYears(e: HistoryEvent): string {
  return e.yearEnd ? `${e.year}–${e.yearEnd}` : String(e.year)
}

export function rulerYears(r: Ruler): string {
  if (!r.to) return `с ${r.from}`
  return r.from === r.to ? String(r.from) : `${r.from}–${r.to}`
}
