// ranking.js — ordena horarios por calidad. Ranking por DEFECTO: compacidad
// (menos huecos entre clases en un mismo día) + preferencia de turno.
//
// Es enchufable: "mejor calificados" será otro ranker en el Sprint 3 (cuando
// existan reseñas). Hasta entonces no se inventan ratings (D4).

import { turnoDeBloque } from "../data/tiempo.js";

/** Índices de banda ocupados por día: array (por día) de [bandaIdx...] ascendente. */
function bandasPorDia(mask, indice) {
  const porDia = indice.dias.map(() => []);
  for (let di = 0; di < indice.dias.length; di++) {
    for (let bi = 0; bi < indice.nBandas; bi++) {
      if (mask & (1n << BigInt(di * indice.nBandas + bi))) porDia[di].push(bi);
    }
  }
  return porDia;
}

/**
 * Métricas de un horario:
 *   huecos = bandas libres ENTRE la primera y la última clase de cada día (sumadas).
 *   fueraTurno = slots fuera del turno preferido (0 si no se pidió preferencia).
 */
export function metricasDeHorario(horario, indice, opciones = {}) {
  const porDia = bandasPorDia(horario.mask, indice);
  let huecos = 0;
  for (const dia of porDia) {
    if (dia.length > 1) huecos += (dia[dia.length - 1] - dia[0] + 1) - dia.length;
  }
  let fueraTurno = 0;
  const pref = opciones.turnoPreferido;
  if (pref) {
    for (let di = 0; di < porDia.length; di++) {
      for (const bi of porDia[di]) {
        if (turnoDeBloque({ inicio: indice.bandas[bi] }) !== pref) fueraTurno++;
      }
    }
  }
  return { huecos, fueraTurno };
}

/** Puntaje (menor = mejor). La preferencia de turno pesa menos que un hueco real. */
export function puntaje(metricas) {
  return metricas.huecos * 2 + metricas.fueraTurno;
}

/**
 * Promedio de reseñas de los docentes de un horario (0 si no hay datos).
 * @param {object} calificaciones  { "docenteId|materiaCodigo": promedio }
 */
export function calificacionDeHorario(horario, calificaciones) {
  let suma = 0, n = 0;
  for (const u of horario.unidades) {
    for (const g of u.grupos) {
      const r = calificaciones[`${g.docente_id}|${u.materiaCodigo}`];
      if (r != null) { suma += r; n++; }
    }
  }
  return n ? suma / n : 0;
}

/**
 * Ordena los horarios por calidad y adjunta métricas + calificación.
 * Por defecto: compacidad/turno (menor puntaje = mejor). Si opciones.preferirCalificados
 * y hay calificaciones: primero por promedio de reseñas (desc), luego por puntaje.
 * No corta: el corte a top N lo hace el llamador.
 */
export function rankear(horarios, indice, opciones = {}) {
  const cal = opciones.calificaciones;
  const porCalif = !!(cal && opciones.preferirCalificados);
  const enriquecidos = horarios.map((h) => ({
    ...h,
    metricas: metricasDeHorario(h, indice, opciones),
    calificacion: cal ? calificacionDeHorario(h, cal) : 0,
  }));
  enriquecidos.sort((a, b) =>
    porCalif
      ? (b.calificacion - a.calificacion) || (puntaje(a.metricas) - puntaje(b.metricas))
      : (puntaje(a.metricas) - puntaje(b.metricas))
  );
  return enriquecidos;
}
