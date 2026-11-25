import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Play, Check, RotateCcw, BookOpen, CalendarRange, ChevronRight, Infinity as Endless } from 'lucide-react'
import { db, dayKey, addDays } from '../db'
import { useStore } from '../store'
import { buildPlan, monthTopics, type Plan } from '../session'
import { computeStreak, isActive, topicProgress, type TopicProgress } from '../stats'
import { memoryIndex } from '../srs'
import { getModule, topicTitle } from '../content/topics'
import { TOPIC_BY_ID } from '../content/catalog'

const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
export const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']

function greeting(h: number) {
  if (h < 5) return 'Доброй ночи'
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Добрый день'
  return 'Добрый вечер'
}

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

interface Props { onStart: (plan: Plan, extra: boolean) => void; onPickMonth: () => void; onOpenTopic: (id: string) => void; refreshKey: number }

export function Today({ onStart, onPickMonth, onOpenTopic, refreshKey }: Props) {
  const { settings, decks } = useStore()
  const now = new Date()
  const today = dayKey(now)
  const days = useLiveQuery(() => db.days.toArray(), [], [])
  const todayRow = days.find((d) => d.day === today)
  const streak = computeStreak(days)
  const topics = monthTopics(settings)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [mem, setMem] = useState<{ value: number; count: number } | null>(null)
  const [progress, setProgress] = useState<TopicProgress[]>([])

  useEffect(() => {
    buildPlan(settings, decks).then(setPlan)
    memoryIndex().then(setMem)
    Promise.all(topics.map((t) => topicProgress(t, getModule(t, decks)?.itemIds().length ?? 0))).then(setProgress)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, settings.months, settings.sessionMinutes, settings.newPerDay, decks])

  const done = !!todayRow?.completed
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  const byDay = new Map(days.map((d) => [d.day, d]))

  return (
    <main className="screen">
      <header className="screen-head">
        <h1>{greeting(now.getHours())}</h1>
        <p>{WEEKDAYS[now.getDay()].replace(/^./, (c) => c.toUpperCase())}, {now.getDate()} {MONTHS_GEN[now.getMonth()]}</p>
      </header>

      {topics.length === 0 && (
        <div className="banner">
          <p><b>Новый месяц — новые темы.</b> Выберите три темы на {MONTHS[now.getMonth()]}, чтобы приложение подбирало новое.</p>
          <button className="btn btn-primary btn-sm" onClick={onPickMonth} style={{ width: 'fit-content' }}><CalendarRange size={16} /> Выбрать темы</button>
        </div>
      )}

      {!done ? (
        <section className="today-panel" aria-label="Занятие на сегодня">
          <div>
            <h2>Занятие на сегодня</h2>
            <p>{plan ? `≈ ${plan.estMinutes} мин из ${settings.sessionMinutes}` : 'Собираем план…'}</p>
          </div>
          {plan && (
            <div className="today-breakdown">
              <span className="num"><RotateCcw size={16} /> {plan.reviewCount} {plural(plan.reviewCount, 'повторение', 'повторения', 'повторений')}</span>
              <span className="num"><BookOpen size={16} /> {plan.lessons.length} {plural(plan.lessons.length, 'урок', 'урока', 'уроков')}</span>
            </div>
          )}
          {plan && plan.lessons.length > 0 && (
            <ul className="today-lessons">
              {plan.lessons.map((l) => <li key={l.lessonId}><span>{topicTitle(l.topicId, decks)}</span>{l.title}</li>)}
            </ul>
          )}
          <div className="today-actions">
            <button className="btn btn-block" disabled={!plan} onClick={() => plan && onStart(plan, false)}>
              <Play size={18} fill="currentColor" /> {todayRow && todayRow.answered > 0 ? 'Продолжить' : 'Начать'}
            </button>
            <button className="btn btn-block btn-ghost" disabled={!plan} onClick={() => plan && onStart({ ...plan, endless: true, dailySteps: plan.steps.length }, false)}>
              <Endless size={18} /> Учиться без остановки
            </button>
          </div>
        </section>
      ) : (
        <section className="today-panel is-done" aria-label="Занятие выполнено">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <span className="done-mark"><Check size={24} /></span>
            <div>
              <h2>Сегодня всё сделано</h2>
              <p className="num" style={{ color: 'var(--muted)', opacity: 1 }}>{Math.round((todayRow?.seconds ?? 0) / 60)} мин · {todayRow?.answered ?? 0} {plural(todayRow?.answered ?? 0, 'ответ', 'ответа', 'ответов')} · {todayRow?.newItems ?? 0} {plural(todayRow?.newItems ?? 0, 'новый', 'новых', 'новых')}</p>
            </div>
          </div>
          <button className="btn btn-block" onClick={() => onStart({ steps: [], reviewCount: 0, newCount: 0, lessons: [], estMinutes: 0, endless: true }, true)}>
            <Endless size={18} /> Продолжить обучение
          </button>
          <p className="note" style={{ margin: 0 }}>Уроки и повторения будут идти друг за другом, пока вы сами не остановитесь.</p>
        </section>
      )}

      <div className="stats">
        <div className="stat">
          <b className="num">{streak.current} {plural(streak.current, 'день', 'дня', 'дней')}</b>
          <span>серия занятий</span>
          <div className="week" aria-label="Последние 7 дней">
            {week.map((d) => <i key={d} className={isActive(byDay.get(d)) ? 'on' : streak.frozen.has(d) ? 'frz' : ''} title={d} />)}
          </div>
        </div>
        <div className="stat">
          <b className="num">{mem && mem.count ? `${Math.round(mem.value * 100)}%` : '—'}</b>
          <span>{mem && mem.count ? 'вспомните прямо сейчас' : 'индекс памяти появится после первых ответов'}</span>
        </div>
      </div>

      {topics.length > 0 && (
        <section className="section">
          <h2>Темы месяца</h2>
          <div className="group">
            {topics.map((t) => {
              const p = progress.find((x) => x.topicId === t)
              const color = TOPIC_BY_ID.get(t)?.color ?? 'var(--c-indigo)'
              const learned = p ? p.young + p.mature : 0
              return (
                <button key={t} className="row" onClick={() => onOpenTopic(t)}>
                  <span className="dot" style={{ background: color }} />
                  <div className="row-main">
                    <span className="row-title">{topicTitle(t, decks)}</span>
                    {p && p.total > 0 && (
                      <div className="bar" aria-label={`Выучено ${learned} из ${p.total}`}>
                        <i style={{ width: `${(p.mature / p.total) * 100}%`, background: color }} />
                        <i style={{ width: `${(p.young / p.total) * 100}%`, background: color, opacity: 0.45 }} />
                        <i style={{ width: `${(p.learning / p.total) * 100}%`, background: 'var(--warn)', opacity: 0.5 }} />
                      </div>
                    )}
                  </div>
                  <span className="row-end num">{p ? `${p.introduced}/${p.total}` : ''}<ChevronRight size={18} className="chev" /></span>
                </button>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}
