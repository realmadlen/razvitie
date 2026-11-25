import { useRef, useState } from 'react'
import { Loader2, Check, Download, Upload, Copy } from 'lucide-react'
import { useStore } from '../store'
import { exportAll, importAll, resetAll, type ThemePref } from '../db'
import { AI_MODELS, testKey, AiError } from '../ai'

export function SettingsScreen() {
  const { settings, update } = useStore()
  const [key, setKey] = useState(settings.aiKey)
  const [aiState, setAiState] = useState<{ busy?: boolean; ok?: string; err?: string }>({})
  const [backup, setBackup] = useState<{ text?: string; msg?: string; err?: string }>({})
  const [confirmReset, setConfirmReset] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const saveKey = async () => {
    setAiState({ busy: true })
    try {
      if (key.trim()) await testKey(key.trim(), settings.aiModel)
      await update({ aiKey: key.trim() })
      setAiState({ ok: key.trim() ? 'Ключ работает и сохранён на этом устройстве.' : 'Ключ удалён.' })
    } catch (e) {
      setAiState({ err: e instanceof AiError ? e.message : 'Не удалось проверить ключ.' })
    }
  }

  const doExport = async () => {
    const json = await exportAll()
    const name = `razvitie-${new Date().toISOString().slice(0, 10)}.json`
    try {
      const file = new File([json], name, { type: 'application/json' })
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Резервная копия' }); setBackup({ msg: 'Копия готова.' }); return }
      const a = document.createElement('a')
      a.href = URL.createObjectURL(file); a.download = name; a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 2000)
      setBackup({ msg: 'Файл копии скачан. Если ничего не произошло, скопируйте текст ниже.', text: json })
    } catch {
      setBackup({ msg: 'Скопируйте текст копии и сохраните его в заметки.', text: json })
    }
  }

  const doImport = async (file: File) => {
    try { await importAll(await file.text()); location.reload() }
    catch (e) { setBackup({ err: e instanceof Error ? e.message : 'Не удалось прочитать файл.' }) }
  }

  return (
    <main className="screen">
      <header className="screen-head"><h1>Настройки</h1></header>

      <section className="section">
        <h2>Оформление</h2>
        <div className="segmented" role="group" aria-label="Тема">
          {([['system', 'Как в системе'], ['light', 'Светлая'], ['dark', 'Тёмная']] as [ThemePref, string][]).map(([v, l]) => (
            <button key={v} aria-pressed={settings.theme === v} onClick={() => update({ theme: v })}>{l}</button>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Занятие</h2>
        <div className="segmented" role="group" aria-label="Длительность занятия">
          {([15, 30] as const).map((m) => <button key={m} aria-pressed={settings.sessionMinutes === m} onClick={() => update({ sessionMinutes: m })}>{m} минут</button>)}
        </div>
        <p className="note">При 30 минутах приложение даёт почти вдвое больше нового. Повторения в обоих случаях приходят по расписанию. Сколько нового в день по каждой теме — на странице темы.</p>
      </section>

      <section className="section">
        <h2>ИИ-помощник</h2>
        <p className="section-sub">По желанию. С ключом Claude API приложение придумывает ассоциации, предлагает новые темы и составляет к ним карточки.</p>
        <div className="group" style={{ padding: 16, display: 'grid', gap: 12 }}>
          <label className="row-title" htmlFor="ai-key">Ключ Claude API</label>
          <input id="ai-key" className="field field-sm" type="password" autoComplete="off" placeholder="sk-ant-…" value={key} onChange={(e) => setKey(e.target.value)} />
          <label className="row-title" htmlFor="ai-model">Модель</label>
          <select id="ai-model" className="field field-sm" value={settings.aiModel} onChange={(e) => update({ aiModel: e.target.value })}>
            {AI_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" style={{ width: 'fit-content' }} onClick={saveKey} disabled={aiState.busy || key.trim() === settings.aiKey}>
            {aiState.busy ? <><Loader2 size={16} className="spin" /> Проверяем…</> : <><Check size={16} /> Сохранить</>}
          </button>
          {aiState.ok && <p className="ok">{aiState.ok}</p>}
          {aiState.err && <p className="err">{aiState.err}</p>}
          <p className="note">Ключ создаётся на console.anthropic.com → API Keys. Он хранится только на этом телефоне и не попадает в резервную копию. Запросы оплачиваются по вашему тарифу Anthropic — ассоциация стоит доли цента.</p>
        </div>
      </section>

      <section className="section">
        <h2>Данные</h2>
        <p className="section-sub">Всё хранится на этом устройстве. Делайте резервную копию раз в месяц.</p>
        <div className="group">
          <button className="row" onClick={doExport}><Download size={20} style={{ color: 'var(--accent)' }} /><div className="row-main"><span className="row-title">Сохранить резервную копию</span></div></button>
          <button className="row" onClick={() => fileRef.current?.click()}><Upload size={20} style={{ color: 'var(--accent)' }} /><div className="row-main"><span className="row-title">Восстановить из копии</span><span className="row-sub">Текущие данные заменятся данными из файла</span></div></button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden id="import-file" onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f) }} />
        {backup.msg && <p className="ok">{backup.msg}</p>}
        {backup.err && <p className="err">{backup.err}</p>}
        {backup.text && (
          <div style={{ display: 'grid', gap: 8 }}>
            <textarea className="field" id="backup-text" readOnly value={backup.text} onFocus={(e) => e.currentTarget.select()} style={{ fontSize: 12, minHeight: 120 }} />
            <button className="btn btn-quiet btn-sm" style={{ width: 'fit-content' }} onClick={() => navigator.clipboard?.writeText(backup.text!).then(() => setBackup((b) => ({ ...b, msg: 'Скопировано.' })), () => setBackup((b) => ({ ...b, msg: 'Выделите текст и скопируйте вручную.' })))}><Copy size={16} /> Скопировать</button>
          </div>
        )}
      </section>

      <section className="section">
        <h2>Сброс</h2>
        {!confirmReset ? (
          <button className="btn btn-danger btn-sm" style={{ width: 'fit-content' }} onClick={() => setConfirmReset(true)}>Удалить весь прогресс</button>
        ) : (
          <div className="banner" style={{ background: 'var(--bad-soft)' }}>
            <p>Удалить все карточки, историю и настройки? Отменить это нельзя.</p>
            <div className="inline-confirm">
              <button className="btn btn-danger btn-sm" onClick={async () => { await resetAll(); location.reload() }}>Да, удалить</button>
              <button className="btn btn-plain btn-sm" onClick={() => setConfirmReset(false)}>Отмена</button>
            </div>
          </div>
        )}
      </section>

      <p className="note" style={{ textAlign: 'center' }}>Развитие · версия 1.0 · интервальное повторение FSRS</p>
    </main>
  )
}
