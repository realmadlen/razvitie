import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Офлайн-режим: сервис-воркер регистрируется только в установленной версии
if (import.meta.env.PROD && !import.meta.env.VITE_SINGLEFILE && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({
    immediate: true,
    // Проверяем обновление при каждом возвращении в приложение и раз в полчаса —
    // на телефоне установленное приложение может неделями не перезапускаться
    onRegisteredSW(_url, r) {
      if (!r) return
      const check = () => { if (navigator.onLine) r.update().catch(() => {}) }
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
      setInterval(check, 30 * 60 * 1000)
    },
  })).catch(() => {})
}
