// docentes.js — índice de docentes con las materias que dictan en 1/2026.
// Lee el registro estable `dataset.docentes` (cada uno con su docente_id).
// Busca por nombre de docente o por materia (tolerante a acentos).

import { indexar } from "../data/prerequisitos.js";
import { esc } from "./comunes.js";

const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function renderDocentes(dataset, busqueda = "") {
  const porCodigo = indexar(dataset.materias);
  const docentes = dataset.docentes ?? [];
  const q = norm(busqueda);
  const visibles = q
    ? docentes.filter((d) =>
        norm(d.nombre).includes(q) ||
        d.materias.some((c) => norm(porCodigo.get(c)?.nombre ?? "").includes(q)))
    : docentes;

  const filas = visibles
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
      <article class="docente" data-docente-id="${esc(d.id)}">
        <h3 class="docente-nombre">${esc(d.nombre)}</h3>
        <div class="chips">${chips}</div>
      </article>`;
    })
    .join("");

  return `
    <header class="seccion-h">
      <h1>Docentes</h1>
      <p class="sub">${docentes.length} docentes con asignación en la gestión 1/2026. Las reseñas viven en la página de cada materia.</p>
    </header>
    <div class="filtros">
      <input type="search" id="d-busqueda" class="f-texto" placeholder="Buscar docente o materia…"
        value="${esc(busqueda)}" aria-label="Buscar docente">
      <span class="conteo">${visibles.length} / ${docentes.length}</span>
    </div>
    ${visibles.length
      ? `<div class="docentes">${filas}</div>`
      : `<p class="vacio">Ningún docente coincide con la búsqueda.</p>`}`;
}
