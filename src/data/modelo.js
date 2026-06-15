// modelo.js — reglas de selección de una materia y detección de choques.
// Una "selección" es la unidad inscribible de una materia (lo que el estudiante elige).
// Sin dependencias del DOM.

import { listasSolapan, turnoDeBloque } from "./tiempo.js";

/**
 * Devuelve todos los bloques de una lista de grupos, aplanados.
 * @param {object[]} grupos
 * @returns {object[]}
 */
export function bloquesDe(grupos) {
  return grupos.flatMap((g) => g.bloques);
}

/**
 * Enumera las selecciones válidas de una materia.
 *
 * - Materia sin vínculo: cada grupo rol="completo" es una selección por sí solo.
 * - Materia con vínculo (p. ej. Física): una selección = UN grupo rol="teoria" +
 *   UN grupo rol="laboratorio"/"practica" del MISMO vínculo.
 *
 * Cada selección: { id, materia, grupos:[...], bloques:[...], docentes:Set, porDesignar:bool }.
 * @param {object} materia
 * @returns {object[]}
 */
export function seleccionesDe(materia) {
  const grupos = materia.grupos ?? [];
  const conVinculo = grupos.some((g) => g.vinculo);

  if (!conVinculo) {
    return grupos
      .filter((g) => g.rol === "completo" || g.rol === undefined)
      .map((g) => construirSeleccion(materia, [g]));
  }

  // Agrupar por vínculo y combinar teoría × (laboratorio|práctica).
  const selecciones = [];
  const vinculos = [...new Set(grupos.map((g) => g.vinculo).filter(Boolean))];
  for (const v of vinculos) {
    const delVinculo = grupos.filter((g) => g.vinculo === v);
    const teorias = delVinculo.filter((g) => g.rol === "teoria");
    const labs = delVinculo.filter((g) => g.rol === "laboratorio" || g.rol === "practica");
    for (const t of teorias) {
      for (const l of labs) {
        selecciones.push(construirSeleccion(materia, [t, l]));
      }
    }
  }
  return selecciones;
}

function construirSeleccion(materia, grupos) {
  const bloques = bloquesDe(grupos);
  const docentes = new Set();
  let porDesignar = false;
  for (const g of grupos) {
    if (g.docente) docentes.add(g.docente);
    else porDesignar = true;
    for (const b of g.bloques) {
      if (b.docente_tp) docentes.add(b.docente_tp);
    }
  }
  return {
    id: `${materia.codigo}:${grupos.map((g) => g.id).join("+")}`,
    materiaCodigo: materia.codigo,
    materiaNombre: materia.nombre,
    grupos,
    bloques,
    docentes,
    porDesignar,
  };
}

/** ¿Dos selecciones (de materias distintas) chocan en horario? */
export function seleccionesChocan(a, b) {
  return listasSolapan(a.bloques, b.bloques);
}

/** Turnos que toca una selección ("manana" | "tarde" | "noche"). */
export function turnosDeSeleccion(seleccion) {
  return new Set(seleccion.bloques.map(turnoDeBloque));
}
