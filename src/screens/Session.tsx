import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Check, Lightbulb, Sparkles, ArrowUp, ArrowDown, MapPin, Brain, Compass, Heart, Loader2, PartyPopper, Pencil, BookOpen, ChevronLeft } from 'lucide-react'
import { db, bumpDay, type CardRow } from '../db'
import { useStore } from '../store'
import { getModule, checkTyped, topicTitle, type Question, type OrderTask, type Intro } from '../content/topics'
import { findLesson } from '../content/lessons'
import { TOPIC_BY_ID, type Discovery } from '../content/catalog'
import { review, gradeFrom, newCardRow, memoryIndex } from '../srs'
import type { Plan, Step } from '../session'
import { WorldMap } from '../components/WorldMap'
import { makeMnemonic, AiError } from '../ai'

export interface SessionResult { answered: number; correct: number; newItems: number; seconds: number; completed: boolean; extra: boolean }

interface Props { plan: Plan; extra?: boolean; onDone: (r: SessionResult) => void }

type Phase = 'ask' | 'answered'

export function Session({ plan, extra = false, onDone }: Props) {
  const [queue, setQueue] = useState<Step[]>(plan.steps)
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('ask')
  const [stats, setStats] = useState({ answered: 0, correct: 0, newItems: 0 })
  const [finished, setFinished] = useState(false)
  const started = useRef(Date.now())
  const requeued = useRef(new Map<string, number>())
  const [, tick] = useState(0)

  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t) }, [])

  const step = queue[idx]
  const total = queue.length
  const elapsed = Math.floor((Date.now() - started.current) / 1000)

  const saveTime = async (completed: boolean) => {
    const seconds = Math.min(Math.floor((Date.now() - started.current) / 1000), 60 * 90)
    await bumpDay({ addSeconds: seconds })
    if (completed && !extra) await bumpDay({ completed: true })
    const mi = await memoryIndex()
    if (mi.count) await bumpDay({ retention: mi.value })
    return seconds
  }

  const next = () => {
    if (idx + 1 >= queue.length) { setFinished(true); return }
    setIdx(idx + 1)
    setPhase('ask')
  }

  const onAnswered = (r: { correct: boolean; cardId?: string; again?: boolean; isNew?: boolean }) => {
    setPhase('answered')
    setStats((s) => ({ ...s, answered: s.answered + 1, correct: s.correct + (r.correct ? 1 : 0) }))
    // Ошибка — карточка вернётся в конце занятия (не больше двух раз)
    if (r.cardId && r.again) {
      const n = requeued.current.get(r.cardId) ?? 0
      if (n < 2) {
        requeued.current.set(r.cardId, n + 1)
        setQueue((q) => {
          const copy = [...q]
          const pos = Math.min(copy.length, idx + 4 + Math.floor(Math.random() * 3))
          copy.splice(pos, 0, { t: 'review', cardId: r.cardId! })
          return copy
        })
      }
    }
  }

  const close = async () => {
    const seconds = await saveTime(false)
    onDone({ ...stats, seconds, completed: false, extra })
  }

  if (finished) return <Summary stats={stats} extra={extra} elapsed={elapsed} onClose={async () => { const seconds = await saveTime(true); onDone({ ...stats, seconds, completed: true, extra }) }} />

  const pct = total ? Math.round((idx / total) * 100) : 0

  return (
    <div className="session" role="dialog" aria-label="Занятие">
      <div className="session-top">
        <button className="icon-btn" onClick={close} aria-label="Завершить занятие"><X size={20} strokeWidth={2} /></button>
        <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
        <span className="session-timer">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>
      </div>
      {step && (
        <StepView key={`${idx}-${step.t}`} step={step} phase={phase} onAnswered={onAnswered} onNext={next}
          onNewItem={(n: number) => setStats((s) => ({ ...s, newItems: s.newItems + n }))} />
      )}
    </div>
  )
}

// ——— Шаги ———

interface StepProps { step: Step; phase: Phase; onAnswered: (r: { correct: boolean; cardId?: string; again?: boolean }) => void; onNext: () => void; onNewItem: (n: number) => void }

