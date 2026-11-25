// Серия дней, активность и сводки для экрана прогресса.
import { db, dayKey, addDays, type DayRow } from './db'
import { State } from './srs'
import { maturity } from './srs'

/** День засчитывается, если занятие завершено или было хотя бы 5 минут практики */
export const isActive = (d?: DayRow) => !!d && (d.completed || d.seconds >= 300)

/** Пропусков без потери серии в календарном месяце */
export const FREEZES_PER_MONTH = 2

export interface Streak { current: number; best: number; frozen: Set<string>; activeToday: boolean }

export function computeStreak(days: DayRow[], today = dayKey()): Streak {
  const byDay = new Map(days.map((d) => [d.day, d]))
  const activeToday = isActive(byDay.get(today))
  const frozen = new Set<string>()
  const used = new Map<string, number>()
  let current = 0
  let cur = activeToday ? today : addDays(today, -1)
  for (let guard = 0; guard < 2000; guard++) {
    if (isActive(byDay.get(cur))) { current++; cur = addDays(cur, -1); continue }
    const m = cur.slice(0, 7)
    const prev = addDays(cur, -1)
    if ((used.get(m) ?? 0) < FREEZES_PER_MONTH && isActive(byDay.get(prev)) && current > 0) {
      used.set(m, (used.get(m) ?? 0) + 1); frozen.add(cur); cur = prev; continue
    }
    break
  }
  // лучшая серия — простым проходом по истории
  const sorted = [...days].filter(isActive).map((d) => d.day).sort()
  let best = 0, run = 0, last = ''
  for (const d of sorted) { run = last && addDays(last, 1) === d ? run + 1 : 1; best = Math.max(best, run); last = d }
  return { current, best: Math.max(best, current), frozen, activeToday }
}

export interface TopicProgress { topicId: string; total: number; new: number; learning: number; young: number; mature: number; introduced: number; leeches: number }

export async function topicProgress(topicId: string, totalItems: number): Promise<TopicProgress> {
  const cards = await db.cards.where('topicId').equals(topicId).toArray()
  // элемент считается по самой слабой из его карточек
  const order = { new: 0, learning: 1, young: 2, mature: 3 } as const
  const items = new Map<string, keyof typeof order>()
  let leeches = 0
  for (const c of cards) {
    const m = maturity(c)
    const prev = items.get(c.itemId)
    if (!prev || order[m] < order[prev]) items.set(c.itemId, m)
    if (c.lapses >= 3) leeches++
  }
  const res: TopicProgress = { topicId, total: totalItems, new: 0, learning: 0, young: 0, mature: 0, introduced: items.size, leeches }
  for (const m of items.values()) res[m]++
  res.new = totalItems - items.size + res.new
  return res
}

/** Сколько карточек придёт на повторение в ближайшие дни */
export async function forecast(daysAhead = 7): Promise<number[]> {
  const out = Array(daysAhead).fill(0)
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end = start.getTime() + daysAhead * 864e5
  await db.cards.where('due').below(end).each((c) => {
    if (c.state === State.New) return
    const i = Math.max(0, Math.floor((c.due - start.getTime()) / 864e5))
    if (i < daysAhead) out[i]++
  })
  return out
}
