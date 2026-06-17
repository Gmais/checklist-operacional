import { supabase } from './supabase'
import { calcularDatasPrevistas, ajustarParaDiaUtil, toISODate, parseISODate } from './recurrence'

// ---------- Unidades ----------
export async function fetchUnidades() {
  const { data, error } = await supabase.from('checklist_unidades').select('*').eq('ativo', true).order('nome')
  if (error) throw error
  return data
}

// ---------- Feriados ----------
export async function fetchFeriados() {
  const { data, error } = await supabase.from('checklist_feriados').select('*').order('data')
  if (error) throw error
  return data
}

export async function addFeriado({ data, descricao, abrangencia }) {
  const { data: row, error } = await supabase
    .from('checklist_feriados')
    .insert({ data, descricao, abrangencia })
    .select()
    .single()
  if (error) throw error
  return row
}

export async function deleteFeriado(id) {
  const { error } = await supabase.from('checklist_feriados').delete().eq('id', id)
  if (error) throw error
}

// ---------- Atividades ----------
export async function fetchAtividades(unidadeId = null) {
  let query = supabase.from('checklist_atividades').select('*, checklist_unidades(nome, cor)').eq('ativo', true)
  if (unidadeId) query = query.eq('unidade_id', unidadeId)
  const { data, error } = await query.order('nome')
  if (error) throw error
  return data
}

export async function addAtividade(atividade) {
  const { data, error } = await supabase.from('checklist_atividades').insert(atividade).select().single()
  if (error) throw error
  return data
}

export async function updateAtividade(id, patch) {
  const { data, error } = await supabase
    .from('checklist_atividades')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAtividade(id) {
  // Remove ocorrências pendentes futuras/atuais vinculadas a essa atividade,
  // preservando as já concluídas como histórico.
  const { error: errorOcorrencias } = await supabase
    .from('checklist_ocorrencias')
    .delete()
    .eq('atividade_id', id)
    .eq('status', 'pendente')
  if (errorOcorrencias) throw errorOcorrencias

  const { error } = await supabase.from('checklist_atividades').update({ ativo: false }).eq('id', id)
  if (error) throw error
}

// ---------- Ocorrências ----------

export async function sincronizarOcorrencias(rangeStartISO, rangeEndISO) {
  const [atividades, feriados] = await Promise.all([fetchAtividades(), fetchFeriados()])
  const holidaysSet = new Set(feriados.map((f) => f.data))
  const rangeStart = parseISODate(rangeStartISO)
  const rangeEnd = parseISODate(rangeEndISO)

  const novasOcorrencias = []

  for (const atividade of atividades) {
    const datasPrevistas = calcularDatasPrevistas(atividade, rangeStart, rangeEnd)
    for (const dataPrevista of datasPrevistas) {
      const dataAgendada = ajustarParaDiaUtil(dataPrevista, holidaysSet)
      novasOcorrencias.push({
        atividade_id: atividade.id,
        data_prevista_original: toISODate(dataPrevista),
        data_agendada: toISODate(dataAgendada),
        status: 'pendente',
      })
    }
  }

  if (novasOcorrencias.length === 0) return

  const { error } = await supabase
    .from('checklist_ocorrencias')
    .upsert(novasOcorrencias, { onConflict: 'atividade_id,data_prevista_original', ignoreDuplicates: true })
  if (error) throw error
}

export async function fetchOcorrenciasDoDia(dataISO, unidadeId = null) {
  let query = supabase
    .from('checklist_ocorrencias')
    .select('*, checklist_atividades(id, nome, descricao, frequencia, unidade_id, checklist_unidades(nome, cor))')
    .eq('data_agendada', dataISO)

  const { data, error } = await query
  if (error) throw error

  let rows = data
  if (unidadeId) {
    rows = rows.filter((r) => r.checklist_atividades?.unidade_id === unidadeId)
  }
  return rows
}

export async function fetchOcorrenciasAtrasadas(hojeISO, unidadeId = null) {
  let query = supabase
    .from('checklist_ocorrencias')
    .select('*, checklist_atividades(id, nome, descricao, frequencia, unidade_id, checklist_unidades(nome, cor))')
    .eq('status', 'pendente')
    .lt('data_agendada', hojeISO)

  const { data, error } = await query
  if (error) throw error

  let rows = data
  if (unidadeId) {
    rows = rows.filter((r) => r.checklist_atividades?.unidade_id === unidadeId)
  }
  return rows
}

export async function concluirOcorrencia(id, observacao) {
  const { data, error } = await supabase
    .from('checklist_ocorrencias')
    .update({
      status: 'concluida',
      observacao: observacao || null,
      concluida_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function reabrirOcorrencia(id) {
  const { data, error } = await supabase
    .from('checklist_ocorrencias')
    .update({ status: 'pendente', concluida_em: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function reagendarOcorrencia(id, novaDataISO) {
  const { data, error } = await supabase
    .from('checklist_ocorrencias')
    .update({ data_agendada: novaDataISO, reagendada: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
