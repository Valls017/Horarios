// plan.js — recomendación de semestre SIN choques.
// Combina el recomendador (data/prerequisitos) con el motor: de las materias
// habilitadas+ofertadas, arma un conjunto de hasta `tope` que tenga un horario
// sin cruces, priorizando los niveles más bajos (limpiar lo atrasado primero).

import { recomendadas, MATERIAS_POR_SEMESTRE } from "../data/prerequisitos.js";
import { unidadesDe } from "./unidades.js";
import { generarTodos } from "./generador.js";

/** ¿El conjunto de materias admite al menos UN horario sin choques? */
export function tieneCombinacionLimpia(materias, indice) {
  if (!materias.length) return true;
  const listas = materias.map((m) => unidadesDe(m, indice));
  if (listas.some((l) => l.length === 0)) return false; // alguna sin unidades agendables
  return generarTodos(listas, { limite: 1 }).length > 0;  // basta con encontrar una
}

/**
 * @returns {{ sugeridas: object[], chocan: object[], tambien: object[] }}
 *   sugeridas: hasta `tope`, con horario sin choques (nivel más bajo primero).
 *   chocan: quedaron afuera porque romperían el horario limpio.
 *   tambien: disponibles que exceden el tope.
 */
export function planSemestreSinChoques(materias, aprobadas, indice, tope = MATERIAS_POR_SEMESTRE) {
  const candidatos = recomendadas(materias, aprobadas)
    .slice()
    .sort((a, b) => a.nivel.localeCompare(b.nivel) || a.codigo.localeCompare(b.codigo));

  const sugeridas = [], chocan = [], tambien = [];
  for (const m of candidatos) {
    if (sugeridas.length >= tope) { tambien.push(m); continue; }
    if (tieneCombinacionLimpia([...sugeridas, m], indice)) sugeridas.push(m);
    else chocan.push(m); // no entra sin romper el horario limpio
  }
  return { sugeridas, chocan, tambien };
}
