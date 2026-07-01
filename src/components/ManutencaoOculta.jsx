import { useRef, useState } from 'react'
import { contarOcorrenciasAtrasadas, limparOcorrenciasAtrasadas } from '../lib/dataService'

// Senha dinâmica: dia do mês atual, com e sem zero à esquerda (ex: dia 5 aceita "5" e "05").
function senhaValidaHoje() {
  const dia = new Date().getDate()
  return [String(dia), String(dia).padStart(2, '0')]
}

const TAPS_PARA_ABRIR = 5
const JANELA_MS = 2500

// Envolve qualquer elemento (ex: o logo do app) e o transforma num gatilho
// invisível: some sequência de N toques rápidos abre o modal de manutenção.
// Nenhuma pista visual é exibida — o elemento filho não muda em nada.
export default function ManutencaoOculta({ children }) {
  const tapsRef = useRef([])
  const [modalAberto, setModalAberto] = useState(false)

  function registrarToque() {
    const agora = Date.now()
    tapsRef.current = [...tapsRef.current, agora].filter((t) => agora - t < JANELA_MS)
    if (tapsRef.current.length >= TAPS_PARA_ABRIR) {
      tapsRef.current = []
      setModalAberto(true)
    }
  }

  return (
    <>
      <div onClick={registrarToque} style={{ cursor: 'default' }}>
        {children}
      </div>
      {modalAberto && <ModalManutencao onClose={() => setModalAberto(false)} />}
    </>
  )
}

function ModalManutencao({ onClose }) {
  const [etapa, setEtapa] = useState('senha') // senha | confirmar | concluido
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [qtdAtrasadas, setQtdAtrasadas] = useState(0)
  const [qtdRemovida, setQtdRemovida] = useState(0)

  async function validarSenha(e) {
    e.preventDefault()
    if (!senhaValidaHoje().includes(senha.trim())) {
      setErro('Código inválido')
      setSenha('')
      return
    }
    setErro('')
    setCarregando(true)
    try {
      const qtd = await contarOcorrenciasAtrasadas()
      setQtdAtrasadas(qtd)
      setEtapa('confirmar')
    } catch {
      setErro('Erro ao consultar dados')
    } finally {
      setCarregando(false)
    }
  }

  async function confirmarLimpeza() {
    setCarregando(true)
    try {
      const qtd = await limparOcorrenciasAtrasadas()
      setQtdRemovida(qtd)
      setEtapa('concluido')
    } catch {
      setErro('Erro ao remover ocorrências')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-900)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
          width: '100%',
          maxWidth: 340,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {etapa === 'senha' && (
          <form onSubmit={validarSenha}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Manutenção</h3>
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
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" onClick={onClose} style={botaoSecundario}>
                Cancelar
              </button>
              <button type="submit" disabled={carregando} style={botaoPrimario}>
                {carregando ? '...' : 'Entrar'}
              </button>
            </div>
          </form>
        )}

        {etapa === 'confirmar' && (
          <div>
            <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700 }}>Limpar atividades atrasadas</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5, margin: '0 0 18px' }}>
              {qtdAtrasadas === 0
                ? 'Não há ocorrências atrasadas pendentes no momento.'
                : `Serão removidas ${qtdAtrasadas} ocorrência${qtdAtrasadas === 1 ? '' : 's'} pendente${qtdAtrasadas === 1 ? '' : 's'} e não realizada${qtdAtrasadas === 1 ? '' : 's'} com data já passada. Ocorrências futuras e itens já concluídos não são afetados. Essa ação não pode ser desfeita.`}
            </p>
            {erro && <p style={{ color: 'var(--red)', fontSize: 13, margin: '0 0 12px' }}>{erro}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={onClose} style={botaoSecundario}>
                Cancelar
              </button>
              {qtdAtrasadas > 0 && (
                <button type="button" onClick={confirmarLimpeza} disabled={carregando} style={botaoPerigo}>
                  {carregando ? 'Removendo...' : 'Apagar'}
                </button>
              )}
            </div>
          </div>
        )}

        {etapa === 'concluido' && (
          <div>
            <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>Concluído</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 18px' }}>
              {qtdRemovida} ocorrência{qtdRemovida === 1 ? '' : 's'} removida{qtdRemovida === 1 ? '' : 's'}.
            </p>
            <button type="button" onClick={onClose} style={{ ...botaoPrimario, width: '100%' }}>
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const botaoBase = {
  flex: 1,
  padding: '11px 14px',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
}

const botaoPrimario = { ...botaoBase, background: 'var(--amber)', color: '#0a0a0a' }
const botaoSecundario = { ...botaoBase, background: 'var(--bg-800)', color: 'var(--text-secondary)' }
const botaoPerigo = { ...botaoBase, background: 'var(--red)', color: '#fff' }
