import { useState } from 'react'

const FREQ_LABEL = {
  unica: 'Recado',
  diaria: 'Diária',
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  dias_especificos: 'Dias específicos',
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
}

export default function ActivityCard({
  ocorrencia,
  atrasada,
  onConcluir,
  onReabrir,
  onReagendar,
  onMoverCima,
  onMoverBaixo,
  podeSubir,
  podeDescer,
}) {
  const [showObs, setShowObs] = useState(false)
  const [obs, setObs] = useState(ocorrencia.observacao || '')
  const [showReagendar, setShowReagendar] = useState(false)
  const [novaData, setNovaData] = useState(ocorrencia.data_agendada)
  const [saving, setSaving] = useState(false)

  const atividade = ocorrencia.checklist_atividades
  const unidadeCor = atividade?.checklist_unidades?.cor || '#e7a308'
  const concluida = ocorrencia.status === 'concluida'

  async function handleCheck() {
    if (concluida) {
      onReabrir(ocorrencia.id)
      return
    }
    setShowObs(true)
  }

  async function handleSalvarConclusao() {
    setSaving(true)
    await onConcluir(ocorrencia.id, obs)
    setSaving(false)
    setShowObs(false)
  }

  async function handleSalvarReagendamento() {
    setSaving(true)
    await onReagendar(ocorrencia.id, novaData)
    setSaving(false)
    setShowReagendar(false)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        background: 'var(--bg-900)',
        border: `1px solid ${atrasada ? 'var(--red)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '14px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 4,
          height: '100%',
          background: unidadeCor,
        }}
      />

      <button
        onClick={handleCheck}
        aria-label={concluida ? 'Marcar como pendente' : 'Marcar como concluída'}
        style={{
          flexShrink: 0,
          width: 30,
          height: 30,
          borderRadius: 8,
          border: `2px solid ${concluida ? 'var(--green)' : 'var(--border)'}`,
          background: concluida ? 'var(--green)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          marginTop: 2,
          transition: 'all 0.15s',
        }}
      >
        {concluida && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#0a0a0a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: concluida ? 'var(--text-secondary)' : 'var(--text-primary)',
              textDecoration: concluida ? 'line-through' : 'none',
            }}
          >
            {atividade?.nome}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: 'var(--text-tertiary)',
              background: 'var(--bg-800)',
              padding: '2px 7px',
              borderRadius: 6,
            }}
          >
            {FREQ_LABEL[atividade?.frequencia]}
          </span>
          {atrasada && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: 'var(--red)',
                background: 'rgba(239,68,68,0.12)',
                padding: '2px 7px',
                borderRadius: 6,
              }}
            >
              Atrasada
            </span>
          )}
        </div>
        {atividade?.descricao && (
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {atividade.descricao}
          </p>
        )}
        {concluida && ocorrencia.observacao && (
          <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
            “{ocorrencia.observacao}”
          </p>
        )}

        {showObs && !concluida && (
          <div style={{ marginTop: 10 }}>
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Observação (opcional)"
              rows={2}
              style={{
                width: '100%',
                background: 'var(--bg-800)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-primary)',
                padding: '8px 10px',
                fontSize: 13,
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={handleSalvarConclusao}
                disabled={saving}
                style={{
                  background: 'var(--green)',
                  color: '#0a0a0a',
                  border: 'none',
                  borderRadius: 8,
                  padding: '7px 14px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {saving ? 'Salvando…' : 'Confirmar conclusão'}
              </button>
              <button
                onClick={() => setShowObs(false)}
                style={{
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '7px 14px',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {showReagendar && (
          <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="date"
              value={novaData}
              onChange={(e) => setNovaData(e.target.value)}
              style={{
                background: 'var(--bg-800)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-primary)',
                padding: '7px 10px',
                fontSize: 13,
              }}
            />
            <button
              onClick={handleSalvarReagendamento}
              disabled={saving}
              style={{
                background: 'var(--amber)',
                color: '#0a0a0a',
                border: 'none',
                borderRadius: 8,
                padding: '7px 14px',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {saving ? 'Salvando…' : 'Mover'}
            </button>
            <button
              onClick={() => setShowReagendar(false)}
              style={{
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '7px 14px',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {onMoverCima && (
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2, width: 26 }}>
          <button
            onClick={() => onMoverCima(ocorrencia)}
            disabled={!podeSubir}
            aria-label="Mover para cima na ordem"
            title="Mover para cima"
            style={{
              width: 26,
              height: 16,
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-800)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: podeSubir ? 'pointer' : 'default',
              color: podeSubir ? 'var(--text-secondary)' : 'var(--text-tertiary)',
              opacity: podeSubir ? 1 : 0.35,
              padding: 0,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => onMoverBaixo(ocorrencia)}
            disabled={!podeDescer}
            aria-label="Mover para baixo na ordem"
            title="Mover para baixo"
            style={{
              width: 26,
              height: 16,
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-800)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: podeDescer ? 'pointer' : 'default',
              color: podeDescer ? 'var(--text-secondary)' : 'var(--text-tertiary)',
              opacity: podeDescer ? 1 : 0.35,
              padding: 0,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      {!showReagendar && (
        <button
          onClick={() => setShowReagendar(true)}
          aria-label="Mudar atividade para outro dia"
          title="Mudar para outro dia"
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-800)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M3 10h18" stroke="currentColor" strokeWidth="2" />
            <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M13 14l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  )
}
