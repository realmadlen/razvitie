import Dexie, { type EntityTable } from 'dexie'

/** Состояние карточки в интервальном повторении (поля FSRS, даты — в мс) */
export interface CardRow {
  id: string // `${topicId}|${itemId}|${kind}`
  topicId: string
  itemId: string
  kind: string
  due: number
  stability: number
  difficulty: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number
  last_review?: number
  createdAt: number
}

export interface ReviewRow {
  id?: number
  cardId: string
  topicId: string
  ts: number
  day: string
  rating: number
  correct: boolean
  ms: number
}

export interface DayRow {
  day: string // YYYY-MM-DD
  seconds: number
  answered: number
  correct: number
  newItems: number
  warmupCorrect: number
  warmupTotal: number
  /** Индекс памяти в конце дня, 0..1 */
  retention?: number
  completed: boolean
}

export interface KV {
  key: string
  value: unknown
}

export interface AiDeckItem {
  id: string
  q: string
  a: string
  wrong: string[]
  mnemonic?: string
  explain?: string
}

export interface AiDeck {
  topicId: string
  title: string
  items: AiDeckItem[]
  createdAt: number
}

export const db = new Dexie('razvitie') as Dexie & {
  cards: EntityTable<CardRow, 'id'>
  reviews: EntityTable<ReviewRow, 'id'>
  days: EntityTable<DayRow, 'day'>
  kv: EntityTable<KV, 'key'>
  decks: EntityTable<AiDeck, 'topicId'>
}

db.version(1).stores({
  cards: 'id, topicId, due, state',
  reviews: '++id, cardId, topicId, ts, day',
  days: 'day',
  kv: 'key',
  decks: 'topicId',
})

// ——— Настройки ———

export type ThemePref = 'system' | 'light' | 'dark'

export interface Settings {
  onboarded: boolean
  theme: ThemePref
  sessionMinutes: 15 | 30
  /** Новых элементов в день по темам */
  newPerDay: Record<string, number>
  aiKey: string
  aiModel: string
  /** План месяца: monthKey → 3 темы */
  months: Record<string, string[]>
  wishlist: string[]
  /** Свои ассоциации пользователя: itemKey → текст */
  mnemonics: Record<string, string>
  seenDiscoveries: string[]
}

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  theme: 'system',
  sessionMinutes: 15,
  newPerDay: { countries: 4, 'russia-history': 2, biases: 1 },
  aiKey: '',
  aiModel: 'claude-haiku-5-5',
  months: {},
  wishlist: [],
  mnemonics: {},
  seenDiscoveries: [],
}

export async function loadSettings(): Promise<Settings> {
  const row = await db.kv.get('settings')
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<Settings>) ?? {}) }
}

export async function saveSettings(s: Settings) {
  await db.kv.put({ key: 'settings', value: s })
}

// ——— Даты ———

export function dayKey(d = new Date()): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function monthKey(d = new Date()): string {
  return dayKey(d).slice(0, 7)
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  return dayKey(new Date(y, m - 1, d + n))
}

export async function bumpDay(patch: Partial<Omit<DayRow, 'day'>> & { addSeconds?: number }) {
  const day = dayKey()
  await db.transaction('rw', db.days, async () => {
    const cur = (await db.days.get(day)) ?? { day, seconds: 0, answered: 0, correct: 0, newItems: 0, warmupCorrect: 0, warmupTotal: 0, completed: false }
    const { addSeconds, ...rest } = patch
    const next: DayRow = { ...cur }
    if (addSeconds) next.seconds += addSeconds
    for (const [k, v] of Object.entries(rest)) {
      const key = k as keyof DayRow
      if (typeof v === 'number' && typeof cur[key] === 'number' && key !== 'retention') (next[key] as number) = (cur[key] as number) + v
      else (next as unknown as Record<string, unknown>)[key] = v
    }
    await db.days.put(next)
  })
}

// ——— Резервная копия ———

export async function exportAll(): Promise<string> {
  const [cards, reviews, days, kv, decks] = await Promise.all([db.cards.toArray(), db.reviews.toArray(), db.days.toArray(), db.kv.toArray(), db.decks.toArray()])
  const safeKv = kv.map((r) => (r.key === 'settings' ? { ...r, value: { ...(r.value as Settings), aiKey: '' } } : r))
  return JSON.stringify({ app: 'razvitie', version: 1, exportedAt: new Date().toISOString(), cards, reviews, days, kv: safeKv, decks })
}

export async function importAll(json: string) {
  const data = JSON.parse(json)
  if (data.app !== 'razvitie') throw new Error('Это не резервная копия приложения.')
  const current = await loadSettings()
  await db.transaction('rw', [db.cards, db.reviews, db.days, db.kv, db.decks], async () => {
    await Promise.all([db.cards.clear(), db.reviews.clear(), db.days.clear(), db.kv.clear(), db.decks.clear()])
    await db.cards.bulkPut(data.cards ?? [])
    await db.reviews.bulkPut(data.reviews ?? [])
    await db.days.bulkPut(data.days ?? [])
    await db.kv.bulkPut(data.kv ?? [])
    await db.decks.bulkPut(data.decks ?? [])
  })
  // ключ ИИ не попадает в копию — сохраняем текущий
  const s = await loadSettings()
  await saveSettings({ ...s, aiKey: current.aiKey })
}

export async function resetAll() {
  await Promise.all([db.cards.clear(), db.reviews.clear(), db.days.clear(), db.kv.clear(), db.decks.clear()])
}
