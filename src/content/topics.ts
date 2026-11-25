// Реестр тем: как каждая тема знакомит с новым и задаёт вопросы.
import type { CardRow, AiDeck } from '../db'
import { COUNTRIES, COUNTRY_BY_ID, REGION_NAMES, formatArea } from './countries'
import { HISTORY, HISTORY_BY_ID, eventYears } from './history'
import { BIASES, BIAS_BY_ID } from './biases'
import { TOPIC_BY_ID } from './catalog'

export interface Fact { label: string; value: string }

export interface Intro {
  topicId: string
  itemId: string
  title: string
  subtitle?: string
  facts: Fact[]
  body?: string
  mnemonic?: string
  mapId?: string
}

interface QBase { topicId: string; itemId: string; mnemonic?: string; explain: string; mapId?: string; label: string }
export type Question =
  | (QBase & { type: 'choice'; prompt: string; options: string[]; correct: number })
  | (QBase & { type: 'typed'; prompt: string; answers: string[]; display: string; inputMode?: 'text' | 'numeric' })
  | (QBase & { type: 'map'; prompt: string; targetId: string })

export interface OrderTask { topicId: string; prompt: string; items: { label: string; sub: string; key: number }[] }

export interface TopicModule {
  id: string
  unit: string // как называть элемент: «страна», «событие»
  itemIds(): string[]
  kinds(itemId: string): string[]
  itemTitle(itemId: string): string
  itemSub(itemId: string): string
  intro(itemId: string, mnemonic?: string): Intro
  question(card: CardRow, mnemonic?: string): Question
  order?(introduced: string[]): OrderTask | null
}

