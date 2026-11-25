import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, ChevronLeft, Heart, Sparkles, Loader2, Check, Minus, Plus, Wand2 } from 'lucide-react'
import { db, monthKey, type AiDeck } from '../db'
import { useStore } from '../store'
import { CATALOG, TOPIC_BY_ID } from '../content/catalog'
import { getModule, topicTitle } from '../content/topics'
import { topicProgress, type TopicProgress } from '../stats'
import { maturity } from '../srs'
import { IntroCard } from './Session'
import { MONTHS, plural } from './Today'
import { makeDeck, suggestTopics, AiError, type TopicIdea } from '../ai'

const colorOf = (id: string) => TOPIC_BY_ID.get(id)?.color ?? 'var(--c-indigo)'

interface TopicLite { id: string; title: string; area: string; description: string; ready: boolean }

function allTopics(decks: AiDeck[]): TopicLite[] {
  const fromCatalog = CATALOG.map((t) => ({ id: t.id, title: t.title, area: t.area, description: t.description, ready: t.builtin || decks.some((d) => d.topicId === t.id) }))
  const custom = decks.filter((d) => !TOPIC_BY_ID.has(d.topicId)).map((d) => ({ id: d.topicId, title: d.title, area: 'Создано ИИ', description: `${d.items.length} карточек`, ready: true }))
  return [...fromCatalog, ...custom]
}

// ——— Вкладка «Темы» ———

export function Topics({ onOpenTopic, onPickMonth }: { onOpenTopic: (id: string) => void; onPickMonth: () => void }) {
  const { settings, decks } = useStore()
  const month = settings.months[monthKey()] ?? []
  const studied = useLiveQuery(async () => { const s = new Set<string>(); await db.cards.each((c) => { s.add(c.topicId) }); return [...s] }, [], [] as string[])
  const earlier = studied.filter((t) => !month.includes(t))
  const topics = allTopics(decks)
  const wish = topics.filter((t) => settings.wishlist.includes(t.id) && !month.includes(t.id))

  return (
    <main className="screen">
      <header className="screen-head"><h1>Темы</h1><p>Три темы на месяц. Всё изученное раньше остаётся в повторениях.</p></header>

      <section className="section">
        <h2>{MONTHS[new Date().getMonth()].replace(/^./, (c) => c.toUpperCase())}</h2>
        <div className="group">
          {month.map((id) => <TopicRow key={id} id={id} title={topicTitle(id, decks)} onClick={() => onOpenTopic(id)} />)}
          <button className="row" onClick={onPickMonth}>
            <span className="icon-tile" style={{ background: 'var(--accent)' }}><Sparkles size={18} /></span>
            <div className="row-main"><span className="row-title" style={{ color: 'var(--accent)' }}>{month.length ? 'Изменить темы месяца' : 'Выбрать темы месяца'}</span></div>
            <ChevronRight size={18} className="chev" />
          </button>
        </div>
      </section>

      {wish.length > 0 && (
        <section className="section">
          <h2>Хочу изучить</h2>
          <p className="section-sub">Темы, отмеченные в «открытиях дня».</p>
          <div className="group">{wish.map((t) => <TopicRow key={t.id} id={t.id} title={t.title} sub={t.ready ? t.area : `${t.area} · скоро`} onClick={() => onOpenTopic(t.id)} icon={<Heart size={16} fill="currentColor" />} />)}</div>
        </section>
      )}

      {earlier.length > 0 && (
        <section className="section">
          <h2>Изучено раньше</h2>
          <p className="section-sub">Новое не добавляется, но повторения продолжаются.</p>
          <div className="group">{earlier.map((id) => <TopicRow key={id} id={id} title={topicTitle(id, decks)} onClick={() => onOpenTopic(id)} />)}</div>
        </section>
      )}

      <section className="section">
        <h2>Каталог</h2>
        <div className="group">
          {topics.map((t) => <TopicRow key={t.id} id={t.id} title={t.title} sub={t.ready ? t.area : `${t.area} · ${settings.aiKey ? 'можно создать с ИИ' : 'скоро'}`} onClick={() => onOpenTopic(t.id)} />)}
        </div>
      </section>
    </main>
  )
}

