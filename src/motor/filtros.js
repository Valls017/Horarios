// filtros.js (motor) — reduce las unidades candidatas de una materia ANTES de
// generar. Todos operan sobre el modelo de slots/datos; nada hardcodeado.
//
// opciones:
//   turnos: Set<"manana"|"tarde"|"noche">  (vacío/ausente = sin restricción)
//   evitarPrimeraBanda: bool               (la primera banda sale de los datos)
//   excluirPorDesignar: bool
//
// "Mejor calificados" NO está aquí: es un ranking enchufable (ranking.js) que
// queda deshabilitado hasta el Sprint 3 (sin ratings inventados, D4).

import { turnoDeBloque } from "../data/tiempo.js";

export function filtrarUnidades(unidades, opciones = {}, indice) {
  const primeraBanda = indice?.bandas?.[0];
  const turnos = opciones.turnos;
  return unidades.filter((u) => {
    if (opciones.excluirPorDesignar && u.porDesignar) return false;
    if (opciones.evitarPrimeraBanda && u.bloques.some((b) => b.inicio === primeraBanda)) return false;
    if (turnos && turnos.size > 0 && !u.bloques.every((b) => turnos.has(turnoDeBloque(b)))) return false;
    return true;
  });
}

/** "Fijar grupo": deja solo las unidades que incluyen ese grupo (poda previa). */
export function fijarGrupo(unidades, grupoId) {
  return unidades.filter((u) => u.gruposIds.includes(grupoId));
}
