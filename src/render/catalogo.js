// catalogo.js — vista de listado de materias con filtros.

import { filtrarMaterias, agruparPorNivel } from "../data/filtros.js";
import { esc, NOMBRE_NIVEL } from "./comunes.js";

const NIVELES = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];

function opcion(valor, etiqueta, sel) {
  return `<option value="${valor}"${valor === sel ? " selected" : ""}>${esc(etiqueta)}</option>`;
}

function barraFiltros(f, totalMostrado, totalGlobal) {
  return `
  <form class="filtros" id="filtros" autocomplete="off">
    <input type="search" id="f-texto" class="f-texto" placeholder="Buscar materia, código o docente…"
           value="${esc(f.texto)}" aria-label="Buscar">
    <select id="f-nivel" aria-label="Nivel">
      ${opcion("todos", "Todos los niveles", f.nivel)}
      ${NIVELES.map((n) => opcion(n, NOMBRE_NIVEL[n], f.nivel)).join("")}
    </select>
    <select id="f-tipo" aria-label="Tipo">
      ${opcion("todas", "Obligatorias y electivas", f.tipo)}
      ${opcion("obligatorias", "Solo obligatorias", f.tipo)}
      ${opcion("electivas", "Solo electivas", f.tipo)}
    </select>
    <select id="f-turno" aria-label="Turno">
      ${opcion("todos", "Cualquier turno", f.turno)}
      ${opcion("manana", "Mañana", f.turno)}
      ${opcion("tarde", "Tarde", f.turno)}
      ${opcion("noche", "Noche", f.turno)}
    </select>
    <label class="f-check">
      <input type="checkbox" id="f-ofertadas"${f.soloOfertadas ? " checked" : ""}>
      Solo ofertadas 1/2026
    </label>
    <button type="button" id="f-limpiar" class="btn-link">Limpiar</button>
    <span class="conteo">${totalMostrado} / ${totalGlobal}</span>
  </form>`;
}

function tarjeta(m) {
  const badges = [];
  badges.push(`<span class="badge nivel">${esc(m.nivel)}</span>`);
  if (m.es_electiva) badges.push(`<span class="badge electiva">Electiva</span>`);
  if (m.tipo === "taller_titulacion") badges.push(`<span class="badge titulacion">Titulación</span>`);

  const oferta = m.grupos.length
    ? `<span class="oferta ok">${m.grupos.length} grupo${m.grupos.length > 1 ? "s" : ""}</span>`
    : `<span class="oferta no">No ofertada en 1/2026</span>`;

  const prereq = m.prerrequisitos.length
    ? `<span class="prereq">${m.prerrequisitos.length} prerequisito${m.prerrequisitos.length > 1 ? "s" : ""}</span>`
    : `<span class="prereq libre">Sin prerrequisitos</span>`;

  return `
  <a class="tarjeta" href="#/materia/${esc(m.codigo)}">
    <div class="tarjeta-top">
      <code class="codigo">${esc(m.codigo)}</code>
      <div class="badges">${badges.join("")}</div>
    </div>
    <h3 class="nombre">${esc(m.nombre)}</h3>
    <div class="tarjeta-meta">${oferta}<span class="sep">·</span>${prereq}</div>
  </a>`;
}

/** Devuelve el HTML de la vista catálogo. */
export function renderCatalogo(dataset, filtros) {
  const materias = dataset.materias;
  const mostradas = filtrarMaterias(materias, filtros);
  const porNivel = agruparPorNivel(mostradas);

  const secciones = porNivel.length
    ? porNivel
        .map(
          ([nivel, lista]) => `
      <section class="nivel-bloque">
        <h2 class="nivel-titulo">${esc(NOMBRE_NIVEL[nivel])} <span class="nivel-n">${lista.length}</span></h2>
        <div class="grid">${lista.map(tarjeta).join("")}</div>
      </section>`
        )
        .join("")
    : `<p class="vacio">No hay materias que coincidan con los filtros.</p>`;

  return `
    ${barraFiltros(filtros, mostradas.length, materias.length)}
    ${secciones}`;
}
