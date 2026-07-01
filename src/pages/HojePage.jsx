import { useState, useEffect, useCallback } from 'react'
import ActivityCard from '../components/ActivityCard'
import { toISODate } from '../lib/recurrence'
import {
  fetchUnidades,
  fetchOcorrenciasDoDia,
  fetchOcorrenciasAtrasadas,
  sincronizarOcorrencias,
  concluirOcorrencia,
  reabrirOcorrencia,
  reagendarOcorrencia,
  trocarOrdemAtividades,
} from '../lib/dataService'

function formatarDataLonga(date) {
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

export default function HojePage() {
  const [unidades, setUnidades] = useState([])
  const [unidadeAtiva, setUnidadeAtiva] = useState('todas')
  const [ocorrenciasHoje, setOcorrenciasHoje] = useState([])
  const [ocorrenciasAtrasadas, setOcorrenciasAtrasadas] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  const hoje = new Date()
  const hojeISO = toISODate(hoje)

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const rangeEnd = new Date(hoje)
      rangeEnd.setDate(rangeEnd.getDate() + 1)
      await sincronizarOcorrencias(hojeISO, toISODate(rangeEnd))

      const [uns, hojeRows, atrasadasRows] = await Promise.all([
        fetchUnidades(),
        fetchOcorrenciasDoDia(hojeISO),
        fetchOcorrenciasAtrasadas(hojeISO),
      ])
      setUnidades(uns)
      setOcorrenciasHoje(hojeRows)
      setOcorrenciasAtrasadas(atrasadasRows)
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar as atividades. Verifique a conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [hojeISO])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function handleConcluir(id, observacao) {
    await concluirOcorrencia(id, observacao)
    carregar()
  }

  async function handleReabrir(id) {
    await reabrirOcorrencia(id)
    carregar()
  }

  async function handleReagendar(id, novaData) {
    await reagendarOcorrencia(id, novaData)
    carregar()
  }

  const [movendoId, setMovendoId] = useState(null)

  async function handleMover(lista, ocorrencia, direcao) {
    if (movendoId) return
    const idx = lista.findIndex((o) => o.id === ocorrencia.id)
    const alvoIdx = idx + direcao
    if (alvoIdx < 0 || alvoIdx >= lista.length) return
    const atual = lista[idx].checklist_atividades
    const alvo = lista[alvoIdx].checklist_atividades
    if (!atual || !alvo) return
    setMovendoId(ocorrencia.id)
    try {
      await trocarOrdemAtividades(atual.id, alvo.id)
      await carregar()
    } finally {
      setMovendoId(null)
    }
  }

  const todasOcorrencias = [...ocorrenciasAtrasadas, ...ocorrenciasHoje]
  const filtradas =
    unidadeAtiva === 'todas'
      ? todasOcorrencias
      : todasOcorrencias.filter((o) => o.checklist_atividades?.unidade_id === unidadeAtiva)

  const pendentes = filtradas
    .filter((o) => o.status === 'pendente')
    .sort((a, b) => {
      const oa = a.checklist_atividades?.ordem ?? 999999
      const ob = b.checklist_atividades?.ordem ?? 999999
      return oa - ob
    })
  const concluidas = filtradas.filter((o) => o.status === 'concluida')
  const atrasadasIds = new Set(ocorrenciasAtrasadas.map((o) => o.id))

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 100px' }}>
      <header style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>
          Hoje
        </p>
        <h1 style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 800, textTransform: 'capitalize' }}>
          {formatarDataLonga(hoje)}
        </h1>
      </header>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, overflowX: 'auto', paddingBottom: 2 }}>
        <FiltroChip label="Todas" active={unidadeAtiva === 'todas'} onClick={() => setUnidadeAtiva('todas')} cor="var(--text-secondary)" />
        {unidades.map((u) => (
          <FiltroChip key={u.id} label={u.nome} active={unidadeAtiva === u.id} onClick={() => setUnidadeAtiva(u.id)} cor={u.cor} />
        ))}
      </div>

      {erro && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red)', borderRadius: 12, padding: 14, marginBottom: 16, color: 'var(--red)', fontSize: 14 }}>
          {erro}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Carregando atividades…</p>
      ) : (
        <>
          {pendentes.length === 0 && concluidas.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-tertiary)' }}>
              <p style={{ fontSize: 15, margin: 0 }}>Nenhuma atividade prevista para hoje.</p>
              <p style={{ fontSize: 13, margin: '6px 0 0' }}>Cadastre atividades na aba "Atividades".</p>
            </div>
          )}

          {pendentes.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <SectionLabel>Pendentes ({pendentes.length})</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pendentes.map((oc, idx) => (
                  <ActivityCard
                    key={oc.id}
                    ocorrencia={oc}
                    atrasada={atrasadasIds.has(oc.id)}
                    onConcluir={handleConcluir}
                    onReabrir={handleReabrir}
                    onReagendar={handleReagendar}
                    onMoverCima={(o) => handleMover(pendentes, o, -1)}
                    onMoverBaixo={(o) => handleMover(pendentes, o, 1)}
                    podeSubir={idx > 0 && !movendoId}
                    podeDescer={idx < pendentes.length - 1 && !movendoId}
                  />
                ))}
              </div>
            </section>
          )}

          {concluidas.length > 0 && (
            <section>
              <SectionLabel>Concluídas ({concluidas.length})</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {concluidas.map((oc) => (
                  <ActivityCard
                    key={oc.id}
                    ocorrencia={oc}
                    atrasada={false}
                    onConcluir={handleConcluir}
                    onReabrir={handleReabrir}
                    onReagendar={handleReagendar}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function FiltroChip({ label, active, onClick, cor }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: '8px 16px',
        borderRadius: 999,
        border: `1.5px solid ${active ? cor : 'var(--border)'}`,
        background: active ? cor : 'transparent',
        color: active ? '#0a0a0a' : 'var(--text-secondary)',
        fontWeight: 700,
        fontSize: 13,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

function SectionLabel({ children }) {
  return (
    <p
      style={{
        fontSize: 12,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: 'var(--text-tertiary)',
        margin: '0 0 10px 2px',
      }}
    >
      {children}
    </p>
  )
}
