import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { db, loadSettings, saveSettings, DEFAULT_SETTINGS, type Settings, type AiDeck } from './db'
import { useLiveQuery } from 'dexie-react-hooks'

interface Store {
  ready: boolean
  settings: Settings
  update: (patch: Partial<Settings> | ((s: Settings) => Partial<Settings>)) => Promise<void>
  decks: AiDeck[]
}

const Ctx = createContext<Store>({ ready: false, settings: DEFAULT_SETTINGS, update: async () => {}, decks: [] })

export function StoreProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)
  const ref = useRef<Settings>(DEFAULT_SETTINGS)
  const decks = useLiveQuery(() => db.decks.toArray(), [], [] as AiDeck[])

  useEffect(() => {
    loadSettings().then((s) => { ref.current = s; setSettings(s); setReady(true) }).catch(() => setReady(true))
  }, [])

  const update = useCallback(async (patch: Partial<Settings> | ((s: Settings) => Partial<Settings>)) => {
    const cur = ref.current
    const next: Settings = { ...cur, ...(typeof patch === 'function' ? patch(cur) : patch) }
    ref.current = next
    setSettings(next)
    await saveSettings(next)
  }, [])

  // Тема: системная, светлая или тёмная
  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === 'system') root.removeAttribute('data-app-theme')
    else root.setAttribute('data-app-theme', settings.theme)
  }, [settings.theme])

  return <Ctx.Provider value={{ ready, settings, update, decks }}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)
