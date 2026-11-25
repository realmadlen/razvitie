import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { X, Check, Lightbulb, Calculator, Brain, ChevronRight, BookOpen, Shuffle, Percent, Divide, Superscript, Variable, Sigma, ListOrdered, Plus } from 'lucide-react'
import { db, bumpDay } from '../db'
import { PRACTICE, PRACTICE_BY_KIND, type PracticeKind, type PracticeTask } from '../content/practice'

type Stats = Partial<Record<PracticeKind, { done: number; correct: number }>>
const STATS_KEY = 'practiceStats'

const ICONS: Record<PracticeKind, { Icon: typeof Calculator; color: string }> = {
  mul: { Icon: Calculator, color: 'var(--c-indigo)' },
  addsub: { Icon: Plus, color: 'var(--c-sky)' },
  percent: { Icon: Percent, color: 'var(--c-teal)' },
  fraction: { Icon: Divide, color: 'var(--c-amber)' },
  square: { Icon: Superscript, color: 'var(--c-rose)' },
  linear: { Icon: Variable, color: 'var(--c-violet)' },
  quadratic: { Icon: Sigma, color: 'var(--c-green)' },
  sequence: { Icon: ListOrdered, color: 'var(--c-teal)' },
  syllogism: { Icon: Brain, color: 'var(--c-violet)' },
}

export type PracticeMode = PracticeKind | 'mix'

export function Practice({ onStart }: { onStart: (mode: PracticeMode) => void }) {
  const stats = useLiveQuery(async () => ((await db.kv.get(STATS_KEY))?.value as Stats) ?? {}, [], {} as Stats)
  const row = (kind: PracticeKind) => {
    const info = PRACTICE_BY_KIND.get(kind)!
    const st = stats[kind]
    const { Icon, color } = ICONS[kind]
    return (
      <button key={kind} className="row" onClick={() => onStart(kind)}>
        <span className="icon-tile" style={{ background: color }}><Icon size={18} /></span>
        <div className="row-main"><span className="row-title">{info.title}</span><span className="row-sub">{info.sub}</span></div>
        <span className="row-end num">{st && st.done ? `${Math.round((st.correct / st.done) * 100)}%` : ''}<ChevronRight size={18} className="chev" /></span>
      </button>
    )
  }
  return (
    <main className="screen">
      <header className="screen-head">
        <h1>Задачи</h1>
        <p>Решайте, когда захочется. Не получается — нажмите «Не знаю», и решение разберём по шагам.</p>
      </header>
      <div className="group">
        <button className="row" onClick={() => onStart('mix')}>
          <span className="icon-tile" style={{ background: 'var(--accent)' }}><Shuffle size={18} /></span>
          <div className="row-main"><span className="row-title">Вперемешку</span><span className="row-sub">Каждый раз задача нового вида</span></div>
          <ChevronRight size={18} className="chev" />
        </button>
      </div>
      <section className="section">
        <h2>Математика</h2>
        <div className="group">{PRACTICE.filter((x) => x.group === 'math').map((x) => row(x.kind))}</div>
      </section>
      <section className="section">
        <h2>Логика</h2>
        <div className="group">{PRACTICE.filter((x) => x.group === 'logic').map((x) => row(x.kind))}</div>
      </section>
    </main>
  )
}

function makeTask(mode: PracticeMode, prev?: PracticeKind): PracticeTask {
  if (mode !== 'mix') return PRACTICE_BY_KIND.get(mode)!.make()
  const pool = PRACTICE.filter((x) => x.kind !== prev)
  return pool[Math.floor(Math.random() * pool.length)].make()
}

async function record(kind: PracticeKind, correct: boolean) {
  await bumpDay({ warmupTotal: 1, warmupCorrect: correct ? 1 : 0 })
  await db.transaction('rw', db.kv, async () => {
    const st = ((await db.kv.get(STATS_KEY))?.value as Stats) ?? {}
    const cur = st[kind] ?? { done: 0, correct: 0 }
    st[kind] = { done: cur.done + 1, correct: cur.correct + (correct ? 1 : 0) }
    await db.kv.put({ key: STATS_KEY, value: st })
  })
}

