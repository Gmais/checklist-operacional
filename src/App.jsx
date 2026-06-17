import { useState } from 'react'
import HojePage from './pages/HojePage'
import AtividadesPage from './pages/AtividadesPage'
import FeriadosPage from './pages/FeriadosPage'

const TABS = [
  { key: 'hoje', label: 'Hoje', icon: HojeIcon },
  { key: 'atividades', label: 'Atividades', icon: AtividadesIcon },
  { key: 'feriados', label: 'Feriados', icon: FeriadosIcon },
]

export default function App() {
  const [tab, setTab] = useState('hoje')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-950)', display: 'flex', flexDirection: 'column' }}>
      <TopBar />

      <main style={{ flex: 1 }}>
        {tab === 'hoje' && <HojePage />}
        {tab === 'atividades' && <AtividadesPage />}
        {tab === 'feriados' && <FeriadosPage />}
      </main>

      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--bg-900)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-around',
          padding: '8px 8px calc(8px + env(safe-area-inset-bottom))',
          zIndex: 10,
        }}
      >
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                background: 'transparent',
                border: 'none',
                color: active ? 'var(--amber)' : 'var(--text-tertiary)',
                padding: '6px 4px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              <Icon active={active} />
              <span style={{ fontSize: 11 }}>{t.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function TopBar() {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '16px 16px 0',
        maxWidth: 720,
        margin: '0 auto',
        width: '100%',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: 'var(--amber)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          color: '#0a0a0a',
          fontSize: 15,
          flexShrink: 0,
        }}
      >
        ✓
      </div>
      <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: 0.2 }}>Checklist Operacional</span>
    </header>
  )
}

function HojeIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth={active ? 2.4 : 2} />
      <path d="M3 9h18" stroke="currentColor" strokeWidth={active ? 2.4 : 2} />
      <path d="M8 13l1.5 1.5L13 11" stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AtividadesIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M9 6h11M9 12h11M9 18h11" stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" />
      <circle cx="4.5" cy="6" r="1.6" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1.6" fill="currentColor" />
      <circle cx="4.5" cy="18" r="1.6" fill="currentColor" />
    </svg>
  )
}

function FeriadosIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth={active ? 2.4 : 2} />
      <path d="M3 10h18" stroke="currentColor" strokeWidth={active ? 2.4 : 2} />
      <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" />
    </svg>
  )
}
