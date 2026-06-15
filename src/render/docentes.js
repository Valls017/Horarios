// docentes.js — índice de docentes con las materias que dictan en 1/2026.
// (Las reseñas por docente llegan en un sprint posterior; aquí solo navegación.)

import { docentesDe } from "../data/dataset.js";
import { indexar } from "../data/prerequisitos.js";
import { esc } from "./comunes.js";

export function renderDocentes(dataset) {
  const porCodigo = indexar(dataset.materias);
  const docentes = docentesDe(dataset.materias);

  const filas = docentes
    .map((d) => {
      const chips = d.materias
        .map((c) => {
          const m = porCodigo.get(c);
          return m
            ? `<a class="chip" href="#/materia/${esc(c)}"><code>${esc(c)}</code> ${esc(m.nombre)}</a>`
            : "";
        })
        .join("");
      return `
      <article class="docente">
        <h3 class="docente-nombre">${esc(d.docente)}</h3>
        <div class="chips">${chips}</div>
      </article>`;
    })
    .join("");

  return `
    <header class="seccion-h">
      <h1>Docentes</h1>
      <p class="sub">${docentes.length} docentes con asignación en la gestión 1/2026.</p>
    </header>
    <div class="docentes">${filas}</div>`;
}
