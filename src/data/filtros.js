// filtros.js — filtrado del catálogo (lógica pura, sin DOM).

import { turnoDeBloque } from "./tiempo.js";

/** Texto normalizado (minúsculas, sin acentos) para búsqueda tolerante. */
function norm(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // quita diacríticos combinantes
}

/** Todos los nombres de docente de una materia (incluye TP). */
export function docentesDeMateria(m) {
  const set = new Set();
  for (const g of m.grupos) {
    if (g.docente) set.add(g.docente);
    for (const b of g.bloques) if (b.docente_tp) set.add(b.docente_tp);
  }
  return [...set];
}

function coincideTexto(m, texto) {
  if (!texto) return true;
  const q = norm(texto);
  const heno = [m.codigo, m.nombre, m.sigla, ...docentesDeMateria(m)];
  return heno.some((campo) => norm(campo).includes(q));
}

function coincideTurno(m, turno) {
  if (turno === "todos") return true;
  return m.grupos.some((g) => g.bloques.some((b) => turnoDeBloque(b) === turno));
}

/** Aplica los filtros a la lista de materias. */
export function filtrarMaterias(materias, f) {
  return materias.filter((m) => {
    if (f.nivel !== "todos" && m.nivel !== f.nivel) return false;
    if (f.tipo === "obligatorias" && m.es_electiva) return false;
    if (f.tipo === "electivas" && !m.es_electiva) return false;
    if (f.soloOfertadas && m.grupos.length === 0) return false;
    if (!coincideTurno(m, f.turno)) return false;
    if (!coincideTexto(m, f.texto)) return false;
    return true;
  });
}

/** Agrupa materias por nivel (A..I) conservando el orden de entrada. */
export function agruparPorNivel(materias) {
  const grupos = new Map();
  for (const m of materias) {
    if (!grupos.has(m.nivel)) grupos.set(m.nivel, []);
    grupos.get(m.nivel).push(m);
  }
  return [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}
