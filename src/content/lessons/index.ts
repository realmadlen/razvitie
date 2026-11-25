// Уроки по темам. Для готовых тем — написанные рассказы, для тем от ИИ — собранные из карточек.
import type { AiDeck } from '../../db'
import type { Lesson } from './types'
import { HISTORY_LESSONS_A } from './history-a'
import { HISTORY_LESSONS_B } from './history-b'
import { HISTORY_LESSONS_C } from './history-c'
import { SCIENCE_LESSONS } from './science'
import { BIAS_LESSONS } from './biases'
import { COUNTRY_LESSONS_A } from './countries-a'
import { COUNTRY_LESSONS_B } from './countries-b'

export type { Lesson, LessonPage } from './types'

const BUILTIN: Record<string, Lesson[]> = {
  countries: [...COUNTRY_LESSONS_A, ...COUNTRY_LESSONS_B],
  'russia-history': [...HISTORY_LESSONS_A, ...HISTORY_LESSONS_B, ...HISTORY_LESSONS_C],
  'science-basics': SCIENCE_LESSONS,
  biases: BIAS_LESSONS,
}

function deckLessons(deck: AiDeck): Lesson[] {
  const out: Lesson[] = []
  for (let i = 0; i < deck.items.length; i += 5) {
    const items = deck.items.slice(i, i + 5)
    out.push({
      id: `${deck.topicId}--${i / 5 + 1}`,
      topicId: deck.topicId,
      title: `Часть ${i / 5 + 1}`,
      teaser: items[0].q,
      itemIds: items.map((it) => it.id),
      pages: items.map((it) => ({
        itemId: it.id,
        title: it.q,
        text: [`**${it.a}**`, it.explain].filter(Boolean).join('\n\n'),
      })),
    })
  }
  return out
}

export function getLessons(topicId: string, decks: AiDeck[]): Lesson[] {
  if (BUILTIN[topicId]) return BUILTIN[topicId]
  const d = decks.find((x) => x.topicId === topicId)
  return d ? deckLessons(d) : []
}

export function findLesson(lessonId: string, topicId: string, decks: AiDeck[]): Lesson | undefined {
  return getLessons(topicId, decks).find((l) => l.id === lessonId)
}

export type LessonStatus = 'done' | 'started' | 'new'

/** Урок пройден, когда все его элементы уже изучены (по ним есть карточки) */
export function lessonStatus(lesson: Lesson, introduced: Set<string>): LessonStatus {
  const n = lesson.itemIds.filter((id) => introduced.has(id)).length
  return n === lesson.itemIds.length ? 'done' : n > 0 ? 'started' : 'new'
}

export function nextLesson(topicId: string, decks: AiDeck[], introduced: Set<string>): Lesson | undefined {
  return getLessons(topicId, decks).find((l) => lessonStatus(l, introduced) !== 'done')
}
