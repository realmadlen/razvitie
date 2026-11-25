// Сборка ежедневного занятия: повторение → новое → упорядочивание → открытие дня.
import { db, monthKey, type CardRow, type Settings, type AiDeck } from './db'
import { getModule, type OrderTask } from './content/topics'
import { DISCOVERIES, type Discovery } from './content/catalog'
import { retrievability } from './srs'

export type Step =
  | { t: 'review'; cardId: string; isNew?: boolean }
  | { t: 'intro'; topicId: string; itemId: string }
  | { t: 'order'; task: OrderTask }
  | { t: 'discovery'; d: Discovery }

export interface Plan {
  steps: Step[]
  reviewCount: number
  newCount: number
  estMinutes: number
}

const SEC = { review: 11, intro: 25, order: 35, discovery: 20 }

const shuffle = <T,>(xs: T[]): T[] => [...xs].sort(() => Math.random() - 0.5)

export function monthTopics(s: Settings): string[] {
  return s.months[monthKey()] ?? []
}

export async function introducedByTopic(): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>()
  await db.cards.each((c) => { if (!map.has(c.topicId)) map.set(c.topicId, new Set()); map.get(c.topicId)!.add(c.itemId) })
  return map
}

export async function dueCards(now = Date.now()): Promise<CardRow[]> {
  const rows = await db.cards.where('due').belowOrEqual(now).toArray()
  const d = new Date(now)
  // самые «забываемые» — первыми
  return rows.sort((a, b) => retrievability(a, d) - retrievability(b, d))
}

export async function buildPlan(s: Settings, decks: AiDeck[], opts: { minutes?: number; extra?: boolean } = {}): Promise<Plan> {
  const minutes = opts.minutes ?? s.sessionMinutes
  const budget = minutes * 60
  const steps: Step[] = []
  let used = 0

  const due = await dueCards()
  const reviewCap = Math.max(5, Math.floor((budget * 0.55) / SEC.review))
  const reviews = due.slice(0, reviewCap)
  used += reviews.length * SEC.review

  // Новое — только из тем текущего месяца
  const topics = monthTopics(s)
  const introduced = await introducedByTopic()
  const scale = minutes >= 30 ? 1.75 : opts.extra ? 0.5 : 1
  const overloaded = due.length > reviewCap
  type NewBlock = { topicId: string; itemId: string; kinds: string[] }
  const newBlocks: NewBlock[] = []
  for (const topicId of topics) {
    const mod = getModule(topicId, decks)
    if (!mod) continue
    const have = introduced.get(topicId) ?? new Set()
    let n = Math.round((s.newPerDay[topicId] ?? 2) * scale)
    if (overloaded) n = Math.ceil(n / 2)
    const fresh = mod.itemIds().filter((id) => !have.has(id)).slice(0, Math.max(opts.extra ? 1 : 0, n))
    for (const itemId of fresh) newBlocks.push({ topicId, itemId, kinds: mod.kinds(itemId) })
  }
  // не выходить за бюджет
  while (newBlocks.length && used + newBlocks.reduce((a, b) => a + SEC.intro + b.kinds.length * SEC.review, 0) > budget * 1.1) newBlocks.pop()

  // Чередуем: порция повторений, затем новый элемент с проверкой сразу и остальными видами позже
  const deferred: Step[] = []
  const revSteps: Step[] = reviews.map((r) => ({ t: 'review', cardId: r.id }))
  const chunk = Math.max(2, Math.ceil(revSteps.length / (newBlocks.length + 1)))
  const mixed: Step[] = []
  let ri = 0
  const blocks = shuffle(newBlocks)
  for (const b of blocks) {
    mixed.push(...revSteps.slice(ri, ri + chunk)); ri += chunk
    mixed.push({ t: 'intro', topicId: b.topicId, itemId: b.itemId })
    const [first, ...rest] = b.kinds
    mixed.push({ t: 'review', cardId: `${b.topicId}|${b.itemId}|${first}`, isNew: true })
    for (const k of rest) deferred.push({ t: 'review', cardId: `${b.topicId}|${b.itemId}|${k}`, isNew: true })
  }
  mixed.push(...revSteps.slice(ri))
  // отложенные проверки разбрасываем по второй половине
  for (const d of shuffle(deferred)) {
    const lo = Math.floor(mixed.length / 2)
    mixed.splice(lo + Math.floor(Math.random() * (mixed.length - lo + 1)), 0, d)
  }
  steps.push(...mixed)
  used += newBlocks.reduce((a, b) => a + SEC.intro + b.kinds.length * SEC.review, 0)

  // Упорядочивание — одна задача по теме, где уже есть что сравнивать
  if (!opts.extra) {
    for (const topicId of shuffle(topics).slice(0, 1)) {
      const mod = getModule(topicId, decks)
      const have = [...(introduced.get(topicId) ?? []), ...newBlocks.filter((b) => b.topicId === topicId).map((b) => b.itemId)]
      const task = mod?.order?.(have)
      if (task) { steps.push({ t: 'order', task }); used += SEC.order }
    }
    const d = pickDiscovery(s, topics)
    if (d) { steps.push({ t: 'discovery', d }); used += SEC.discovery }
  }

  return { steps, reviewCount: reviews.length, newCount: newBlocks.length, estMinutes: Math.max(1, Math.round(used / 60)) }
}

export function pickDiscovery(s: Settings, topics: string[]): Discovery | null {
  const pool = DISCOVERIES.filter((d) => !topics.includes(d.topicId) && !s.seenDiscoveries.includes(d.id))
  const list = pool.length ? pool : DISCOVERIES.filter((d) => !topics.includes(d.topicId))
  return list.length ? list[Math.floor(Math.random() * list.length)] : null
}
