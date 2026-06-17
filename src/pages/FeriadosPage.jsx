import { useState, useEffect, useCallback } from 'react'
import { toISODate, parseISODate } from '../lib/recurrence'
import { fetchFeriados, addFeriado, deleteFeriado } from '../lib/dataService'

const ABRANGENCIA_LABEL = {
  nacional: 'Nacional',
  estadual: 'Estadual',
  municipal: 'Municipal',
}

const ABRANGENCIA_COR = {
  nacional: 'var(--blue)',
  estadual: 'var(--orange)',
  municipal: 'var(--amber)',
}

export default function FeriadosPage() {
  const [feriados, setFeriados] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ data: toISODate(new Date()), descricao: '', abrangencia: 'municipal' })

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await fetchFeriados()
      setFeriados(rows)
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar os feriados.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function handleAdicionar() {
    if (!form.data || !form.descricao.trim()) {
      setErro('Informe a data e a descrição do feriado.')
      return
    }
    setSaving(true)
    setErro(null)
    try {
      await addFeriado({ data: form.data, descricao: form.descricao.trim(), abrangencia: form.abrangencia })
      setForm({ data: toISODate(new Date()), descricao: '', abrangencia: 'municipal' })
      carregar()
    } catch (e) {
      console.error(e)
      setErro(e.message?.includes('duplicate') ? 'Já existe um feriado cadastrado nesta data.' : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleExcluir(id) {
    if (!confirm('Remover este feriado?')) return
    await deleteFeriado(id)
    carregar()
  }

  const hoje = new Date()
  const futuros = feriados.filter((f) => parseISODate(f.data) >= new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()))
  const passados = feriados.filter((f) => parseISODate(f.data) < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()))

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 100px' }}>
      <header style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>
          Cadastro
        </p>
        <h1 style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 800 }}>Feriados</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Atividades recorrentes nunca caem nessas datas — são automaticamente empurradas para o próximo dia útil.
        </p>
      </header>

      <div
        style={{
          background: 'var(--bg-900)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 18,
          marginBottom: 24,
        }}
      >
        <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800 }}>Adicionar feriado</h2>
        {erro && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 0 }}>{erro}</p>}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ flex: '1 1 140px' }}>
            <label style={labelStyle}>Data</label>
            <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={labelStyle}>Abrangência</label>
            <select value={form.abrangencia} onChange={(e) => setForm({ ...form, abrangencia: e.target.value })} style={inputStyle}>
              <option value="nacional">Nacional</option>
              <option value="estadual">Estadual</option>
              <option value="municipal">Municipal</option>
            </select>
          </div>
        </div>

        <label style={labelStyle}>Descrição</label>
        <input
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          placeholder="Ex: Aniversário de Guarapuava"
          style={{ ...inputStyle, marginBottom: 14 }}
        />

        <button
          onClick={handleAdicionar}
          disabled={saving}
          style={{
            background: 'var(--amber)',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: 10,
            padding: '10px 18px',
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          {saving ? 'Salvando…' : '+ Adicionar feriado'}
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Carregando…</p>
      ) : feriados.length === 0 ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
          Nenhum feriado cadastrado ainda.
        </p>
      ) : (
        <>
          {futuros.length > 0 && (
            <section style={{ marginBottom: 20 }}>
              <p style={sectionLabelStyle}>Próximos</p>
              <FeriadosList feriados={futuros} onExcluir={handleExcluir} />
            </section>
          )}
          {passados.length > 0 && (
            <section>
              <p style={sectionLabelStyle}>Anteriores</p>
              <FeriadosList feriados={passados} onExcluir={handleExcluir} dimmed />
            </section>
          )}
        </>
      )}
    </div>
  )
}

function FeriadosList({ feriados, onExcluir, dimmed }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {feriados.map((f) => (
        <div
          key={f.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-900)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '11px 14px',
            opacity: dimmed ? 0.55 : 1,
          }}
        >
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{formatarData(f.data)}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: ABRANGENCIA_COR[f.abrangencia],
                  border: `1px solid ${ABRANGENCIA_COR[f.abrangencia]}`,
                  padding: '1px 6px',
                  borderRadius: 6,
                }}
              >
                {ABRANGENCIA_LABEL[f.abrangencia]}
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{f.descricao}</p>
          </div>
          <button
            onClick={() => onExcluir(f.id)}
            aria-label="Remover feriado"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-800)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

function formatarData(iso) {
  const d = parseISODate(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }
const sectionLabelStyle = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-tertiary)', margin: '0 0 10px 2px' }
const inputStyle = {
  width: '100%',
  background: 'var(--bg-800)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  padding: '9px 11px',
  fontSize: 14,
}
