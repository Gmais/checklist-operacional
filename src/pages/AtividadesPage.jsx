import { useState, useEffect, useCallback, useRef } from 'react'
import { FREQUENCIAS, DIAS_SEMANA_OPCOES, SEMANA_DO_MES_OPCOES, toISODate } from '../lib/recurrence'
import { fetchUnidades, fetchAtividades, addAtividade, updateAtividade, deleteAtividade } from '../lib/dataService'

const FREQ_LABEL = Object.fromEntries(FREQUENCIAS.map((f) => [f.value, f.label]))
const DIA_LABEL = Object.fromEntries(DIAS_SEMANA_OPCOES.map((d) => [d.value, d.label]))
const SEMANA_LABEL = Object.fromEntries(SEMANA_DO_MES_OPCOES.map((s) => [s.value, s.label]))

const emptyForm = {
  nome: '',
  descricao: '',
  unidade_id: '',
  frequencia: 'diaria',
  dia_semana: 1,
  dias_semana: [],
  semana_do_mes: 1,
  data_inicio: toISODate(new Date()),
}

export default function AtividadesPage() {
  const [unidades, setUnidades] = useState([])
  const [atividades, setAtividades] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState(null)
  const [filtroUnidade, setFiltroUnidade] = useState('todas')
  const formRef = useRef(null)

  useEffect(() => {
    if (showForm) {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [showForm])

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [uns, ats] = await Promise.all([fetchUnidades(), fetchAtividades()])
      setUnidades(uns)
      setAtividades(ats)
      setForm((f) => (f.unidade_id ? f : { ...f, unidade_id: uns[0]?.id || '' }))
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar as atividades.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  function abrirNovo() {
    setForm({ ...emptyForm, unidade_id: unidades[0]?.id || '' })
    setEditingId(null)
    setShowForm(true)
    setErro(null)
  }

  function abrirEdicao(atividade) {
    setForm({
      nome: atividade.nome,
      descricao: atividade.descricao || '',
      unidade_id: atividade.unidade_id,
      frequencia: atividade.frequencia,
      dia_semana: atividade.dia_semana ?? 1,
      dias_semana: atividade.dias_semana || [],
      semana_do_mes: atividade.semana_do_mes ?? 1,
      data_inicio: atividade.data_inicio,
    })
    setEditingId(atividade.id)
    setShowForm(true)
    setErro(null)
  }

  async function handleSalvar() {
    if (!form.nome.trim()) {
      setErro('Informe o nome da atividade.')
      return
    }
    if (!form.unidade_id) {
      setErro('Selecione a unidade.')
      return
    }
    if (form.frequencia === 'dias_especificos' && form.dias_semana.length === 0) {
      setErro('Selecione ao menos um dia da semana.')
      return
    }

    const precisaDia = ['semanal', 'quinzenal', 'mensal', 'trimestral', 'semestral'].includes(form.frequencia)
    const precisaSemanaDoMes = ['mensal', 'trimestral', 'semestral'].includes(form.frequencia)
    const precisaDiasArray = form.frequencia === 'dias_especificos'

    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      unidade_id: form.unidade_id,
      frequencia: form.frequencia,
      dia_semana: precisaDia ? Number(form.dia_semana) : null,
      dias_semana: precisaDiasArray ? form.dias_semana.slice().sort() : null,
      semana_do_mes: precisaSemanaDoMes ? Number(form.semana_do_mes) : null,
      data_inicio: form.data_inicio,
    }

    setSaving(true)
    setErro(null)
    try {
      if (editingId) {
        await updateAtividade(editingId, payload)
      } else {
        await addAtividade(payload)
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
    if (!confirm('Remover esta atividade? Ela deixará de gerar novas ocorrências.')) return
    await deleteAtividade(id)
    carregar()
  }

  const atividadesFiltradas =
    filtroUnidade === 'todas' ? atividades : atividades.filter((a) => a.unidade_id === filtroUnidade)

  function descricaoRecorrencia(a) {
    if (a.frequencia === 'diaria') return 'Todo dia útil'
    if (a.frequencia === 'semanal') return `Toda ${DIA_LABEL[a.dia_semana]}-feira`
    if (a.frequencia === 'quinzenal') return `A cada 2 semanas, ${DIA_LABEL[a.dia_semana]}-feira`
    if (a.frequencia === 'dias_especificos') {
      const dias = (a.dias_semana || []).map((d) => `${DIA_LABEL[d]}-feira`)
      return `Toda ${dias.join(' e ')}`
    }
    return `${SEMANA_LABEL[a.semana_do_mes]} ${DIA_LABEL[a.dia_semana]}-feira do ${a.frequencia === 'mensal' ? 'mês' : a.frequencia === 'trimestral' ? 'trimestre' : 'semestre'}`
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 100px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>
            Cadastro
          </p>
          <h1 style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 800 }}>Atividades</h1>
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
          + Nova
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
            {editingId ? 'Editar atividade' : 'Nova atividade'}
          </h2>

          {erro && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 0 }}>{erro}</p>}

          <Field label="Nome">
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Limpeza dos vestiários"
              style={inputStyle}
            />
          </Field>

          <Field label="Descrição (opcional)">
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Detalhes do que precisa ser feito"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
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

          <Field label="Frequência">
            <select value={form.frequencia} onChange={(e) => setForm({ ...form, frequencia: e.target.value })} style={inputStyle}>
              {FREQUENCIAS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </Field>

          {['semanal', 'quinzenal'].includes(form.frequencia) && (
            <Field label="Dia da semana">
              <select value={form.dia_semana} onChange={(e) => setForm({ ...form, dia_semana: e.target.value })} style={inputStyle}>
                {DIAS_SEMANA_OPCOES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {form.frequencia === 'dias_especificos' && (
            <Field label="Dias da semana (pode marcar mais de um)">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DIAS_SEMANA_OPCOES.map((d) => {
                  const marcado = form.dias_semana.includes(d.value)
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => {
                        const novos = marcado
                          ? form.dias_semana.filter((v) => v !== d.value)
                          : [...form.dias_semana, d.value]
                        setForm({ ...form, dias_semana: novos })
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 999,
                        border: `1.5px solid ${marcado ? 'var(--amber)' : 'var(--border)'}`,
                        background: marcado ? 'var(--amber)' : 'transparent',
                        color: marcado ? '#0a0a0a' : 'var(--text-secondary)',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </Field>
          )}

          {['mensal', 'trimestral', 'semestral'].includes(form.frequencia) && (
            <>
              <Field label="Semana do mês">
                <select value={form.semana_do_mes} onChange={(e) => setForm({ ...form, semana_do_mes: e.target.value })} style={inputStyle}>
                  {SEMANA_DO_MES_OPCOES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Dia da semana">
                <select value={form.dia_semana} onChange={(e) => setForm({ ...form, dia_semana: e.target.value })} style={inputStyle}>
                  {DIAS_SEMANA_OPCOES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}

          <Field label="Começa a valer a partir de">
            <input
              type="date"
              value={form.data_inicio}
              onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
              style={inputStyle}
            />
          </Field>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
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
      ) : atividadesFiltradas.length === 0 ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>
          Nenhuma atividade cadastrada ainda.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {atividadesFiltradas.map((a) => (
            <div
              key={a.id}
              style={{
                background: 'var(--bg-900)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: a.checklist_unidades?.cor }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{a.nome}</span>
                    <span style={tagStyle}>{FREQ_LABEL[a.frequencia]}</span>
                  </div>
                  {a.descricao && (
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{a.descricao}</p>
                  )}
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {descricaoRecorrencia(a)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <IconButton onClick={() => abrirEdicao(a)} label="Editar">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </IconButton>
                  <IconButton onClick={() => handleExcluir(a.id)} label="Excluir">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </IconButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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

const tagStyle = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  color: 'var(--text-tertiary)',
  background: 'var(--bg-800)',
  padding: '2px 7px',
  borderRadius: 6,
}
