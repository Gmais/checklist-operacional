import { useState } from 'react'
import { validarSenhaDoDia } from '../lib/senha'

const CHAVE_SESSAO = 'checklist_admin_desbloqueado'

// Bloqueia o acesso ao conteúdo (children) até a senha do dia ser informada.
// O desbloqueio vale para a sessão do navegador inteira (sessionStorage) —
// uma vez digitada em Atividades ou Feriados, não pede de novo na outra aba.
export default function AcessoProtegido({ children }) {
  const [desbloqueado, setDesbloqueado] = useState(() => sessionStorage.getItem(CHAVE_SESSAO) === '1')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')

  if (desbloqueado) return children

  function handleSubmit(e) {
    e.preventDefault()
    if (validarSenhaDoDia(senha)) {
      sessionStorage.setItem(CHAVE_SESSAO, '1')
      setDesbloqueado(true)
    } else {
      setErro('Código inválido')
      setSenha('')
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 16px', display: 'flex', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 280, textAlign: 'center' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'var(--bg-800)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--text-secondary)' }}>
          Área restrita. Informe o código de acesso.
        </p>
        <input
          type="password"
          autoFocus
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          inputMode="numeric"
          placeholder="Código"
          style={{
            width: '100%',
            background: 'var(--bg-800)',
            border: `1px solid ${erro ? 'var(--red)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
            color: 'var(--text-primary)',
            fontSize: 16,
            letterSpacing: 4,
            textAlign: 'center',
          }}
        />
        {erro && <p style={{ color: 'var(--red)', fontSize: 13, margin: '8px 0 0' }}>{erro}</p>}
        <button
          type="submit"
          style={{
            width: '100%',
            marginTop: 14,
            background: 'var(--amber)',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            padding: '11px 14px',
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Entrar
        </button>
      </form>
    </div>
  )
}
