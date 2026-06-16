// generador.js — motor de armado de horarios sin choques. Puro, sin DOM.
//
// Vocabulario (3 conceptos):
//   - unidad: unidad agendable de una materia (con su bitmask). Ver unidades.js.
//   - materiasElegidas: input del usuario (lista de materias).
//   - horario: combinación resultante { unidades:[una por materia], mask }.
//
// Choque = AND de bitmasks ≠ 0n. Física NO es caso especial: sus unidades ya son
// teoría + un laboratorio, así que el motor trata todo de forma uniforme.

import { construirIndiceSlots, slotsDeMask } from "./slots.js";
import { unidadesDe } from "./unidades.js";
import { filtrarUnidades, fijarGrupo } from "./filtros.js";
import { rankear } from "./ranking.js";

const MAX_COMBOS = 50000; // tope de seguridad ante entradas patológicas

// ---------------------------------------------------------------------------
// Núcleo combinatorio. Opera sobre "listas" = array (por materia) de arrays de
// unidades. Así el oráculo de test recibe EXACTAMENTE la misma entrada.
// ---------------------------------------------------------------------------

/** BACKTRACKING con poda. Devuelve TODOS los horarios sin choques (hasta `limite`). */
export function generarTodos(listas, { limite = MAX_COMBOS } = {}) {
  // Heurística de poda: materias con menos unidades primero.
  const ordenadas = [...listas].sort((a, b) => a.length - b.length);
  const resultados = [];
  const pila = [];

  function bt(k, maskAcum) {
    if (resultados.length >= limite) return;
    if (k === ordenadas.length) {
      resultados.push({ unidades: pila.slice(), mask: maskAcum });
      return;
    }
    for (const u of ordenadas[k]) {
      if ((maskAcum & u.mask) === 0n) {
        pila.push(u);
        bt(k + 1, maskAcum | u.mask);
        pila.pop();
        if (resultados.length >= limite) return;
      }
    }
  }
  bt(0, 0n);
  return resultados;
}

/**
 * ORÁCULO (solo para tests): producto cartesiano COMPLETO + filtro de choques.
 * Debe devolver el MISMO conjunto que generarTodos en casos chicos.
 */
export function generarPorProductoCartesiano(listas) {
  let productos = [[]];
  for (const lista of listas) {
    const next = [];
    for (const combo of productos) for (const u of lista) next.push([...combo, u]);
    productos = next;
  }
  const sinChoque = (combo) => {
    let mask = 0n;
    for (const u of combo) {
      if (mask & u.mask) return false;
      mask |= u.mask;
    }
    return true;
  };
  return productos
    .filter(sinChoque)
    .map((unidades) => ({ unidades, mask: unidades.reduce((mm, u) => mm | u.mask, 0n) }));
}

// ---------------------------------------------------------------------------
// Diagnóstico de fallo (no devolver vacío en silencio).
// ---------------------------------------------------------------------------

/** Decodifica el primer slot compartido entre dos unidades, para el reporte. */
function primerChoque(a, b, indice) {
  const slots = slotsDeMask(a.mask & b.mask, indice);
  return slots[0] ?? null;
}

/**
 * @param {{materia,unidades,todas}[]} porMateria  unidades = ya filtradas.
 * @returns {object} diagnóstico con tipo, mensaje y sugerencia.
 */
export function diagnosticar(porMateria, indice) {
  // 1) Materias que se quedaron sin candidatas (los filtros las vaciaron).
  const vacias = porMateria.filter((x) => x.unidades.length === 0);
  if (vacias.length) {
    return {
      tipo: "sin_candidatos",
      materias: vacias.map((x) => x.materia.codigo),
      mensaje:
        `Sin grupos disponibles para: ${vacias.map((x) => x.materia.nombre).join(", ")}. ` +
        `Tenían ${vacias.map((x) => x.todas).join("/")} grupo(s) antes de filtrar.`,
      sugerencia:
        "Relajá un filtro (turno, evitar 06:45 o excluir 'por designar') o soltá el grupo fijado de esa materia.",
    };
  }

  // 2) Algún par de materias sin NINGUNA combinación compatible (choque duro).
  for (let i = 0; i < porMateria.length; i++) {
    for (let j = i + 1; j < porMateria.length; j++) {
      const A = porMateria[i], B = porMateria[j];
      const compatible = A.unidades.some((a) => B.unidades.some((b) => (a.mask & b.mask) === 0n));
      if (!compatible) {
        const slot = primerChoque(A.unidades[0], B.unidades[0], indice);
        return {
          tipo: "conflicto_par",
          materias: [A.materia.codigo, B.materia.codigo],
          mensaje:
            `"${A.materia.nombre}" y "${B.materia.nombre}" chocan en TODOS sus grupos` +
            (slot ? ` (p. ej. ${slot.dia} ${slot.inicio})` : "") + ".",
          sugerencia:
            "No pueden cursarse juntas esta gestión con estos grupos. Quitá una de las dos o fijá grupos que no se pisen.",
        };
      }
    }
  }

  // 3) Cada par es compatible pero no hay combinación global (conflicto combinado).
  return {
    tipo: "conflicto_combinado",
    materias: porMateria.map((x) => x.materia.codigo),
    mensaje: "No existe ninguna combinación sin choques con todas las materias a la vez.",
    sugerencia: "Quitá una materia (o fijá grupos distintos) para liberar bandas.",
  };
}

// ---------------------------------------------------------------------------
// Fachada de alto nivel.
// ---------------------------------------------------------------------------

/**
 * Genera horarios sin choques para las materias elegidas.
 * @param {object[]} materiasElegidas
 * @param {object} opciones  { indice?, limite=15, turnos?, evitarPrimeraBanda?,
 *   excluirPorDesignar?, fijados?:{codigo:grupoId}, turnoPreferido? }
 * @returns {{ horarios:object[], total:number, truncado:boolean,
 *            diagnostico:object|null, indice:object }}
 */
export function generarHorarios(materiasElegidas, opciones = {}) {
  const indice = opciones.indice ?? construirIndiceSlots(materiasElegidas);
  const limite = opciones.limite ?? 15;

  const porMateria = materiasElegidas.map((m) => {
    let us = unidadesDe(m, indice);
    const todas = us.length;
    const fijo = opciones.fijados?.[m.codigo];
    if (fijo) us = fijarGrupo(us, fijo);
    us = filtrarUnidades(us, opciones, indice);
    return { materia: m, unidades: us, todas };
  });

  const listas = porMateria.map((x) => x.unidades);
  const todos = generarTodos(listas, { limite: opciones.maxCombos ?? MAX_COMBOS });

  if (todos.length === 0) {
    return { horarios: [], total: 0, truncado: false, diagnostico: diagnosticar(porMateria, indice), indice };
  }

  const rankeados = rankear(todos, indice, opciones);
  return {
    horarios: rankeados.slice(0, limite),
    total: todos.length,
    truncado: todos.length >= (opciones.maxCombos ?? MAX_COMBOS),
    diagnostico: null,
    indice,
  };
}