function TopicRow({ id, title, sub, onClick, icon }: { id: string; title: string; sub?: string; onClick: () => void; icon?: React.ReactNode }) {
  return (
    <button className="row" onClick={onClick}>
      <span className="icon-tile" style={{ background: colorOf(id) }}>{icon ?? <span style={{ fontWeight: 700, fontSize: 15 }}>{title.charAt(0)}</span>}</span>
      <div className="row-main"><span className="row-title">{title}</span>{sub && <span className="row-sub">{sub}</span>}</div>
      <ChevronRight size={18} className="chev" />
    </button>
  )
}

// ——— Лист темы ———

export function TopicSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { settings, update, decks } = useStore()
  const mod = getModule(id, decks)
  const info = TOPIC_BY_ID.get(id)
  const title = topicTitle(id, decks)
  const cards = useLiveQuery(() => db.cards.where('topicId').equals(id).toArray(), [id], [])
  const [p, setP] = useState<TopicProgress | null>(null)
  const [item, setItem] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const mk = monthKey()
  const month = settings.months[mk] ?? []
  const inMonth = month.includes(id)

  useEffect(() => { if (mod) topicProgress(id, mod.itemIds().length).then(setP) }, [id, mod, cards.length])

  const toggleMonth = () => update((s) => {
    const cur = s.months[mk] ?? []
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-3)
    return { months: { ...s.months, [mk]: next } }
  })

  const generate = async () => {
    setBusy(true); setErr('')
    try {
      const items = await makeDeck(settings.aiKey, settings.aiModel, title, info?.description ?? title)
      await db.decks.put({ topicId: id, title, items, createdAt: Date.now() })
    } catch (e) { setErr(e instanceof AiError ? e.message : 'Не получилось создать набор. Попробуйте ещё раз.') }
    finally { setBusy(false) }
  }

  if (item && mod) {
    const custom = settings.mnemonics[`${id}|${item}`]
    return (
      <div className="sheet" role="dialog" aria-label={mod.itemTitle(item)}>
        <div className="sheet-top"><button className="btn btn-plain" onClick={() => setItem(null)}><ChevronLeft size={20} /> {title}</button><span className="spacer" /></div>
        <div className="screen"><IntroCard intro={mod.intro(item, custom)} /></div>
      </div>
    )
  }

  const byItem = new Map<string, ReturnType<typeof maturity>>()
  const order = { new: 0, learning: 1, young: 2, mature: 3 }
  for (const c of cards) { const m = maturity(c); const prev = byItem.get(c.itemId); if (!prev || order[m] < order[prev]) byItem.set(c.itemId, m) }
  const chipText = { new: 'новое', learning: 'учится', young: 'знакомо', mature: 'надолго' }
  const perDay = settings.newPerDay[id] ?? 2

  return (
    <div className="sheet" role="dialog" aria-label={title}>
      <div className="sheet-top"><button className="btn btn-plain" onClick={onClose}><ChevronLeft size={20} /> Назад</button><h2>{title}</h2><span className="spacer" /></div>
      <div className="screen">
        <header className="screen-head">
          <h1>{title}</h1>
          <p>{info?.description ?? (mod ? `${mod.itemIds().length} карточек` : '')}</p>
        </header>

        {mod && p && (
          <div className="chart-card">
            <div className="chart-head"><h3>Прогресс</h3><span>{p.introduced} из {p.total} изучено</span></div>
            <div className="bar" style={{ height: 10, borderRadius: 5 }}>
              <i style={{ width: `${(p.mature / p.total) * 100}%`, background: colorOf(id) }} />
              <i style={{ width: `${(p.young / p.total) * 100}%`, background: colorOf(id), opacity: 0.45 }} />
              <i style={{ width: `${(p.learning / p.total) * 100}%`, background: 'var(--warn)', opacity: 0.55 }} />
            </div>
            <div className="legend">
              <span><i style={{ background: colorOf(id) }} /> надолго {p.mature}</span>
              <span><i style={{ background: colorOf(id), opacity: 0.45 }} /> знакомо {p.young}</span>
              <span><i style={{ background: 'var(--warn)', opacity: 0.55 }} /> учится {p.learning}</span>
              <span><i style={{ background: 'var(--line)' }} /> впереди {p.new}</span>
            </div>
          </div>
        )}

        <div className="group">
          {mod ? (
            <button className="row" onClick={toggleMonth}>
              <span className="check" style={inMonth ? { background: 'var(--accent)', borderColor: 'var(--accent)' } : undefined}>{inMonth && <Check size={15} />}</span>
              <div className="row-main"><span className="row-title">{inMonth ? 'В плане месяца' : 'Добавить в план месяца'}</span>
                {!inMonth && month.length >= 3 && <span className="row-sub">Заменит тему «{topicTitle(month[0], decks)}»</span>}</div>
            </button>
          ) : null}
          {mod && (
            <div className="row">
              <div className="row-main"><span className="row-title">Новых в день</span><span className="row-sub">При 30-минутном занятии — почти вдвое больше</span></div>
              <div className="order-move">
                <button aria-label="Меньше" disabled={perDay <= 1} onClick={() => update((s) => ({ newPerDay: { ...s.newPerDay, [id]: Math.max(1, perDay - 1) } }))}><Minus size={16} /></button>
                <span className="num" style={{ minWidth: 28, textAlign: 'center', alignSelf: 'center', fontWeight: 600 }}>{perDay}</span>
                <button aria-label="Больше" disabled={perDay >= 10} onClick={() => update((s) => ({ newPerDay: { ...s.newPerDay, [id]: Math.min(10, perDay + 1) } }))}><Plus size={16} /></button>
              </div>
            </div>
          )}
        </div>

        {!mod && (
          <div className="banner">
            {settings.aiKey ? (
              <>
                <p><b>Готового набора пока нет.</b> ИИ составит 20 карточек с ассоциациями — это займёт около минуты.</p>
                <button className="btn btn-primary btn-sm" style={{ width: 'fit-content' }} onClick={generate} disabled={busy}>{busy ? <><Loader2 size={16} className="spin" /> Составляем…</> : <><Wand2 size={16} /> Создать с ИИ</>}</button>
                {err && <p className="err">{err}</p>}
              </>
            ) : (
              <p><b>Скоро.</b> Готовый набор появится в следующих версиях. Если добавить ключ Claude API в настройках, тему можно создать прямо сейчас.</p>
            )}
          </div>
        )}

        {mod && (
          <section className="section">
            <h2>{plural(mod.itemIds().length, 'Карточка', 'Карточки', 'Карточки')}</h2>
            <div className="group">
              {mod.itemIds().map((iid) => {
                const m = byItem.get(iid) ?? 'new'
                return (
                  <button key={iid} className="row" onClick={() => setItem(iid)}>
                    <div className="row-main"><span className="row-title">{mod.itemTitle(iid)}</span><span className="row-sub">{byItem.has(iid) ? mod.itemSub(iid) : 'Ещё не изучено'}</span></div>
                    <span className={`chip chip-${m}`}>{chipText[m]}</span>
                  </button>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

// ——— Выбор тем месяца ———

export function MonthPicker({ onClose }: { onClose: () => void }) {
  const { settings, update, decks } = useStore()
  const mk = monthKey()
  const [sel, setSel] = useState<string[]>(settings.months[mk] ?? [])
  const [ideas, setIdeas] = useState<TopicIdea[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const topics = allTopics(decks)
  // Сначала готовые и желанные, затем остальные
  const ranked = [...topics].sort((a, b) => Number(b.ready) - Number(a.ready) || Number(settings.wishlist.includes(b.id)) - Number(settings.wishlist.includes(a.id)))
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 3 ? s : [...s, id]))

  const askIdeas = async () => {
    setBusy('ideas'); setErr('')
    try { setIdeas(await suggestTopics(settings.aiKey, settings.aiModel, ['история', 'география', 'наука', 'литература', 'бизнес', 'маркетинг', 'управление', 'психология'], topics.filter((t) => t.ready).map((t) => t.title))) }
    catch (e) { setErr(e instanceof AiError ? e.message : 'Не получилось получить идеи.') }
    finally { setBusy(null) }
  }
  const createIdea = async (idea: TopicIdea) => {
    setBusy(idea.title); setErr('')
    try {
      const items = await makeDeck(settings.aiKey, settings.aiModel, idea.title, idea.description)
      const topicId = `ai-${Date.now().toString(36)}`
      await db.decks.put({ topicId, title: idea.title, items, createdAt: Date.now() })
      setIdeas((xs) => xs.filter((x) => x !== idea))
      toggle(topicId)
    } catch (e) { setErr(e instanceof AiError ? e.message : 'Не получилось создать тему.') }
    finally { setBusy(null) }
  }

  return (
    <div className="sheet" role="dialog" aria-label="Темы месяца">
      <div className="sheet-top">
        <button className="btn btn-plain" onClick={onClose}>Отмена</button>
        <h2>Темы на {MONTHS[new Date().getMonth()]}</h2>
        <button className="btn btn-plain" style={{ fontWeight: 700 }} disabled={!sel.length} onClick={async () => { await update((s) => ({ months: { ...s.months, [mk]: sel } })); onClose() }}>Готово</button>
      </div>
      <div className="screen">
        <header className="screen-head"><h1>Что изучаем?</h1><p>Выберите до трёх тем: {sel.length} из 3. Темы без готового набора можно создать с ИИ.</p></header>
        <div className="options">
          {ranked.map((t) => {
            const on = sel.includes(t.id)
            return (
              <button key={t.id} className="choice-card" aria-pressed={on} disabled={!t.ready} style={!t.ready ? { opacity: 0.5 } : undefined} onClick={() => toggle(t.id)}>
                <span className="dot" style={{ background: colorOf(t.id), width: 12, height: 12 }} />
                <div className="row-main"><span className="row-title">{t.title}{settings.wishlist.includes(t.id) && <Heart size={13} fill="currentColor" style={{ marginLeft: 6, color: 'var(--c-rose)', verticalAlign: -1 }} aria-label="в списке желаний" />}</span><span className="row-sub">{t.ready ? t.description : `${t.area} · скоро`}</span></div>
                <span className="check">{on && <Check size={15} />}</span>
              </button>
            )
          })}
        </div>
        {settings.aiKey && (
          <section className="section">
            <h2>Идеи от ИИ</h2>
            {ideas.map((idea) => (
              <div key={idea.title} className="choice-card">
                <div className="row-main"><span className="row-title">{idea.title}</span><span className="row-sub">{idea.area} · {idea.description}</span></div>
                <button className="btn btn-secondary btn-sm" disabled={!!busy} onClick={() => createIdea(idea)}>{busy === idea.title ? <Loader2 size={16} className="spin" /> : 'Создать'}</button>
              </div>
            ))}
            <button className="btn btn-quiet btn-block" onClick={askIdeas} disabled={!!busy}>{busy === 'ideas' ? <><Loader2 size={18} className="spin" /> Думаем…</> : <><Sparkles size={18} /> Предложить темы</>}</button>
            {err && <p className="err">{err}</p>}
          </section>
        )}
      </div>
    </div>
  )
}
