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
  const { data, error } = await query.order('ordem', { ascending: true, nullsFirst: false }).order('nome')
  if (error) throw error
  return data
}

export async function addAtividade(atividade) {
  const { data: maxRow } = await supabase
    .from('checklist_atividades')
    .select('ordem')
    .order('ordem', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()
  const proximaOrdem = (maxRow?.ordem || 0) + 1

  const { data, error } = await supabase
    .from('checklist_atividades')
    .insert({ ...atividade, ordem: proximaOrdem })
    .select()
    .single()
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

// Troca a posição de duas atividades na ordem de execução (usado pelos
// botões subir/descer da aba Hoje). A troca acontece inteira dentro do
// banco (função trocar_ordem_atividades), lendo o valor atual de "ordem"
// na hora — evita corrida quando o usuário toca rápido demais.
export async function trocarOrdemAtividades(idA, idB) {
  const { error } = await supabase.rpc('trocar_ordem_atividades', { id_a: idA, id_b: idB })
  if (error) throw error
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
    .select('*, checklist_atividades(id, nome, descricao, frequencia, unidade_id, ordem, checklist_unidades(nome, cor))')
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
    .select('*, checklist_atividades(id, nome, descricao, frequencia, unidade_id, ordem, checklist_unidades(nome, cor))')
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

// ---------- Reparos ----------

export async function fetchReparos() {
  const { data, error } = await supabase
    .from('checklist_reparos')
    .select('*, checklist_unidades(nome, cor)')
    .order('concluido')
    .order('data_execucao', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addReparo(reparo) {
  const { data, error } = await supabase.from('checklist_reparos').insert(reparo).select().single()
  if (error) throw error
  return data
}

export async function updateReparo(id, patch) {
  const { data, error } = await supabase
    .from('checklist_reparos')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function alternarConcluidoReparo(id, concluido) {
  const { error } = await supabase
    .from('checklist_reparos')
    .update({ concluido, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteReparo(id) {
  const { error } = await supabase.from('checklist_reparos').delete().eq('id', id)
  if (error) throw error
}

// ---------- Manutenção ----------

// Conta ocorrências pendentes cuja data agendada já passou (atrasadas).
// Usado pela tela de manutenção para mostrar quantos itens serão removidos
// antes de confirmar a exclusão.
export async function contarOcorrenciasAtrasadas() {
  const hojeISO = toISODate(new Date())
  const { count, error } = await supabase
    .from('checklist_ocorrencias')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pendente')
    .lt('data_agendada', hojeISO)
  if (error) throw error
  return count || 0
}

// Remove definitivamente as ocorrências pendentes atrasadas (data_agendada < hoje).
// Não mexe em ocorrências futuras pendentes nem em ocorrências já concluídas —
// preserva o histórico normalmente.
export async function limparOcorrenciasAtrasadas() {
  const hojeISO = toISODate(new Date())
  const { data, error } = await supabase
    .from('checklist_ocorrencias')
    .delete()
    .eq('status', 'pendente')
    .lt('data_agendada', hojeISO)
    .select('id')
  if (error) throw error
  return data?.length || 0
}