function StepView({ step, phase, onAnswered, onNext, onNewItem }: StepProps) {
  switch (step.t) {
    case 'lesson': return <LessonStep topicId={step.topicId} lessonId={step.lessonId} reread={step.reread} onNext={onNext} onNewItems={onNewItem} />
    case 'quiz-start': return <QuizStart title={step.title} onNext={onNext} />
    case 'review': return <ReviewStep cardId={step.cardId} phase={phase} onAnswered={onAnswered} onNext={onNext} />
    case 'order': return <OrderStep task={step.task} phase={phase} onAnswered={onAnswered} onNext={onNext} />
    case 'discovery': return <DiscoveryStep d={step.d} onNext={onNext} />
  }
}

function Foot({ children }: { children: React.ReactNode }) {
  return <div className="session-foot">{children}</div>
}

function NextButton({ onNext, label = 'Далее' }: { onNext: () => void; label?: string }) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  return <button ref={ref} className="btn btn-primary btn-block" onClick={onNext}>{label}</button>
}

// ——— Знакомство с новым ———

// ——— Урок ———

/** Текст урока: абзацы через пустую строку, **жирное** — главное */
export function RichText({ text }: { text: string }) {
  return (
    <div className="rich">
      {text.split(/\n\s*\n/).map((para, i) => (
        <p key={i}>{para.split(/(\*\*[^*]+\*\*)/g).map((part, j) => part.startsWith('**') && part.endsWith('**')
          ? <b key={j}>{part.slice(2, -2)}</b>
          : part.split('\n').map((line, k) => <span key={`${j}-${k}`}>{k > 0 && <br />}{line}</span>))}</p>
      ))}
    </div>
  )
}

function LessonFact({ intro }: { intro: Intro }) {
  const short = intro.facts.filter((f) => f.value.length <= 40)
  if (!intro.mapId && !short.length) return null
  return (
    <div className="lesson-fact">
      {intro.mapId && <WorldMap focusId={intro.mapId} highlightId={intro.mapId} span={48} height={190} label={`Карта: ${intro.title}`} />}
      {short.length > 0 && <dl className="facts">{short.map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>}
    </div>
  )
}

export function LessonStep({ topicId, lessonId, reread, onNext, onNewItems }: { topicId: string; lessonId: string; reread?: boolean; onNext: () => void; onNewItems?: (n: number) => void }) {
  const { decks } = useStore()
  const lesson = useMemo(() => findLesson(lessonId, topicId, decks), [lessonId, topicId, decks])
  const mod = getModule(topicId, decks)
  const [page, setPage] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [saving, setSaving] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bodyRef.current?.scrollTo({ top: 0 }) }, [page])

  if (!lesson || !mod) return <Missing onNext={onNext} />
  const total = lesson.pages.length + 1 // + итог
  const isSummary = page >= lesson.pages.length
  const pg = lesson.pages[page]
  const chosen = answers[page]
  const needAnswer = !isSummary && !!pg.check && chosen === undefined

  const finish = async () => {
    if (reread) return onNext()
    setSaving(true)
    // Урок прочитан — заводим карточки для повторения
    const rows = lesson.itemIds.flatMap((itemId) => mod.kinds(itemId).map((k) => newCardRow(topicId, itemId, k)))
    const existing = await db.cards.bulkGet(rows.map((r) => r.id))
    const fresh = rows.filter((_, i) => !existing[i])
    const freshItems = new Set(fresh.map((r) => r.itemId)).size
    if (fresh.length) { await db.cards.bulkPut(fresh); await bumpDay({ newItems: freshItems }); onNewItems?.(freshItems) }
    onNext()
  }

  return (
    <>
      <div className="session-body fade-in lesson" ref={bodyRef} key={page}>
        <div className="lesson-meta">
          <span className="new-badge"><BookOpen size={14} /> Урок · {TOPIC_BY_ID.get(topicId)?.title ?? topicTitle(topicId, decks)}</span>
          <span className="lesson-count num">{page + 1} / {total}</span>
        </div>
        {page === 0 && <header className="lesson-head"><h1>{lesson.title}</h1><p>{lesson.teaser}</p></header>}
        {isSummary ? (
          <>
            <h2 className="lesson-h">Главное из урока</h2>
            <div className="group">
              {lesson.itemIds.map((id) => (
                <div key={id} className="row"><div className="row-main"><span className="row-title">{mod.itemTitle(id)}</span><span className="row-sub">{mod.itemSub(id)}</span></div></div>
              ))}
            </div>
            <p className="note">{reread ? 'Можно вернуться к уроку в любой момент из раздела «Темы».' : 'Сейчас проверим, что запомнилось. Ошибаться можно — так память закрепляется лучше.'}</p>
          </>
        ) : (
          <>
            {pg.title && <h2 className="lesson-h">{pg.title}</h2>}
            {pg.itemId && <LessonFact intro={mod.intro(pg.itemId)} />}
            <RichText text={pg.text} />
            {pg.check && (
              <div className="lesson-check">
                <span className="mnemonic-title"><Brain size={16} /> Вопрос на понимание</span>
                <p className="lesson-check-q">{pg.check.q}</p>
                <div className="options">
                  {pg.check.options.map((o, i) => {
                    const cls = chosen === undefined ? '' : i === pg.check!.correct ? 'is-correct' : i === chosen ? 'is-wrong' : 'is-dim'
                    return <button key={o} className={`option ${cls}`} disabled={chosen !== undefined} onClick={() => setAnswers((a) => ({ ...a, [page]: i }))}>{o}{chosen !== undefined && i === pg.check!.correct && <Check size={20} />}</button>
                  })}
                </div>
                {chosen !== undefined && pg.check.why && <p className="note">{chosen === pg.check.correct ? 'Верно. ' : ''}{pg.check.why}</p>}
              </div>
            )}
          </>
        )}
      </div>
      <Foot>
        <div className="lesson-nav">
          {page > 0 && <button className="btn btn-quiet" onClick={() => setPage(page - 1)} aria-label="Назад"><ChevronLeft size={20} /></button>}
          {isSummary
            ? <button className="btn btn-primary btn-block" disabled={saving} onClick={finish}>{reread ? 'Готово' : 'Проверить себя'}</button>
            : <button className="btn btn-primary btn-block" disabled={needAnswer} onClick={() => setPage(page + 1)}>{needAnswer ? 'Выберите ответ' : 'Дальше'}</button>}
        </div>
      </Foot>
    </>
  )
}

