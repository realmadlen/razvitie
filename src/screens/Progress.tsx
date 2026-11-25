import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, dayKey, addDays, monthKey, type DayRow } from '../db'
import { useStore } from '../store'
import { computeStreak, isActive, topicProgress, forecast, type TopicProgress } from '../stats'
import { memoryIndex } from '../srs'
import { getModule, topicTitle } from '../content/topics'
import { TOPIC_BY_ID } from '../content/catalog'
import { plural } from './Today'

const MONTHS_PREP = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре']

const W = 320

function Bars({ values, labels, color = 'var(--accent)', unit = '', highlightLast = true }: { values: number[]; labels: string[]; color?: string; unit?: string; highlightLast?: boolean }) {
  const H = 110, top = 14, bottom = 18
  const max = Math.max(1, ...values)
  const bw = W / values.length
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`График: ${values.join(', ')}${unit}`}>
        <line className="grid" x1="0" x2={W} y1={H - bottom} y2={H - bottom} />
        {values.map((v, i) => {
          const h = ((H - top - bottom) * v) / max
          const x = i * bw + bw * 0.18
          return (
            <g key={i}>
              <rect x={x} y={H - bottom - Math.max(h, v ? 2 : 0)} width={bw * 0.64} height={Math.max(h, v ? 2 : 0)} rx="3" fill={color} opacity={highlightLast && i !== values.length - 1 ? 0.55 : 1} />
              {(i % Math.ceil(values.length / 7) === 0 || i === values.length - 1) && <text x={x + bw * 0.32} y={H - 4} textAnchor="middle">{labels[i]}</text>}
            </g>
          )
        })}
        <text x={W} y={10} textAnchor="end">макс {max}{unit}</text>
      </svg>
    </div>
  )
}

function Line({ values, labels }: { values: (number | null)[]; labels: string[] }) {
  const H = 120, top = 10, bottom = 18, left = 26
  const pts = values.map((v, i) => (v == null ? null : [left + ((W - left) * i) / Math.max(1, values.length - 1), top + (H - top - bottom) * (1 - v)] as const))
  const valid = pts.filter(Boolean) as [number, number][]
  const d = valid.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = valid.length ? `${d} L${valid[valid.length - 1][0]},${H - bottom} L${valid[0][0]},${H - bottom} Z` : ''
  const last = valid[valid.length - 1]
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Индекс памяти по дням">
        {[0, 0.5, 1].map((g) => <g key={g}><line className="grid" x1={left} x2={W} y1={top + (H - top - bottom) * (1 - g)} y2={top + (H - top - bottom) * (1 - g)} /><text x={left - 6} y={top + (H - top - bottom) * (1 - g) + 3} textAnchor="end">{g * 100}%</text></g>)}
        {area && <path d={area} fill="var(--accent)" opacity="0.12" />}
        {d && <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {last && <circle cx={last[0]} cy={last[1]} r="4" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />}
        <text x={left} y={H - 4}>{labels[0]}</text>
        <text x={W} y={H - 4} textAnchor="end">{labels[labels.length - 1]}</text>
      </svg>
    </div>
  )
}

const short = (day: string) => { const [, m, d] = day.split('-').map(Number); return `${d}.${String(m).padStart(2, '0')}` }

