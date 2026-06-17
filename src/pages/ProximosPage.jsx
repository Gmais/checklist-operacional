import { useState, useEffect, useCallback } from 'react'
import { toISODate, parseISODate } from '../lib/recurrence'
import { fetchUnidades, fetchOcorrenciasDoDia, sincronizarOcorrencias } from '../lib/dataService'

const PERIODOS = [
  { value: 7, label: 'Semana' },
  { value: 14, label: 'Quinzena' },
  { value: 30, label: 'Mês' },
  { value: 90, label: 'Trimestre' },
  { value: 180, label: 'Semestre' },
]

const FREQ_LABEL = {
  diaria: 'Diária',
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  dias_especificos: 'Dias específicos',
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
}

function formatarCabecalhoData(date, hoje) {
  const mesmodia = toISODate(date) === toISODate(hoje)
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 1)
  const ehAmanha = toISODate(date) === toISODate(amanha)

  const base = date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })
  if (mesmodia) return `Hoje · ${base}`
  if (ehAmanha) return `Amanhã · ${base}`
  return base
}

export default function ProximosPage() {
  const [periodo, setPeriodo] = useState(7)
  const [unidades, setUnidades] = useState([])
  const [unidadeAtiva, setUnidadeAtiva] = useState('todas')
  const [ocorrenciasPorDia, setOcorrenciasPorDia] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  const hoje = new Date()
  const hojeISO = toISODate(hoje)

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const rangeEnd = new Date(hoje)
      rangeEnd.setDate(rangeEnd.getDate() + periodo)
      const rangeEndISO = toISODate(rangeEnd)

      await sincronizarOcorrencias(hojeISO, rangeEndISO)

      const uns = await fetchUnidades()
      setUnidades(uns)

      // Busca dia a dia dentro da janela (inclui hoje)
      const dias = []
      const cursor = new Date(hoje)
      while (toISODate(cursor) <= rangeEndISO) {
        dias.push(toISODate(cursor))
        cursor.setDate(cursor.getDate() + 1)
      }

      const resultados = await Promise.all(dias.map((d) => fetchOcorrenciasDoDia(d)))
      const agrupado = dias
        .map((dataISO, idx) => ({ dataISO, ocorrencias: resultados[idx] }))
        .filter((g) => g.ocorrencias.length > 0)

      setOcorrenciasPorDia(agrupado)
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar as próximas atividades.')
    } finally {
      setLoading(false)
    }
  }, [periodo, hojeISO])

  useEffect(() => {
    carregar()
  }, [carregar])

  const gruposFiltrados = ocorrenciasPorDia
    .map((g) => ({
      ...g,
      ocorrencias:
        unidadeAtiva === 'todas'
          ? g.ocorrencias
          : g.ocorrencias.filter((o) => o.checklist_atividades?.unidade_id === unidadeAtiva),
    }))
    .filter((g) => g.ocorrencias.length > 0)

  const totalAtividades = gruposFiltrados.reduce((acc, g) => acc + g.ocorrencias.length, 0)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 100px' }}>
      <header style={{ marginBottom: 18 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>
          Planejamento
        </p>
        <h1 style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 800 }}>Próximos</h1>
      </header>

      {/* Filtro de período */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
        {PERIODOS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriodo(p.value)}
            style={{
              flexShrink: 0,
              padding: '8px 16px',
              borderRadius: 999,
              border: `1.5px solid ${periodo === p.value ? 'var(--amber)' : 'var(--border)'}`,
              background: periodo === p.value ? 'var(--amber)' : 'transparent',
              color: periodo === p.value ? '#0a0a0a' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Filtro de unidade */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, overflowX: 'auto', paddingBottom: 2 }}>
        <button
          onClick={() => setUnidadeAtiva('todas')}
          style={{
            flexShrink: 0,
            padding: '6px 14px',
            borderRadius: 999,
            border: `1.5px solid ${unidadeAtiva === 'todas' ? 'var(--text-secondary)' : 'var(--border)'}`,
            background: unidadeAtiva === 'todas' ? 'var(--text-secondary)' : 'transparent',
            color: unidadeAtiva === 'todas' ? '#0a0a0a' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: 12.5,
            cursor: 'pointer',
          }}
        >
          Todas
        </button>
        {unidades.map((u) => (
          <button
            key={u.id}
            onClick={() => setUnidadeAtiva(u.id)}
            style={{
              flexShrink: 0,
              padding: '6px 14px',
              borderRadius: 999,
              border: `1.5px solid ${unidadeAtiva === u.id ? u.cor : 'var(--border)'}`,
              background: unidadeAtiva === u.id ? u.cor : 'transparent',
              color: unidadeAtiva === u.id ? '#0a0a0a' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: 12.5,
              cursor: 'pointer',
            }}
          >
            {u.nome}
          </button>
        ))}
      </div>

      {erro && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red)', borderRadius: 12, padding: 14, marginBottom: 16, color: 'var(--red)', fontSize: 14 }}>
          {erro}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Carregando…</p>
      ) : gruposFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-tertiary)' }}>
          <p style={{ fontSize: 15, margin: 0 }}>Nenhuma atividade prevista neste período.</p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', margin: '0 0 14px 2px' }}>
            {totalAtividades} atividade{totalAtividades !== 1 ? 's' : ''} prevista{totalAtividades !== 1 ? 's' : ''}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {gruposFiltrados.map((grupo) => {
              const data = parseISODate(grupo.dataISO)
              return (
                <section key={grupo.dataISO}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      textTransform: 'capitalize',
                      margin: '0 0 10px 2px',
                      borderBottom: '1px solid var(--border)',
                      paddingBottom: 8,
                    }}
                  >
                    {formatarCabecalhoData(data, hoje)}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {grupo.ocorrencias.map((oc) => (
                      <ProximaAtividadeRow key={oc.id} ocorrencia={oc} />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function ProximaAtividadeRow({ ocorrencia }) {
  const atividade = ocorrencia.checklist_atividades
  const unidadeCor = atividade?.checklist_unidades?.cor || 'var(--amber)'
  const concluida = ocorrencia.status === 'concluida'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'var(--bg-900)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 14px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: unidadeCor }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: concluida ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: concluida ? 'line-through' : 'none' }}>
            {atividade?.nome}
          </span>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              color: 'var(--text-tertiary)',
              background: 'var(--bg-800)',
              padding: '2px 6px',
              borderRadius: 6,
            }}
          >
            {FREQ_LABEL[atividade?.frequencia]}
          </span>
        </div>
      </div>
      {concluida && (
        <span style={{ color: 'var(--green)', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>✓ feito</span>
      )}
    </div>
  )
}