function QuizStart({ title, onNext }: { title: string; onNext: () => void }) {
  return (
    <>
      <div className="session-body fade-in">
        <div className="quiz-start">
          <span className="summary-icon"><Check size={30} /></span>
          <h1>Урок пройден</h1>
          <p className="note">«{title}» — теперь несколько вопросов по нему. Дальше эти факты будут возвращаться на повторение ровно тогда, когда начнут забываться.</p>
        </div>
      </div>
      <Foot><NextButton onNext={onNext} label="Начать проверку" /></Foot>
    </>
  )
}

export function IntroCard({ intro }: { intro: Intro }) {
  const stacked = intro.facts.some((f) => f.value.length > 40)
  return (
    <div className="intro-card">
      {intro.mapId && <WorldMap focusId={intro.mapId} highlightId={intro.mapId} span={48} label={`Карта: ${intro.title}`} />}
      <h2>{intro.title}</h2>
      {intro.subtitle && <div className="sub">{intro.subtitle}</div>}
      {intro.body && <p>{intro.body}</p>}
      {intro.facts.length > 0 && (
        <dl className={`facts${stacked ? ' stack' : ''}`}>
          {intro.facts.map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
        </dl>
      )}
      <MnemonicBox topicId={intro.topicId} itemId={intro.itemId} text={intro.mnemonic} fact={`${intro.title}: ${intro.facts.map((f) => `${f.label} — ${f.value}`).join('; ')}`} />
    </div>
  )
}

/** Ассоциация с возможностью написать свою или попросить ИИ */
export function MnemonicBox({ topicId, itemId, text, fact }: { topicId: string; itemId: string; text?: string; fact: string }) {
  const { settings, update } = useStore()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const key = `${topicId}|${itemId}`

  const save = async (value: string) => {
    await update((s) => ({ mnemonics: { ...s.mnemonics, [key]: value.trim() } }))
    setEditing(false)
  }
  const ai = async () => {
    setBusy(true); setErr('')
    try { setDraft(await makeMnemonic(settings.aiKey, settings.aiModel, fact)); setEditing(true) }
    catch (e) { setErr(e instanceof AiError ? e.message : 'Не получилось. Попробуйте ещё раз.') }
    finally { setBusy(false) }
  }

  if (editing) return (
    <div className="mnemonic">
      <span className="mnemonic-title"><Lightbulb size={16} /> Своя ассоциация</span>
      <textarea className="field" id={`mn-${key}`} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Образ, созвучие, история — всё, что поможет вспомнить" />
      <div className="inline-confirm">
        <button className="btn btn-primary btn-sm" onClick={() => save(draft)} disabled={!draft.trim()}>Сохранить</button>
        <button className="btn btn-plain btn-sm" onClick={() => setEditing(false)}>Отмена</button>
      </div>
    </div>
  )
  return (
    <div className="mnemonic">
      <span className="mnemonic-title"><Lightbulb size={16} /> Ассоциация</span>
      {text ? <p>{text}</p> : <p className="note">Пока нет. Придумайте свою — свои ассоциации запоминаются лучше всего.</p>}
      <div className="inline-confirm">
        <button className="btn btn-plain btn-sm" style={{ paddingLeft: 0 }} onClick={() => { setDraft(text ?? ''); setEditing(true) }}><Pencil size={15} /> {text ? 'Своя' : 'Придумать'}</button>
        {settings.aiKey && <button className="btn btn-plain btn-sm" onClick={ai} disabled={busy}>{busy ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />} Спросить ИИ</button>}
      </div>
      {err && <p className="err">{err}</p>}
    </div>
  )
}

// ——— Повторение ———

function ReviewStep({ cardId, phase, onAnswered, onNext }: { cardId: string; phase: Phase; onAnswered: StepProps['onAnswered']; onNext: () => void }) {
  const { decks, settings } = useStore()
  const [card, setCard] = useState<CardRow | null | undefined>(undefined)
  const [known, setKnown] = useState<Set<string> | null>(null)
  useEffect(() => {
    const topicId = cardId.split('|')[0]
    db.cards.where('topicId').equals(topicId).toArray().then((rows) => setKnown(new Set(rows.map((r) => r.itemId))))
    // Карточка нового элемента может ещё не успеть записаться — тогда создаём её здесь
    db.cards.get(cardId).then(async (c) => {
      if (c) return setCard(c)
      const [topicId, itemId, kind] = cardId.split('|')
      if (!topicId || !itemId || !kind || !getModule(topicId, decks)) return setCard(null)
      const row = newCardRow(topicId, itemId, kind)
      await db.cards.put(row)
      setCard(row)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId])
  const mod = card ? getModule(card.topicId, decks) : null
  const q = useMemo(() => {
    if (!card || !mod || !known) return null
    try { return mod.question(card, settings.mnemonics[`${card.topicId}|${card.itemId}`], known) } catch { return null }
    // вопрос создаётся один раз на шаг
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id, mod, known])

  if (card === undefined || (card && !known)) return <div className="session-body" />
  if (!card || !q) return <Missing onNext={onNext} />

  const submit = async (correct: boolean, usedHint: boolean, ms: number, typed: boolean) => {
    const grade = gradeFrom(correct, usedHint, ms, typed)
    onAnswered({ correct, cardId: card.id, again: !correct })
    await review(card, grade, correct, ms)
  }

  return <QuestionView q={q} isNew={card.reps === 0} phase={phase} onSubmit={submit} onNext={onNext} />
}

function QuestionView({ q, isNew, phase, onSubmit, onNext }: { q: Question; isNew: boolean; phase: Phase; onSubmit: (correct: boolean, hint: boolean, ms: number, typed: boolean) => void; onNext: () => void }) {
  const t0 = useRef(Date.now())
  const [chosen, setChosen] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [verdict, setVerdict] = useState<'exact' | 'typo' | 'wrong' | null>(null)
  const [hint, setHint] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const offset = useMemo<[number, number]>(() => [Math.random() * 2 - 1, Math.random() * 2 - 1], [])

  const ms = () => Date.now() - t0.current
  const correct = q.type === 'choice' ? chosen === q.correct : q.type === 'typed' ? verdict === 'exact' || verdict === 'typo' : picked === (q.type === 'map' ? q.targetId : '')
  const long = q.prompt.length > 70
  const Icon = q.topicId === 'countries' ? (q.type === 'map' ? MapPin : Compass) : q.topicId === 'biases' ? Brain : Sparkles

  return (
    <>
      <div className="session-body fade-in">
        <span className="q-label"><Icon size={16} /> {q.label}{isNew ? ' · новое' : ''}</span>
        <p className={`q-prompt${long ? ' is-long' : ''}`}>{q.prompt}</p>

        {q.type === 'choice' && (
          <div className="options">
            {q.options.map((o, i) => {
              const cls = phase === 'answered' ? (i === q.correct ? 'is-correct' : i === chosen ? 'is-wrong' : 'is-dim') : ''
              return (
                <button key={`${o}-${i}`} className={`option ${cls}`} disabled={phase === 'answered'}
                  onClick={() => { setChosen(i); onSubmit(i === q.correct, hint, ms(), false) }}>
                  {o}{phase === 'answered' && i === q.correct && <Check size={20} />}
                </button>
              )
            })}
          </div>
        )}

        {q.type === 'typed' && (
          <form onSubmit={(e) => { e.preventDefault(); if (phase === 'ask' && text.trim()) { const v = checkTyped(text, q.answers); setVerdict(v); onSubmit(v !== 'wrong', hint, ms(), true) } }}>
            <input className={`field ${verdict === 'wrong' ? 'is-wrong' : verdict ? 'is-correct' : ''}`} id="typed-answer" autoFocus autoComplete="off" autoCapitalize="sentences" spellCheck={false}
              inputMode={q.inputMode === 'numeric' ? 'numeric' : 'text'} placeholder="Ваш ответ" value={text} onChange={(e) => setText(e.target.value)} disabled={phase === 'answered'} />
            <button type="submit" hidden />
          </form>
        )}

        {q.type === 'map' && (
          <WorldMap focusId={q.targetId} span={34} height={300} offset={offset}
            onPick={phase === 'ask' ? (id) => { setPicked(id); onSubmit(id === q.targetId, hint, ms(), false) } : undefined}
            highlightId={phase === 'answered' ? q.targetId : undefined}
            wrongId={phase === 'answered' && picked !== q.targetId ? picked ?? undefined : undefined}
            label="Нажмите на страну" />
        )}

        {hint && phase === 'ask' && (
          <div className="mnemonic"><span className="mnemonic-title"><Lightbulb size={16} /> Подсказка</span>
            <p>{q.type === 'typed' ? `Начинается на «${q.display.slice(0, Math.max(1, Math.ceil(q.display.length / 4)))}…». ` : ''}{q.mnemonic ?? 'Для этой карточки ассоциации пока нет.'}</p>
          </div>
        )}

        {phase === 'answered' && (
          <>
            <div className={`feedback ${correct ? 'is-good' : 'is-bad'}`}>
              <span className="feedback-title">{correct ? <><Check size={18} /> {verdict === 'typo' ? `Засчитано, правильно: ${q.type === 'typed' ? q.display : ''}` : 'Верно'}</> : q.type === 'typed' ? `Правильно: ${q.display}` : 'Не совсем'}</span>
              <p>{q.explain}</p>
            </div>
            {q.type !== 'map' && q.mapId && !correct && <WorldMap focusId={q.mapId} highlightId={q.mapId} span={44} height={200} />}
            {(!correct || isNew) && q.mnemonic && <div className="mnemonic"><span className="mnemonic-title"><Lightbulb size={16} /> Ассоциация</span><p>{q.mnemonic}</p></div>}
          </>
        )}
      </div>
      <Foot>
        {phase === 'ask' && (
          <>
            {q.type === 'typed' && <button className="btn btn-primary btn-block" disabled={!text.trim()} onClick={() => { const v = checkTyped(text, q.answers); setVerdict(v); onSubmit(v !== 'wrong', hint, ms(), true) }}>Проверить</button>}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {!hint ? <button className="btn btn-plain" onClick={() => setHint(true)}><Lightbulb size={18} /> Подсказка</button> : <span />}
              <button className="btn btn-plain" onClick={() => { setVerdict('wrong'); setChosen(-1); setPicked(''); onSubmit(false, hint, ms(), q.type === 'typed') }}>Не помню</button>
            </div>
          </>
        )}
        {phase === 'answered' && <NextButton onNext={onNext} />}
      </Foot>
    </>
  )
}

// ——— Упорядочивание ———

function OrderStep({ task, phase, onAnswered, onNext }: { task: OrderTask; phase: Phase; onAnswered: StepProps['onAnswered']; onNext: () => void }) {
  const [items, setItems] = useState(task.items)
  const sorted = useMemo(() => [...task.items].sort((a, b) => a.key - b.key), [task.items])
  const move = (i: number, d: number) => setItems((xs) => { const c = [...xs]; [c[i], c[i + d]] = [c[i + d], c[i]]; return c })
  const allRight = items.every((it, i) => it.label === sorted[i].label)

  return (
    <>
      <div className="session-body fade-in">
        <span className="q-label"><ArrowDown size={16} /> {TOPIC_BY_ID.get(task.topicId)?.title}</span>
        <p className="q-prompt is-long">{task.prompt}</p>
        <div className="order-list">
          {(phase === 'answered' ? sorted : items).map((it, i) => {
            const cls = phase === 'answered' ? (items[i].label === it.label ? 'is-correct' : 'is-wrong') : ''
            return (
              <div key={it.label} className={`order-item ${cls}`}>
                <span className="order-pos">{i + 1}</span>
                <div className="row-main"><span className="row-title">{it.label}</span>{phase === 'answered' && <span className="row-sub">{it.sub}</span>}</div>
                {phase === 'ask' && (
                  <div className="order-move">
                    <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Выше"><ArrowUp size={18} /></button>
                    <button onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Ниже"><ArrowDown size={18} /></button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {phase === 'answered' && <div className={`feedback ${allRight ? 'is-good' : 'is-bad'}`}><span className="feedback-title">{allRight ? <><Check size={18} /> Всё по порядку</> : 'Правильный порядок выше'}</span></div>}
      </div>
      <Foot>
        {phase === 'ask' ? <button className="btn btn-primary btn-block" onClick={() => onAnswered({ correct: allRight })}>Проверить</button> : <NextButton onNext={onNext} />}
      </Foot>
    </>
  )
}

// ——— Открытие дня ———

function DiscoveryStep({ d, onNext }: { d: Discovery; onNext: () => void }) {
  const { settings, update } = useStore()
  const topic = TOPIC_BY_ID.get(d.topicId)
  const wished = settings.wishlist.includes(d.topicId)
  useEffect(() => { update((s) => ({ seenDiscoveries: s.seenDiscoveries.includes(d.id) ? s.seenDiscoveries : [...s.seenDiscoveries, d.id] })) }, [d.id, update])
  return (
    <>
      <div className="session-body fade-in">
        <span className="q-label"><Sparkles size={16} /> Открытие дня · {topic?.area}</span>
        <div className="discovery">
          <h2>{d.title}</h2>
          <p>{d.text}</p>
          {topic && <p className="note">Из темы «{topic.title}»</p>}
        </div>
      </div>
      <Foot>
        <button className={`btn btn-block ${wished ? 'btn-secondary' : 'btn-quiet'}`} onClick={() => update((s) => ({ wishlist: wished ? s.wishlist.filter((x) => x !== d.topicId) : [...s.wishlist, d.topicId] }))}>
          <Heart size={18} fill={wished ? 'currentColor' : 'none'} /> {wished ? 'Тема в списке желаний' : 'Хочу изучить эту тему'}
        </button>
        <NextButton onNext={onNext} label="Завершить занятие" />
      </Foot>
    </>
  )
}

function Missing({ onNext }: { onNext: () => void }) {
  return (
    <>
      <div className="session-body"><div className="empty"><b>Карточка недоступна</b><span>Возможно, тема была удалена. Переходим дальше.</span></div></div>
      <Foot><NextButton onNext={onNext} /></Foot>
    </>
  )
}

// ——— Итог ———

function Summary({ stats, extra, elapsed, onClose }: { stats: { answered: number; correct: number; newItems: number }; extra: boolean; elapsed: number; onClose: () => void }) {
  const acc = stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0
  const mins = Math.max(1, Math.round(elapsed / 60))
  return (
    <div className="session" role="dialog" aria-label="Итог занятия">
      <div />
      <div className="session-body">
        <div className="summary fade-in">
          <span className="summary-icon"><PartyPopper size={34} /></span>
          <h1>{extra ? 'Ещё немного — готово' : 'Занятие выполнено'}</h1>
          <p className="note">Каждое повторение отодвигает забывание. Карточки вернутся ровно тогда, когда начнут забываться.</p>
          <div className="stats">
            <div className="stat"><b className="num">{mins} мин</b><span>занятие</span></div>
            <div className="stat"><b className="num">{acc}%</b><span>верных ответов</span></div>
            <div className="stat"><b className="num">{stats.answered}</b><span>ответов</span></div>
            <div className="stat"><b className="num">{stats.newItems}</b><span>новых фактов</span></div>
          </div>
        </div>
      </div>
      <Foot><button className="btn btn-primary btn-block" onClick={onClose}>Готово</button></Foot>
    </div>
  )
}