const parse = (s: string) => Number(s.replace(',', '.').replace(/[−–—]/g, '-').replace(/\s/g, ''))

export function PracticeRun({ mode, onClose }: { mode: PracticeMode; onClose: () => void }) {
  const [task, setTask] = useState(() => makeTask(mode))
  const [vals, setVals] = useState<string[]>([])
  const [chosen, setChosen] = useState<number | null>(null)
  const [outcome, setOutcome] = useState<'good' | 'bad' | 'skip' | null>(null)
  const [hint, setHint] = useState(false)
  const [theory, setTheory] = useState(false)
  const [shown, setShown] = useState(0)
  const [score, setScore] = useState({ done: 0, correct: 0 })
  const started = useRef(Date.now())
  const bodyRef = useRef<HTMLDivElement>(null)
  const info = PRACTICE_BY_KIND.get(task.kind)!
  const { Icon } = ICONS[task.kind]
  const fields = task.fields ?? (task.answers ? ['Ответ'] : [])
  const signed = task.kind === 'linear' || task.kind === 'quadratic'
  const answered = outcome !== null
  const lesson = outcome === 'bad' || outcome === 'skip'

  useEffect(() => { if (shown > 1) bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' }) }, [shown])

  const finish = (o: 'good' | 'bad' | 'skip') => {
    setOutcome(o)
    setShown(o === 'good' ? 0 : 1)
    setScore((s) => ({ done: s.done + 1, correct: s.correct + (o === 'good' ? 1 : 0) }))
    record(task.kind, o === 'good')
  }

  const check = () => {
    const ans = task.answers ?? []
    const got = fields.map((_, i) => parse(vals[i] ?? ''))
    if (got.some((g) => Number.isNaN(g))) return finish('bad')
    const a = [...got].sort((x, y) => x - y), e = [...ans].sort((x, y) => x - y)
    finish(a.every((v, i) => v === e[i]) ? 'good' : 'bad')
  }

  const nextTask = (same: boolean) => {
    setTask(same ? PRACTICE_BY_KIND.get(task.kind)!.make() : makeTask(mode, task.kind))
    setVals([]); setChosen(null); setOutcome(null); setHint(false); setShown(0)
    bodyRef.current?.scrollTo({ top: 0 })
  }

  const close = async () => {
    const seconds = Math.min(Math.floor((Date.now() - started.current) / 1000), 60 * 90)
    if (score.done > 0) await bumpDay({ addSeconds: seconds })
    onClose()
  }

  const toggleSign = (i: number) => setVals((v) => {
    const c = [...v]; const s = (c[i] ?? '').trim()
    c[i] = s.startsWith('-') || s.startsWith('−') ? s.slice(1) : `-${s}`
    return c
  })

  const filled = fields.every((_, i) => (vals[i] ?? '').trim() && !Number.isNaN(parse(vals[i])))
  const allShown = shown >= task.steps.length

  return (
    <div className="session" role="dialog" aria-label="Задачи">
      <div className="session-top">
        <button className="icon-btn" onClick={close} aria-label="Закрыть"><X size={20} strokeWidth={2} /></button>
        <span className="practice-title">{mode === 'mix' ? 'Вперемешку' : info.title}</span>
        <span className="session-timer">{score.done ? `${score.correct} из ${score.done}` : ''}</span>
      </div>

      <div className="session-body fade-in" ref={bodyRef} key={task.prompt}>
        <div className="practice-head">
          {mode === 'mix' ? <span className="q-label"><Icon size={16} /> {info.title}</span> : <span />}
          <button className="btn btn-plain btn-sm" onClick={() => setTheory((t) => !t)} aria-expanded={theory}><BookOpen size={16} /> Как решать</button>
        </div>
        {theory && (
          <div className="theory">
            <span className="theory-title">Как решать такие задачи</span>
            <ul>{info.theory.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        )}

        {task.choices ? <p className="q-prompt is-long">{task.prompt}</p> : <p className="q-big">{task.prompt}</p>}

        {task.choices ? (
          <div className="options">
            {task.choices.map((c, i) => {
              const cls = answered ? (i === task.correctChoice ? 'is-correct' : i === chosen ? 'is-wrong' : 'is-dim') : ''
              return <button key={c} className={`option ${cls}`} disabled={answered} onClick={() => { setChosen(i); finish(i === task.correctChoice ? 'good' : 'bad') }}>{c}{answered && i === task.correctChoice && <Check size={20} />}</button>
            })}
          </div>
        ) : (
          <form className="options" onSubmit={(e) => { e.preventDefault(); if (!answered && filled) check() }}>
            {fields.map((f, i) => (
              <div className="field-row" key={f}>
                <input className={`field num ${outcome === 'good' ? 'is-correct' : outcome === 'bad' ? 'is-wrong' : ''}`} id={`practice-${i}`}
                  inputMode={signed ? 'text' : 'numeric'} autoComplete="off" autoFocus={i === 0} placeholder={f} aria-label={f}
                  value={vals[i] ?? ''} disabled={answered} onChange={(e) => setVals((v) => { const c = [...v]; c[i] = e.target.value; return c })} />
                {signed && <button type="button" className="sign-btn" disabled={answered} onClick={() => toggleSign(i)} aria-label="Поменять знак">±</button>}
              </div>
            ))}
            <button type="submit" hidden />
          </form>
        )}

        {hint && !answered && <div className="mnemonic"><span className="mnemonic-title"><Lightbulb size={16} /> Подсказка</span><p>{task.hint}</p></div>}

        {answered && (
          <div className={`feedback ${outcome === 'good' ? 'is-good' : outcome === 'skip' ? 'is-info' : 'is-bad'}`}>
            <span className="feedback-title">{outcome === 'good' ? <><Check size={18} /> Верно</> : outcome === 'skip' ? 'Разберём вместе' : 'Пока не так'}</span>
            <p>{outcome === 'good' ? task.result : lesson && allShown ? task.result : 'Идём по шагам — нажимайте «Следующий шаг».'}</p>
          </div>
        )}

        {shown > 0 && (
          <ol className="steps" aria-label="Решение по шагам">
            {task.steps.slice(0, shown).map((s, i) => <li key={i} className="fade-in">{s}</li>)}
          </ol>
        )}
      </div>

      <div className="session-foot">
        {!answered && !task.choices && (
          <button className="btn btn-primary btn-block" disabled={!filled} onClick={check}>Проверить</button>
        )}
        {!answered && (
          <div className="foot-row">
            <button className="btn btn-plain" onClick={() => setHint(true)} disabled={hint}><Lightbulb size={18} /> Подсказка</button>
            <button className="btn btn-plain" onClick={() => finish('skip')}>Не знаю — объясни</button>
          </div>
        )}
        {answered && lesson && !allShown && (
          <>
            <button className="btn btn-primary btn-block" onClick={() => setShown((n) => n + 1)}>Следующий шаг · {shown + 1} из {task.steps.length}</button>
            <button className="btn btn-plain" onClick={() => setShown(task.steps.length)}>Показать всё решение</button>
          </>
        )}
        {answered && (!lesson || allShown) && (
          <>
            <button className="btn btn-primary btn-block" onClick={() => nextTask(lesson)}>{lesson ? 'Попробовать похожую' : 'Следующая задача'}</button>
            {!lesson && !allShown && <button className="btn btn-plain" onClick={() => setShown(task.steps.length)}>Показать решение</button>}
          </>
        )}
      </div>
    </div>
  )
}
