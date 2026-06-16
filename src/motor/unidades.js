// unidades.js — "unidad agendable": la unidad inscribible de una materia, ya
// con su bitmask de slots. Es el vocabulario del MOTOR.
//
// Envuelve seleccionesDe() de la capa de datos (Sprint 1) SIN modificarla: una
// `unidad` = una `selección` enriquecida con su `mask`. Para materias con vínculo
// (Física) cada unidad ya es teoría + un laboratorio (producto teoría × lab), así
// que el motor trata TODAS las materias de forma uniforme.

import { seleccionesDe } from "../data/modelo.js";
import { maskDeBloques } from "./slots.js";

/**
 * Unidades agendables de una materia, con bitmask.
 * Descarta unidades con auto-choque interno (TIPO A: p. ej. una combinación
 * teoría×lab de Física cuyos bloques se pisan = par imposible). Eso NO es error
 * de datos; simplemente esa combinación no se puede cursar. (Los solapes DENTRO
 * de un mismo grupo —TIPO B— son error de datos y los marca la validación.)
 *
 * @returns {object[]} unidades { id, materiaCodigo, materiaNombre, grupos,
 *          bloques, gruposIds:string[], docentes:Set, porDesignar, mask }
 */
export function unidadesDe(materia, indice) {
  const unidades = [];
  for (const sel of seleccionesDe(materia)) {
    const { mask, colision } = maskDeBloques(sel.bloques, indice);
    if (colision) continue; // TIPO A: par imposible, se omite
    unidades.push({
      ...sel,
      gruposIds: sel.grupos.map((g) => g.id),
      mask,
    });
  }
  return unidades;
}
