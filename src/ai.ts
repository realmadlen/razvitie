// Подключение ИИ (Claude API). Работает только если в настройках указан собственный ключ.
// Запросы идут напрямую из браузера на api.anthropic.com; ключ хранится только на этом устройстве.
import type { AiDeckItem } from './db'

export const AI_MODELS = [
  { id: 'claude-haiku-5-5', label: 'Haiku — быстрый и дешёвый' },
  { id: 'claude-sonnet-5-5', label: 'Sonnet — сбалансированный' },
  { id: 'claude-opus-5-5', label: 'Opus — самый умный' },
]

export class AiError extends Error {}

async function ask(key: string, model: string, system: string, prompt: string, maxTokens = 1500): Promise<string> {
  if (!key) throw new AiError('Добавьте ключ Claude API в настройках, чтобы пользоваться ИИ.')
  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: prompt }] }),
    })
  } catch {
    throw new AiError('Нет связи с Claude API. Проверьте интернет и попробуйте ещё раз.')
  }
  if (res.status === 401) throw new AiError('Ключ не подошёл. Проверьте его в настройках.')
  if (res.status === 429) throw new AiError('Слишком много запросов. Подождите минуту и повторите.')
  if (!res.ok) throw new AiError(`Claude API ответил ошибкой ${res.status}. Попробуйте позже.`)
  const data = await res.json()
  return (data.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('')
}

function extractJson<T>(text: string): T {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = m ? m[1] : text.slice(text.search(/[[{]/))
  try { return JSON.parse(raw) as T } catch { throw new AiError('ИИ вернул ответ в неожиданном формате. Попробуйте ещё раз.') }
}

const SYSTEM = 'Ты — методист приложения для саморазвития взрослого человека (30 лет). Пишешь по-русски, точно и проверяемо, без выдумок. Если не уверен в факте — не включай его.'

export async function testKey(key: string, model: string): Promise<void> {
  await ask(key, model, 'Ответь одним словом.', 'Скажи «готово».', 10)
}

export async function makeMnemonic(key: string, model: string, fact: string): Promise<string> {
  const t = await ask(key, model, SYSTEM,
    `Придумай одну короткую запоминающуюся ассоциацию (до 25 слов) для факта: «${fact}». ` +
    'Используй созвучие, яркий образ или связь с известным. Ответь только текстом ассоциации, без кавычек и пояснений.', 200)
  return t.trim().replace(/^["«]|["»]$/g, '')
}

export async function makeDeck(key: string, model: string, title: string, description: string, count = 20): Promise<AiDeckItem[]> {
  const t = await ask(key, model, SYSTEM,
    `Составь учебный набор из ${count} карточек по теме «${title}» (${description}). ` +
    'Идём от самого важного и известного к менее известному. Для каждой карточки: вопрос (q), короткий правильный ответ (a, до 6 слов), ' +
    'три правдоподобных неправильных ответа того же типа (wrong), ассоциация для запоминания (mnemonic, до 20 слов), пояснение в одно предложение (explain). ' +
    'Верни только JSON-массив объектов {"q","a","wrong","mnemonic","explain"} без пояснений.', 6000)
  const items = extractJson<Omit<AiDeckItem, 'id'>[]>(t)
  if (!Array.isArray(items) || !items.length) throw new AiError('ИИ не прислал карточек. Попробуйте ещё раз.')
  return items
    .filter((i) => i && i.q && i.a && Array.isArray(i.wrong) && i.wrong.length >= 3)
    .map((i, n) => ({ ...i, id: `ai${n + 1}` }))
}

export interface TopicIdea { title: string; area: string; description: string }

export async function suggestTopics(key: string, model: string, interests: string[], done: string[]): Promise<TopicIdea[]> {
  const t = await ask(key, model, SYSTEM,
    `Интересы пользователя: ${interests.join(', ')}. Уже изучено или выбрано: ${done.join(', ') || 'ничего'}. ` +
    'Предложи 6 новых тем на месяц обучения (по 15–30 минут в день), разнообразных по областям, конкретных и интересных. ' +
    'Верни только JSON-массив {"title","area","description"}; description — одно предложение о том, что человек узнает.', 1500)
  return extractJson<TopicIdea[]>(t).slice(0, 6)
}
