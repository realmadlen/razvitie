// Разовые обновления данных на устройстве после выхода новой версии.
import { db, monthKey, type Settings } from './db'
import { getModule } from './content/topics'

const BUILTIN = ['countries', 'russia-history', 'biases', 'science-basics']

export async function migrate(s: Settings): Promise<Settings> {
  let next = s
  // v2: вместо когнитивных искажений в текущем месяце — «Как устроен мир»
  if (!(await db.kv.get('mig:v2'))) {
    const key = monthKey()
    const cur = s.months[key]
    if (cur?.includes('biases') && !cur.includes('science-basics')) {
      next = { ...s, months: { ...s.months, [key]: cur.map((t) => (t === 'biases' ? 'science-basics' : t)) } }
    }
    await db.kv.put({ key: 'mig:v2', value: true })
  }
  // Карточки элементов, которых больше нет в теме (тему переписали), убираем
  for (const topicId of BUILTIN) {
    const mod = getModule(topicId, [])
    if (!mod) continue
    const ids = new Set(mod.itemIds())
    const stale = await db.cards.where('topicId').equals(topicId).filter((c) => !ids.has(c.itemId) || !mod.kinds(c.itemId).includes(c.kind)).primaryKeys()
    if (stale.length) await db.cards.bulkDelete(stale)
  }
  return next
}
