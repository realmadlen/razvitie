import { useState } from 'react'
import { House, BookOpen, ChartColumn, Settings as Cog } from 'lucide-react'
import { StoreProvider, useStore } from './store'
import { Today } from './screens/Today'
import { Topics, TopicSheet, MonthPicker } from './screens/Topics'
import { Progress } from './screens/Progress'
import { SettingsScreen } from './screens/Settings'
import { Onboarding } from './screens/Onboarding'
import { Session } from './screens/Session'
import type { Plan } from './session'

type Tab = 'today' | 'topics' | 'progress' | 'settings'

const TABS: { id: Tab; label: string; Icon: typeof House }[] = [
  { id: 'today', label: 'Сегодня', Icon: House },
  { id: 'topics', label: 'Темы', Icon: BookOpen },
  { id: 'progress', label: 'Прогресс', Icon: ChartColumn },
  { id: 'settings', label: 'Настройки', Icon: Cog },
]

function Shell() {
  const { ready, settings } = useStore()
  const [tab, setTab] = useState<Tab>('today')
  const [session, setSession] = useState<{ plan: Plan; extra: boolean } | null>(null)
  const [topic, setTopic] = useState<string | null>(null)
  const [picker, setPicker] = useState(false)
  const [refresh, setRefresh] = useState(0)

  if (!ready) return null
  if (!settings.onboarded) return <Onboarding />

  return (
    <div className="app">
      {tab === 'today' && <Today refreshKey={refresh} onStart={(plan, extra) => setSession({ plan, extra })} onPickMonth={() => setPicker(true)} onOpenTopic={setTopic} />}
      {tab === 'topics' && <Topics onOpenTopic={setTopic} onPickMonth={() => setPicker(true)} />}
      {tab === 'progress' && <Progress />}
      {tab === 'settings' && <SettingsScreen />}

      <nav className="tabbar" aria-label="Разделы">
        <div className="tabbar-inner">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} className="tab" aria-current={tab === id ? 'page' : undefined} onClick={() => { setTab(id); window.scrollTo(0, 0) }}>
              <Icon size={24} strokeWidth={tab === id ? 2.2 : 1.75} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {topic && <TopicSheet id={topic} onClose={() => { setTopic(null); setRefresh((n) => n + 1) }} />}
      {picker && <MonthPicker onClose={() => { setPicker(false); setRefresh((n) => n + 1) }} />}
      {session && <Session plan={session.plan} extra={session.extra} onDone={() => { setSession(null); setRefresh((n) => n + 1) }} />}
    </div>
  )
}

export default function App() {
  return <StoreProvider><Shell /></StoreProvider>
}
