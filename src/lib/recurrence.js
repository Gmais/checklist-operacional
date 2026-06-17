// ============================================================
// Lógica de recorrência das atividades
// Regras gerais:
//  - Nunca cai em sábado ou domingo
//  - Nunca cai em feriado cadastrado
//  - Se a data calculada cair em fim de semana ou feriado,
//    empurra para o próximo dia útil
// ============================================================

const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isWeekend(date) {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function isHoliday(date, holidaysSet) {
  return holidaysSet.has(toISODate(date))
}

export function isBusinessDay(date, holidaysSet) {
  return !isWeekend(date) && !isHoliday(date, holidaysSet)
}

// Empurra a data para o próximo dia útil (seg-sex, não feriado)
export function nextBusinessDay(date, holidaysSet) {
  const d = new Date(date)
  while (!isBusinessDay(d, holidaysSet)) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

// Retorna a data da N-ésima ocorrência de um dia da semana num mês.
// weekPosition: 1=primeira, 2=segunda, 3=terceira, 4=quarta, -1=última
export function nthWeekdayOfMonth(year, monthIndex, weekday, weekPosition) {
  if (weekPosition === -1) {
    const lastDay = new Date(year, monthIndex + 1, 0)
    const lastDate = lastDay.getDate()
    for (let d = lastDate; d >= 1; d--) {
      const date = new Date(year, monthIndex, d)
      if (date.getDay() === weekday) return date
    }
    return null
  }
  let count = 0
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, monthIndex, d)
    if (date.getDay() === weekday) {
      count++
      if (count === weekPosition) return date
    }
  }
  return null
}

// Calcula todas as datas previstas (antes de ajuste de feriado) de uma
// atividade dentro de uma janela [rangeStart, rangeEnd], conforme a frequência.
export function calcularDatasPrevistas(atividade, rangeStart, rangeEnd) {
  const datas = []
  const inicio = parseISODate(atividade.data_inicio)
  const start = rangeStart < inicio ? inicio : rangeStart

  if (atividade.frequencia === 'diaria') {
    const d = new Date(start)
    while (d <= rangeEnd) {
      if (!isWeekend(d)) datas.push(new Date(d))
      d.setDate(d.getDate() + 1)
    }
    return datas
  }

  if (atividade.frequencia === 'semanal' || atividade.frequencia === 'quinzenal') {
    const intervaloDias = atividade.frequencia === 'semanal' ? 7 : 14
    const d = new Date(inicio)
    while (d.getDay() !== atividade.dia_semana) {
      d.setDate(d.getDate() + 1)
    }
    while (d <= rangeEnd) {
      if (d >= start) datas.push(new Date(d))
      d.setDate(d.getDate() + intervaloDias)
    }
    return datas
  }

  if (atividade.frequencia === 'mensal' || atividade.frequencia === 'trimestral' || atividade.frequencia === 'semestral') {
    const passoMeses = atividade.frequencia === 'mensal' ? 1 : atividade.frequencia === 'trimestral' ? 3 : 6
    let cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
    let safety = 0
    while (cursor <= rangeEnd && safety < 1000) {
      safety++
      const data = nthWeekdayOfMonth(cursor.getFullYear(), cursor.getMonth(), atividade.dia_semana, atividade.semana_do_mes)
      if (data && data >= start && data >= inicio && data <= rangeEnd) {
        datas.push(data)
      }
      cursor.setMonth(cursor.getMonth() + passoMeses)
    }
    return datas
  }

  return datas
}

export function ajustarParaDiaUtil(dataPrevista, holidaysSet) {
  return nextBusinessDay(dataPrevista, holidaysSet)
}

export function nomeDiaSemana(idx) {
  return DIAS_SEMANA[idx]
}

export const FREQUENCIAS = [
  { value: 'diaria', label: 'Diária' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
]

export const DIAS_SEMANA_OPCOES = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
]

export const SEMANA_DO_MES_OPCOES = [
  { value: 1, label: 'Primeira' },
  { value: 2, label: 'Segunda' },
  { value: 3, label: 'Terceira' },
  { value: 4, label: 'Quarta' },
  { value: -1, label: 'Última' },
]
