import { useState, useEffect, useCallback, useRef } from 'react'
import { parseISODate } from '../lib/recurrence'
import {
  fetchUnidades,
  fetchReparos,
  addReparo,
  updateReparo,
  deleteReparo,
  alternarConcluidoReparo,
} from '../lib/dataService'

const PRIORIDADES = [
  { value: 'grave', label: 'Grave', cor: 'var(--red)' },
  { value: 'media', label: 'Média', cor: 'var(--orange)' },
  { value: 'pequena', label: 'Pequena', cor: 'var(--text-tertiary)' },
]
const PRIORIDADE_INFO = Object.fromEntries(PRIORIDADES.map((p) => [p.value, p]))
const PRIORIDADE_PESO = { grave: 0, media: 1, pequena: 2 }

const emptyForm = {
  nome: '',
  unidade_id: '',
  prioridade: 'media',
  descricao: '',
  valor_aproximado: '',
  data_execucao: '',
}

function formatarMoeda(valor) {
  if (valor === null || valor === undefined || valor === '') return null
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(iso) {
  if (!iso) return null
  return parseISODate(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ReparosPage() {
  const [unidades, setUnidades] = useState([])
  const [reparos, setReparos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState(null)
  const [filtroUnidade, setFiltroUnidade] = useState('todas')
  const formRef = useRef(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [uns, reps] = await Promise.all([fetchUnidades(), fetchReparos()])
      setUnidades(uns)
      setReparos(reps)
      setForm((f) => (f.unidade_id ? f : { ...f, unidade_id: uns[0]?.id || '' }))
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar os reparos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    if (showForm) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [showForm])

  function abrirNovo() {
    setForm({ ...emptyForm, unidade_id: unidades[0]?.id || '' })
    setEditingId(null)
    setShowForm(true)
    setErro(null)
  }

  function abrirEdicao(reparo) {
    setForm({
      nome: reparo.nome,
      unidade_id: reparo.unidade_id || '',
      prioridade: reparo.prioridade,
      descricao: reparo.descricao || '',
      valor_aproximado: reparo.valor_aproximado ?? '',
      data_execucao: reparo.data_execucao || '',
    })
    setEditingId(reparo.id)
    setShowForm(true)
    setErro(null)
  }

  async function handleSalvar() {
    if (!form.nome.trim()) {
      setErro('Informe o nome do reparo.')
      return
    }
    if (!form.unidade_id) {
      setErro('Selecione a unidade.')
      return
    }

    const payload = {
      nome: form.nome.trim(),
      unidade_id: form.unidade_id,
      prioridade: form.prioridade,
      descricao: form.descricao.trim() || null,
      valor_aproximado: form.valor_aproximado === '' ? null : Number(form.valor_aproximado),
      data_execucao: form.data_execucao || null,
    }

    setSaving(true)
    setErro(null)
    try {
      if (editingId) {
        await updateReparo(editingId, payload)
      } else {
        await addReparo(payload)
      }
      setShowForm(false)
      carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleExcluir(id) {
    if (!confirm('Remover este reparo?')) return
    await deleteReparo(id)
    carregar()
  }

  async function handleAlternarConcluido(reparo) {
    await alternarConcluidoReparo(reparo.id, !reparo.concluido)
    carregar()
  }

  const filtrados = filtroUnidade === 'todas' ? reparos : reparos.filter((r) => r.unidade_id === filtroUnidade)
  const pendentes = filtrados
    .filter((r) => !r.concluido)
    .sort((a, b) => PRIORIDADE_PESO[a.prioridade] - PRIORIDADE_PESO[b.prioridade])
  const concluidos = filtrados.filter((r) => r.concluido)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 100px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>
            Manutenção
          </p>
          <h1 style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 800 }}>Reparos</h1>
        </div>
        <button
          onClick={abrirNovo}
          style={{
            background: 'var(--amber)',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: 10,
            padding: '10px 16px',
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          + Novo reparo
        </button>
      </header>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, overflowX: 'auto' }}>
        <Chip label="Todas" active={filtroUnidade === 'todas'} onClick={() => setFiltroUnidade('todas')} cor="var(--text-secondary)" />
        {unidades.map((u) => (
          <Chip key={u.id} label={u.nome} active={filtroUnidade === u.id} onClick={() => setFiltroUnidade(u.id)} cor={u.cor} />
        ))}
      </div>

      {showForm && (
        <div
          ref={formRef}
          style={{
            background: 'var(--bg-900)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 18,
            marginBottom: 20,
          }}
        >
          <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800 }}>
            {editingId ? 'Editar reparo' : 'Novo reparo'}
          </h2>

          {erro && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 0 }}>{erro}</p>}

          <Field label="Nome do reparo">
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Trocar motor do freezer"
              style={inputStyle}
            />
          </Field>

          <Field label="Unidade">
            <select value={form.unidade_id} onChange={(e) => setForm({ ...form, unidade_id: e.target.value })} style={inputStyle}>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Prioridade">
            <div style={{ display: 'flex', gap: 8 }}>
              {PRIORIDADES.map((p) => {
                const marcado = form.prioridade === p.value
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm({ ...form, prioridade: p.value })}
                    style={{
                      flex: 1,
                      padding: '9px 10px',
                      borderRadius: 999,
                      border: `1.5px solid ${marcado ? p.cor : 'var(--border)'}`,
                      background: marcado ? p.cor : 'transparent',
                      color: marcado ? '#0a0a0a' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Descrição">
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Detalhes do problema e o que precisa ser feito"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 140px' }}>
              <Field label="Valor aproximado (R$)">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={form.valor_aproximado}
                  onChange={(e) => setForm({ ...form, valor_aproximado: e.target.value })}
                  placeholder="Ex: 350,00"
                  style={inputStyle}
                />
              </Field>
            </div>
            <div style={{ flex: '1 1 140px' }}>
              <Field label="Data de execução (opcional)">
                <input
                  type="date"
                  value={form.data_execucao}
                  onChange={(e) => setForm({ ...form, data_execucao: e.target.value })}
                  style={inputStyle}
                />
              </Field>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button
              onClick={handleSalvar}
              disabled={saving}
              style={{
                background: 'var(--green)',
                color: '#0a0a0a',
                border: 'none',
                borderRadius: 10,
                padding: '10px 18px',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '10px 18px',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Carregando…</p>
      ) : pendentes.length === 0 && concluidos.length === 0 ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>
          Nenhum reparo cadastrado ainda.
        </p>
      ) : (
        <>
          {pendentes.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <SectionLabel>Pendentes ({pendentes.length})</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pendentes.map((r) => (
                  <ReparoCard
                    key={r.id}
                    reparo={r}
                    onEditar={() => abrirEdicao(r)}
                    onExcluir={() => handleExcluir(r.id)}
                    onAlternarConcluido={() => handleAlternarConcluido(r)}
                  />
                ))}
              </div>
            </section>
          )}

          {concluidos.length > 0 && (
            <section>
              <SectionLabel>Concluídos ({concluidos.length})</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {concluidos.map((r) => (
                  <ReparoCard
                    key={r.id}
                    reparo={r}
                    dimmed
                    onEditar={() => abrirEdicao(r)}
                    onExcluir={() => handleExcluir(r.id)}
                    onAlternarConcluido={() => handleAlternarConcluido(r)}
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

function ReparoCard({ reparo, dimmed, onEditar, onExcluir, onAlternarConcluido }) {
  const prioridade = PRIORIDADE_INFO[reparo.prioridade]
  const unidadeCor = reparo.checklist_unidades?.cor || 'var(--amber)'
  const valorFormatado = formatarMoeda(reparo.valor_aproximado)
  const dataFormatada = formatarData(reparo.data_execucao)

  return (
    <div
      style={{
        background: 'var(--bg-900)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 16px',
        position: 'relative',
        overflow: 'hidden',
        opacity: dimmed ? 0.6 : 1,
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: unidadeCor }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <button
          onClick={onAlternarConcluido}
          aria-label={reparo.concluido ? 'Marcar como pendente' : 'Marcar como concluído'}
          style={{
            flexShrink: 0,
            width: 26,
            height: 26,
            borderRadius: 7,
            border: `2px solid ${reparo.concluido ? 'var(--green)' : 'var(--border)'}`,
            background: reparo.concluido ? 'var(--green)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            marginTop: 2,
          }}
        >
          {reparo.concluido && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#0a0a0a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: 15,
                textDecoration: reparo.concluido ? 'line-through' : 'none',
                color: reparo.concluido ? 'var(--text-secondary)' : 'var(--text-primary)',
              }}
            >
              {reparo.nome}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: prioridade?.cor,
                border: `1px solid ${prioridade?.cor}`,
                padding: '1px 7px',
                borderRadius: 6,
              }}
            >
              {prioridade?.label}
            </span>
          </div>

          {reparo.descricao && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{reparo.descricao}</p>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
            {valorFormatado && (
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Valor: {valorFormatado}</span>
            )}
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              {dataFormatada ? `Execução: ${dataFormatada}` : 'Sem data definida'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <IconButton onClick={onEditar} label="Editar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </IconButton>
          <IconButton onClick={onExcluir} label="Excluir">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </IconButton>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Chip({ label, active, onClick, cor }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: '7px 14px',
        borderRadius: 999,
        border: `1.5px solid ${active ? cor : 'var(--border)'}`,
        background: active ? cor : 'transparent',
        color: active ? '#0a0a0a' : 'var(--text-secondary)',
        fontWeight: 700,
        fontSize: 13,
        cursor: 'pointer',
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

function IconButton({ onClick, label, children }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--bg-800)',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

const inputStyle = {
  width: '100%',
  background: 'var(--bg-800)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  padding: '9px 11px',
  fontSize: 14,
}