export function Progress() {
  const { decks } = useStore()
  const days = useLiveQuery(() => db.days.toArray(), [], [] as DayRow[])
  const leeches = useLiveQuery(() => db.cards.filter((c) => c.lapses >= 3).toArray(), [], [])
  const studied = useLiveQuery(async () => { const s = new Set<string>(); await db.cards.each((c) => { s.add(c.topicId) }); return [...s] }, [], [] as string[])
  const [mem, setMem] = useState<{ value: number; count: number } | null>(null)
  const [fc, setFc] = useState<number[]>([])
  const [tp, setTp] = useState<TopicProgress[]>([])

  useEffect(() => {
    memoryIndex().then(setMem)
    forecast(7).then(setFc)
    Promise.all(studied.map((t) => topicProgress(t, getModule(t, decks)?.itemIds().length ?? 0))).then(setTp)
  }, [studied, decks, days.length])

  const today = dayKey()
  const byDay = new Map(days.map((d) => [d.day, d]))
  const streak = computeStreak(days)
  const mk = monthKey()
  const monthDays = days.filter((d) => d.day.startsWith(mk))
  const mMinutes = Math.round(monthDays.reduce((a, d) => a + d.seconds, 0) / 60)
  const mActive = monthDays.filter(isActive).length
  const mNew = monthDays.reduce((a, d) => a + d.newItems, 0)
  const mAns = monthDays.reduce((a, d) => a + d.answered, 0)
  const mCor = monthDays.reduce((a, d) => a + d.correct, 0)
  const wTot = monthDays.reduce((a, d) => a + d.warmupTotal, 0)
  const wCor = monthDays.reduce((a, d) => a + d.warmupCorrect, 0)

  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13))
  const last30 = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29))
  // Тепловая карта: 18 недель, колонки — недели с понедельника
  const weeks = 18
  const todayDate = new Date()
  const dow = (todayDate.getDay() + 6) % 7
  const heatStart = addDays(today, -(weeks - 1) * 7 - dow)
  const heatDays = Array.from({ length: weeks * 7 }, (_, i) => addDays(heatStart, i))
  const level = (d?: DayRow) => (!d || d.seconds < 60 ? '' : d.seconds < 600 ? 'l1' : d.seconds < 1200 ? 'l2' : 'l3')

  const hasData = days.some((d) => d.answered > 0)

  return (
    <main className="screen">
      <header className="screen-head"><h1>Прогресс</h1><p>Честные цифры: сколько вы помните, а не сколько нажали.</p></header>

      {!hasData && <div className="group"><div className="empty"><b>Здесь появится ваша статистика</b><span>Пройдите первое занятие — и график начнёт расти.</span></div></div>}

      <div className="stats">
        <div className="stat"><b className="num">{streak.current}</b><span>{plural(streak.current, 'день', 'дня', 'дней')} подряд · рекорд {streak.best}</span></div>
        <div className="stat"><b className="num">{mem && mem.count ? `${Math.round(mem.value * 100)}%` : '—'}</b><span>индекс памяти{mem && mem.count ? ` · ${mem.count} ${plural(mem.count, 'карточка', 'карточки', 'карточек')}` : ''}</span></div>
      </div>

      <section className="chart-card" aria-label="Активность">
        <div className="chart-head"><h3>Активность</h3><span>{mActive} {plural(mActive, 'день', 'дня', 'дней')} в {MONTHS_PREP[todayDate.getMonth()]}</span></div>
        <div className="heat" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
          {heatDays.map((d) => <i key={d} className={`${level(byDay.get(d))}${d === today ? ' today' : ''}`} title={`${short(d)}: ${Math.round((byDay.get(d)?.seconds ?? 0) / 60)} мин`} style={d > today ? { visibility: 'hidden' } : undefined} />)}
        </div>
        <div className="legend"><span><i style={{ background: 'var(--surface-2)' }} /> нет</span><span><i style={{ background: 'color-mix(in srgb, var(--accent) 30%, var(--surface-2))' }} /> до 10 мин</span><span><i style={{ background: 'color-mix(in srgb, var(--accent) 60%, var(--surface-2))' }} /> 10–20</span><span><i style={{ background: 'var(--accent)' }} /> 20+</span></div>
        <p className="note">Пропуск до 2 дней в месяц не обнуляет серию.</p>
      </section>

      <section className="chart-card">
        <div className="chart-head"><h3>Индекс памяти</h3><span>30 дней</span></div>
        <div className="chart-big">{mem && mem.count ? `${Math.round(mem.value * 100)}%` : '—'}<small>вероятность вспомнить изученное</small></div>
        <Line values={last30.map((d) => byDay.get(d)?.retention ?? null)} labels={last30.map(short)} />
        <p className="note">Цель системы повторений — держать индекс около 90%. Если он падает, значит, пора повторить.</p>
      </section>

      <section className="chart-card">
        <div className="chart-head"><h3>Минуты занятий</h3><span>{mMinutes} мин в этом месяце</span></div>
        <Bars values={last14.map((d) => Math.round((byDay.get(d)?.seconds ?? 0) / 60))} labels={last14.map(short)} unit=" мин" />
      </section>

      <section className="chart-card">
        <div className="chart-head"><h3>Точность ответов</h3><span>{mAns ? `${Math.round((mCor / mAns) * 100)}% за месяц` : 'нет данных'}</span></div>
        <Bars values={last14.map((d) => { const r = byDay.get(d); return r && r.answered ? Math.round((r.correct / r.answered) * 100) : 0 })} labels={last14.map(short)} unit="%" color="var(--good)" />
        <div className="legend"><span>Задачи: {wTot ? `${Math.round((wCor / wTot) * 100)}% верно из ${wTot}` : 'ещё не было'}</span><span>Новых фактов: {mNew}</span></div>
      </section>

      <section className="chart-card">
        <div className="chart-head"><h3>Повторения впереди</h3><span>7 дней</span></div>
        <Bars values={fc} labels={fc.map((_, i) => (i === 0 ? 'сегодня' : short(addDays(today, i))))} unit="" highlightLast={false} color="var(--c-sky)" />
      </section>

      {tp.length > 0 && (
        <section className="section">
          <h2>По темам</h2>
          <div className="group">
            {tp.map((p) => {
              const color = TOPIC_BY_ID.get(p.topicId)?.color ?? 'var(--c-indigo)'
              return (
                <div className="row" key={p.topicId}>
                  <div className="row-main">
                    <span className="row-title">{topicTitle(p.topicId, decks)}</span>
                    <div className="bar">
                      <i style={{ width: `${(p.mature / Math.max(1, p.total)) * 100}%`, background: color }} />
                      <i style={{ width: `${(p.young / Math.max(1, p.total)) * 100}%`, background: color, opacity: 0.45 }} />
                      <i style={{ width: `${(p.learning / Math.max(1, p.total)) * 100}%`, background: 'var(--warn)', opacity: 0.55 }} />
                    </div>
                    <span className="row-sub num">надолго {p.mature} · знакомо {p.young} · учится {p.learning} · впереди {p.new}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {leeches.length > 0 && (
        <section className="section">
          <h2>Трудные карточки</h2>
          <p className="section-sub">Забывались 3 раза и больше. Попробуйте придумать для них свою ассоциацию.</p>
          <div className="group">
            {leeches.slice(0, 10).map((c) => {
              const mod = getModule(c.topicId, decks)
              return <div key={c.id} className="row"><div className="row-main"><span className="row-title">{mod?.itemTitle(c.itemId) ?? c.itemId}</span><span className="row-sub">{mod?.itemSub(c.itemId)}</span></div><span className="chip chip-learning">{c.lapses}×</span></div>
            })}
          </div>
        </section>
      )}
    </main>
  )
}
