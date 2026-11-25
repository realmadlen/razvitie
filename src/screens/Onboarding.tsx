import { useState } from 'react'
import { Calculator, RotateCcw, Sparkles, Compass, Check } from 'lucide-react'
import { useStore } from '../store'
import { monthKey } from '../db'
import { CATALOG } from '../content/catalog'

export function Onboarding() {
  const { update } = useStore()
  const [step, setStep] = useState(0)
  const [minutes, setMinutes] = useState<15 | 30>(15)
  const [topics, setTopics] = useState<string[]>(['countries', 'russia-history', 'biases'])
  const ready = CATALOG.filter((t) => t.builtin)

  const finish = async () => {
    await update((s) => ({ onboarded: true, sessionMinutes: minutes, months: { ...s.months, [monthKey()]: topics } }))
  }

  return (
    <div className="onb">
      <div className="onb-body fade-in" key={step}>
        <div className="steps-dots" aria-label={`Шаг ${step + 1} из 3`}>{[0, 1, 2].map((i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
        {step === 0 && (
          <>
            <h1>Каждый день понемногу — и навсегда</h1>
            <p className="lead">Вы выбираете три темы на месяц, а приложение каждый день собирает короткое занятие и напоминает выученное ровно тогда, когда оно начинает забываться.</p>
            <div className="how">
              <div><span className="icon-tile" style={{ background: 'var(--c-sky)' }}><Calculator size={18} /></span><div><b>Задачи по желанию</b><p>Примеры и логика — отдельно, когда захочется. Не получается — разберём решение по шагам.</p></div></div>
              <div><span className="icon-tile" style={{ background: 'var(--accent)' }}><RotateCcw size={18} /></span><div><b>Повторение</b><p>Алгоритм FSRS сам решает, что пора вспомнить: через день, неделю, полгода.</p></div></div>
              <div><span className="icon-tile" style={{ background: 'var(--c-teal)' }}><Sparkles size={18} /></span><div><b>Новое с ассоциациями</b><p>Небольшая порция по каждой теме и образ, который поможет запомнить.</p></div></div>
              <div><span className="icon-tile" style={{ background: 'var(--c-amber)' }}><Compass size={18} /></span><div><b>Открытие дня</b><p>Факт из незнакомой области. Понравится — отметьте тему на следующий месяц.</p></div></div>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h1>Сколько времени в день?</h1>
            <p className="lead">Можно поменять в любой момент в настройках. Регулярность важнее длительности.</p>
            <div className="options">
              {([15, 30] as const).map((m) => (
                <button key={m} className="choice-card" aria-pressed={minutes === m} onClick={() => setMinutes(m)}>
                  <div className="row-main"><span className="row-title">{m} минут</span><span className="row-sub">{m === 15 ? 'Спокойный темп: около 7 новых фактов в день' : 'Быстрее вперёд: около 12 новых фактов в день'}</span></div>
                  <span className="check">{minutes === m && <Check size={15} />}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h1>Темы на этот месяц</h1>
            <p className="lead">Для начала — три готовые темы. Другие появятся в каталоге, а с ИИ-помощником их можно создать прямо в приложении.</p>
            <div className="options">
              {ready.map((t) => {
                const on = topics.includes(t.id)
                return (
                  <button key={t.id} className="choice-card" aria-pressed={on} onClick={() => setTopics((xs) => (on ? xs.filter((x) => x !== t.id) : [...xs, t.id].slice(-3)))}>
                    <span className="dot" style={{ background: t.color, width: 12, height: 12 }} />
                    <div className="row-main"><span className="row-title">{t.title}</span><span className="row-sub">{t.description}</span></div>
                    <span className="check">{on && <Check size={15} />}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {step < 2 ? <button className="btn btn-primary btn-block" onClick={() => setStep(step + 1)}>Дальше</button>
          : <button className="btn btn-primary btn-block" disabled={!topics.length} onClick={finish}>Начать</button>}
        {step > 0 && <button className="btn btn-plain" onClick={() => setStep(step - 1)}>Назад</button>}
      </div>
    </div>
  )
}
