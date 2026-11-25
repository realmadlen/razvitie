import { FSRS, generatorParameters, createEmptyCard, Rating, State, type Card, type Grade } from 'ts-fsrs'
import { db, dayKey, bumpDay, type CardRow } from './db'

// Целевая вероятность вспомнить — 90%. Максимальный интервал — 3 года.
const scheduler = new FSRS(generatorParameters({ request_retention: 0.9, maximum_interval: 1095, enable_fuzz: true }))

export { Rating, State }

export function toFsrs(r: CardRow): Card {
  return {
    due: new Date(r.due),
    stability: r.stability,
    difficulty: r.difficulty,
    scheduled_days: r.scheduled_days,
    learning_steps: r.learning_steps,
    reps: r.reps,
    lapses: r.lapses,
    state: r.state as State,
    last_review: r.last_review ? new Date(r.last_review) : undefined,
  }
}

export function cardId(topicId: string, itemId: string, kind: string) {
  return `${topicId}|${itemId}|${kind}`
}

export function newCardRow(topicId: string, itemId: string, kind: string, now = new Date()): CardRow {
  const c = createEmptyCard(now)
  return {
    id: cardId(topicId, itemId, kind), topicId, itemId, kind,
    due: c.due.getTime(), stability: c.stability, difficulty: c.difficulty, scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps, reps: c.reps, lapses: c.lapses, state: c.state, createdAt: now.getTime(),
  }
}

/** Записать ответ: пересчитать расписание и сохранить историю */
export async function review(row: CardRow, grade: Grade, correct: boolean, ms: number): Promise<CardRow> {
  const now = new Date()
  const { card } = scheduler.next(toFsrs(row), now, grade)
  const next: CardRow = {
    ...row,
    due: card.due.getTime(), stability: card.stability, difficulty: card.difficulty, scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps, reps: card.reps, lapses: card.lapses, state: card.state,
    last_review: now.getTime(),
  }
  await db.cards.put(next)
  await db.reviews.add({ cardId: row.id, topicId: row.topicId, ts: now.getTime(), day: dayKey(now), rating: grade, correct, ms })
  await bumpDay({ answered: 1, correct: correct ? 1 : 0 })
  return next
}

/** Вероятность вспомнить карточку сейчас (0..1) */
export function retrievability(row: CardRow, now = new Date()): number {
  if (row.state === State.New) return 0
  return scheduler.retrievability(toFsrs(row), now) as number
}

/** Оценка по ответу: ошибка → «снова», с подсказкой → «трудно», верно → «хорошо», быстро и набором → «легко» */
export function gradeFrom(correct: boolean, usedHint: boolean, ms: number, typed: boolean): Grade {
  if (!correct) return Rating.Again
  if (usedHint) return Rating.Hard
  if (typed && ms < 5000) return Rating.Easy
  return Rating.Good
}

export type Maturity = 'new' | 'learning' | 'young' | 'mature'

/** «Усвоено надолго» — интервал от 21 дня, как в классических системах повторения */
export function maturity(row: CardRow | undefined): Maturity {
  if (!row || row.state === State.New) return 'new'
  if (row.state === State.Learning || row.state === State.Relearning) return 'learning'
  return row.stability >= 21 ? 'mature' : 'young'
}

export async function memoryIndex(): Promise<{ value: number; count: number }> {
  const rows = await db.cards.where('state').above(State.New).toArray()
  if (!rows.length) return { value: 0, count: 0 }
  const now = new Date()
  const sum = rows.reduce((s, r) => s + retrievability(r, now), 0)
  return { value: sum / rows.length, count: rows.length }
}