const shuffle = <T,>(xs: T[]): T[] => {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

function choices<T>(correct: T, pool: T[], n = 4, key: (x: T) => string = String): { options: T[]; correct: number } {
  const others = shuffle(pool.filter((p) => key(p) !== key(correct))).slice(0, n - 1)
  const options = shuffle([correct, ...others])
  return { options, correct: options.findIndex((o) => key(o) === key(correct)) }
}

/** Карточка считается «на узнавание», пока её не ответили верно хотя бы дважды */
// state 2 = Review (карточка уже «выпущена» из изучения)
const recognitionPhase = (c: CardRow) => c.state !== 2 || c.reps < 2 || (c.lapses > 0 && c.reps < c.lapses + 3)

// ——— Страны ———

const countries: TopicModule = {
  id: 'countries',
  unit: 'страна',
  itemIds: () => COUNTRIES.map((c) => c.id),
  kinds: () => ['capital', 'map', 'reverse'],
  itemTitle: (id) => COUNTRY_BY_ID.get(id)!.name,
  itemSub: (id) => { const c = COUNTRY_BY_ID.get(id)!; return `№ ${c.rank} · ${c.capital}` },
  intro(id, mn) {
    const c = COUNTRY_BY_ID.get(id)!
    return {
      topicId: 'countries', itemId: id, title: c.name, subtitle: `№ ${c.rank} по площади`, mapId: id,
      facts: [{ label: 'Столица', value: c.capital }, { label: 'Площадь', value: formatArea(c.area) }, { label: 'Часть света', value: REGION_NAMES[c.region] }],
      body: c.note, mnemonic: mn ?? c.mnemonic,
    }
  },
  question(card, mn) {
    const c = COUNTRY_BY_ID.get(card.itemId)!
    const mnemonic = mn ?? c.mnemonic
    const explain = `${c.name} — столица ${c.capital}. № ${c.rank} по площади, ${formatArea(c.area)}.`
    const base = { topicId: 'countries', itemId: c.id, mnemonic, explain, mapId: c.id, label: 'Страны и столицы' }
    const sameRegion = COUNTRIES.filter((x) => x.region === c.region)
    const pool = sameRegion.length >= 6 ? sameRegion : COUNTRIES
    if (card.kind === 'map') return { ...base, type: 'map', prompt: `Где находится ${c.name}?`, targetId: c.id }
    if (card.kind === 'reverse') {
      const ch = choices(c, pool, 4, (x) => x.id)
      return { ...base, type: 'choice', prompt: `${c.capital} — столица какой страны?`, options: ch.options.map((x) => x.name), correct: ch.correct }
    }
    if (recognitionPhase(card)) {
      const ch = choices(c, pool, 4, (x) => x.id)
      return { ...base, type: 'choice', prompt: `Столица страны ${c.name}?`, options: ch.options.map((x) => x.capital), correct: ch.correct }
    }
    return { ...base, type: 'typed', prompt: `Столица страны ${c.name}?`, answers: [c.capital, ...(c.capitalAlt ?? [])], display: c.capital }
  },
  order(introduced) {
    if (introduced.length < 4) return null
    const pickd = shuffle(introduced).slice(0, 4).map((id) => COUNTRY_BY_ID.get(id)!)
    return { topicId: 'countries', prompt: 'Расставьте по площади, от большей к меньшей', items: shuffle(pickd).map((c) => ({ label: c.name, sub: formatArea(c.area), key: -c.area })) }
  },
}

// ——— История России ———

const history: TopicModule = {
  id: 'russia-history',
  unit: 'событие',
  itemIds: () => HISTORY.map((e) => e.id),
  kinds: () => ['year'],
  itemTitle: (id) => HISTORY_BY_ID.get(id)!.title,
  itemSub: (id) => { const e = HISTORY_BY_ID.get(id)!; return `${eventYears(e)} · ${e.era}` },
  intro(id, mn) {
    const e = HISTORY_BY_ID.get(id)!
    return { topicId: 'russia-history', itemId: id, title: e.title, subtitle: e.era, facts: [{ label: 'Год', value: eventYears(e) }], body: e.detail, mnemonic: mn ?? e.mnemonic }
  },
  question(card, mn) {
    const e = HISTORY_BY_ID.get(card.itemId)!
    const base = { topicId: 'russia-history', itemId: e.id, mnemonic: mn ?? e.mnemonic, explain: `${eventYears(e)} — ${e.title}. ${e.detail}`, label: 'История России' }
    if (recognitionPhase(card)) {
      const near = new Set<number>([e.year])
      const deltas = shuffle([-40, -25, -12, -7, -3, 3, 8, 15, 22, 35, 50])
      for (const d of deltas) { if (near.size >= 4) break; const y = e.year + d; if (y > 800 && y < 2010) near.add(y) }
      const options = shuffle([...near].map(String))
      return { ...base, type: 'choice', prompt: `В каком году: ${e.title}?`, options, correct: options.indexOf(String(e.year)) }
    }
    return { ...base, type: 'typed', prompt: `В каком году: ${e.title}?`, answers: [String(e.year)], display: eventYears(e), inputMode: 'numeric' }
  },
  order(introduced) {
    if (introduced.length < 4) return null
    const pickd = shuffle(introduced).slice(0, 4).map((id) => HISTORY_BY_ID.get(id)!)
    return { topicId: 'russia-history', prompt: 'Расставьте события по порядку, от раннего к позднему', items: shuffle(pickd).map((e) => ({ label: e.title, sub: e.era, key: e.year })) }
  },
}

// ——— Когнитивные искажения ———

const biases: TopicModule = {
  id: 'biases',
  unit: 'искажение',
  itemIds: () => BIASES.map((b) => b.id),
  kinds: () => ['def', 'case'],
  itemTitle: (id) => BIAS_BY_ID.get(id)!.name,
  itemSub: (id) => BIAS_BY_ID.get(id)!.definition,
  intro(id, mn) {
    const b = BIAS_BY_ID.get(id)!
    return { topicId: 'biases', itemId: id, title: b.name, facts: [{ label: 'Пример', value: b.example }, { label: 'Как себя проверить', value: b.tip }], body: b.definition, mnemonic: mn ?? b.mnemonic }
  },
  question(card, mn) {
    const b = BIAS_BY_ID.get(card.itemId)!
    const ch = choices(b, BIASES, 4, (x) => x.id)
    const base = { topicId: 'biases', itemId: b.id, mnemonic: mn ?? b.mnemonic, explain: `${b.name}: ${b.definition.charAt(0).toLowerCase()}${b.definition.slice(1)}`, label: 'Когнитивные искажения' }
    const prompt = card.kind === 'def' ? b.definition : `Какое искажение здесь работает? ${b.example}`
    return { ...base, type: 'choice', prompt, options: ch.options.map((x) => x.name), correct: ch.correct }
  },
}

// ——— Темы, созданные ИИ ———

export function deckModule(deck: AiDeck): TopicModule {
  const byId = new Map(deck.items.map((i) => [i.id, i]))
  return {
    id: deck.topicId,
    unit: 'вопрос',
    itemIds: () => deck.items.map((i) => i.id),
    kinds: () => ['qa'],
    itemTitle: (id) => byId.get(id)?.q ?? '',
    itemSub: (id) => byId.get(id)?.a ?? '',
    intro(id, mn) {
      const it = byId.get(id)!
      return { topicId: deck.topicId, itemId: id, title: it.a, subtitle: it.q, facts: [], body: it.explain, mnemonic: mn ?? it.mnemonic }
    },
    question(card, mn) {
      const it = byId.get(card.itemId)!
      const options = shuffle([it.a, ...it.wrong.slice(0, 3)])
      return { type: 'choice', topicId: deck.topicId, itemId: it.id, label: deck.title, prompt: it.q, options, correct: options.indexOf(it.a), mnemonic: mn ?? it.mnemonic, explain: it.explain ? `${it.a}. ${it.explain}` : it.a }
    },
  }
}

const BUILTIN: Record<string, TopicModule> = { countries, 'russia-history': history, biases }

export function getModule(topicId: string, decks: AiDeck[]): TopicModule | null {
  if (BUILTIN[topicId]) return BUILTIN[topicId]
  const d = decks.find((x) => x.topicId === topicId)
  return d ? deckModule(d) : null
}

export function topicTitle(topicId: string, decks: AiDeck[] = []): string {
  return TOPIC_BY_ID.get(topicId)?.title ?? decks.find((d) => d.topicId === topicId)?.title ?? topicId
}

// ——— Проверка ответа ———

export function normalize(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/g, '')
}

function lev(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length][b.length]
}

/** 'exact' — верно, 'typo' — верно с опечаткой, 'wrong' — неверно */
export function checkTyped(input: string, answers: string[]): 'exact' | 'typo' | 'wrong' {
  const n = normalize(input)
  if (!n) return 'wrong'
  for (const a of answers) if (normalize(a) === n) return 'exact'
  for (const a of answers) { const na = normalize(a); if (na.length >= 5 && !/^\d+$/.test(na) && lev(na, n) <= 1) return 'typo' }
  return 'wrong'
}
