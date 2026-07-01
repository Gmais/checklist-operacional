// Senha dinâmica compartilhada: dia do mês atual, aceitando com ou sem
// zero à esquerda (ex: dia 5 aceita "5" e "05"). Usada tanto pelo gatilho
// oculto de manutenção quanto pela proteção de acesso das abas administrativas.
export function senhaValidaHoje() {
  const dia = new Date().getDate()
  return [String(dia), String(dia).padStart(2, '0')]
}

export function validarSenhaDoDia(valor) {
  return senhaValidaHoje().includes(String(valor).trim())
}
