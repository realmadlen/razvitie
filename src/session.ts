// Сборка ежедневного занятия: повторение → новое → упорядочивание → открытие дня.
import { db, monthKey, type CardRow, type Settings, type AiDeck } from './db'
import { getModule, type OrderTask } from './content/topics'
import { nextLesson, type Lesson } from './content/lessons'
import { DISCOVERIES, type Discovery } from './content/catalog'
import { retrievability } from './srs'

export type Step =
  | { t: 'review'; cardId: string; isNew?: boolean }
  | { t: 'lesson'; topicId: string; lessonId: string; reread?: boolean }
  | { t: 'quiz-start'; title: string }
  | { t: 'order'; task: OrderTask }
  | { t: 'discovery'; d: Discovery }

export interface PlannedLesson { topicId: string; lessonId: string; title: string }

export interface Plan {
  steps: Step[]
  reviewCount: number
  newCount: number
  lessons: PlannedLesson[]
  estMinutes: number
}

const SEC = { review: 11, page: 35, quiz: 12, order: 35, discovery: 20 }

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
  const overloaded = due.length > reviewCap

  // Новое — уроками: сначала рассказ, потом проверка по нему. Темы чередуем по дням.
  const topics = monthTopics(s)
  const introduced = await introducedByTopic()
  const dayNo = Math.floor(Date.now() / 86400000)
  const rotated = topics.map((_, i) => topics[(i + dayNo) % topics.length])
  const lessons: Lesson[] = []
  for (const topicId of rotated) {
    const l = nextLesson(topicId, decks, introduced.get(topicId) ?? new Set())
    if (!l) continue
    const cost = lessonCost(l)
    const fits = used + cost <= budget * 1.15
    if (fits || (!lessons.length && !overloaded && !opts.extra)) { lessons.push(l); used += cost }
  }

  const revSteps: Step[] = reviews.map((r) => ({ t: 'review', cardId: r.id }))
  // Повторения — до уроков (разогрев памяти), часть оставляем между уроками
  const head = lessons.length > 1 ? Math.ceil(revSteps.length * 0.6) : revSteps.length
  steps.push(...revSteps.slice(0, head))
  lessons.forEach((l, i) => {
    steps.push(...lessonSteps(l, decks))
    if (i === 0) steps.push(...revSteps.slice(head))
  })
  if (!lessons.length) steps.push(...revSteps.slice(head))

  // Упорядочивание — одна задача по теме, где уже есть что сравнивать
  if (!opts.extra) {
    for (const topicId of shuffle(topics).slice(0, 1)) {
      const mod = getModule(topicId, decks)
      const have = [...(introduced.get(topicId) ?? []), ...lessons.filter((l) => l.topicId === topicId).flatMap((l) => l.itemIds)]
      const task = mod?.order?.(have)
      if (task) { steps.push({ t: 'order', task }); used += SEC.order }
    }
    const d = pickDiscovery(s, topics)
    if (d) { steps.push({ t: 'discovery', d }); used += SEC.discovery }
  }

  const newCount = lessons.reduce((a, l) => a + l.itemIds.filter((id) => !introduced.get(l.topicId)?.has(id)).length, 0)
  return { steps, reviewCount: reviews.length, newCount, lessons: lessons.map((l) => ({ topicId: l.topicId, lessonId: l.id, title: l.title })), estMinutes: Math.max(1, Math.round(used / 60)) }
}

export function pickDiscovery(s: Settings, topics: string[]): Discovery | null {
  const pool = DISCOVERIES.filter((d) => !topics.includes(d.topicId) && !s.seenDiscoveries.includes(d.id))
  const list = pool.length ? pool : DISCOVERIES.filter((d) => !topics.includes(d.topicId))
  return list.length ? list[Math.floor(Math.random() * list.length)] : null
}

function lessonCost(l: Lesson) {
  return l.pages.length * SEC.page + l.itemIds.length * SEC.quiz + 30
}

/** Урок и сразу проверка по нему: по одному вопросу на каждый новый элемент */
export function lessonSteps(l: Lesson, decks: AiDeck[], reread = false): Step[] {
  const steps: Step[] = [{ t: 'lesson', topicId: l.topicId, lessonId: l.id, reread }]
  if (reread) return steps
  const mod = getModule(l.topicId, decks)
  if (!mod) return steps
  steps.push({ t: 'quiz-start', title: l.title })
  for (const itemId of shuffle(l.itemIds)) {
    const [first] = mod.kinds(itemId)
    steps.push({ t: 'review', cardId: `${l.topicId}|${itemId}|${first}`, isNew: true })
  }
  return steps
}

/** Отдельное занятие из одного урока — когда урок открыт из темы */
export function lessonPlan(l: Lesson, decks: AiDeck[], reread = false): Plan {
  const steps = lessonSteps(l, decks, reread)
  return { steps, reviewCount: 0, newCount: reread ? 0 : l.itemIds.length, lessons: [{ topicId: l.topicId, lessonId: l.id, title: l.title }], estMinutes: Math.max(1, Math.round(lessonCost(l) / 60)) }
}
