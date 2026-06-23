// materia.js — vista de detalle de una materia (grupos, horarios, prerrequisitos).

import { indexar, dependientes } from "../data/prerequisitos.js";
import { esc, NOMBRE_NIVEL, nombreDocente, ordenarBloques } from "./comunes.js";
import { renderResenas } from "./resenas.js";

function chipMateria(m) {
  if (!m) return "";
  return `<a class="chip" href="#/materia/${esc(m.codigo)}">
    <code>${esc(m.codigo)}</code> ${esc(m.nombre)}</a>`;
}

function listaRelacionadas(codigos, porCodigo, vacio) {
  if (!codigos.length) return `<p class="rel-vacio">${esc(vacio)}</p>`;
  return `<div class="chips">${codigos.map((c) => chipMateria(porCodigo.get(c))).join("")}</div>`;
}

function bloqueFila(b) {
  const tp = b.tipo === "TP"
    ? `<span class="tp" title="Sesión teórico-práctica del mismo grupo">TP${b.docente_tp ? " · " + esc(b.docente_tp) : ""}</span>`
    : "";
  return `<tr>
    <td class="dia">${esc(b.dia)}</td>
    <td class="hora">${esc(b.inicio)}–${esc(b.fin)}</td>
    <td class="aula">${esc(b.aula)}</td>
    <td class="tpcol">${tp}</td>
  </tr>`;
}

function rolEtiqueta(g) {
  if (g.rol === "teoria") return `<span class="rol teoria">Teoría</span>`;
  if (g.rol === "laboratorio") return `<span class="rol lab">Laboratorio</span>`;
  if (g.rol === "practica") return `<span class="rol lab">Práctica</span>`;
  return "";
}

function grupoCard(g) {
  const designar = g.docente ? "" : " por-designar";
  return `
  <article class="grupo${designar}">
    <header class="grupo-h">
      <span class="grupo-id">Grupo ${esc(g.id)}</span>
      ${rolEtiqueta(g)}
      <span class="grupo-doc">${esc(nombreDocente(g.docente))}</span>
    </header>
    <table class="bloques">
      <tbody>${ordenarBloques(g.bloques).map(bloqueFila).join("")}</tbody>
    </table>
  </article>`;
}

function seccionOferta(m) {
  if (!m.grupos.length) {
    return `<div class="aviso">Esta materia <strong>no se oferta en 1/2026</strong>.
      Aparece para el pensum y el roadmap de prerrequisitos.</div>`;
  }
  const conVinculo = m.grupos.some((g) => g.vinculo);
  const nota = conVinculo
    ? `<p class="nota">Selección válida: <strong>un grupo de Teoría + un Laboratorio</strong> del mismo vínculo.</p>`
    : "";
  return `${nota}<div class="grupos">${m.grupos.map(grupoCard).join("")}</div>`;
}

/** Devuelve el HTML del detalle, o un aviso si el código no existe. */
export function renderMateria(dataset, codigo, resenas, sesion) {
  const porCodigo = indexar(dataset.materias);
  const m = porCodigo.get(codigo);
  if (!m) {
    return `<p class="vacio">No se encontró la materia <code>${esc(codigo)}</code>.
      <a href="#/">Volver al catálogo</a>.</p>`;
  }
  const deps = dependientes(dataset.materias).get(codigo) ?? [];

  const badges = [`<span class="badge nivel">${esc(NOMBRE_NIVEL[m.nivel])}</span>`];
  if (m.es_electiva) badges.push(`<span class="badge electiva">Electiva</span>`);
  if (m.tipo === "taller_titulacion") badges.push(`<span class="badge titulacion">Taller de titulación</span>`);
  if (m.sigla) badges.push(`<span class="badge sigla">${esc(m.sigla)}</span>`);

  return `
  <nav class="migas"><a href="#/">← Catálogo</a></nav>
  <header class="materia-h">
    <code class="codigo-grande">${esc(m.codigo)}</code>
    <h1>${esc(m.nombre)}</h1>
    <div class="badges">${badges.join("")}</div>
  </header>

  <div class="prereqs">
    <div class="prereq-col">
      <h2>Prerrequisitos</h2>
      ${listaRelacionadas(m.prerrequisitos, porCodigo, "Sin prerrequisitos: cursable desde el inicio.")}
    </div>
    <div class="prereq-col">
      <h2>Habilita a</h2>
      ${listaRelacionadas(deps, porCodigo, "No es prerrequisito de otra materia.")}
    </div>
  </div>

  <section class="oferta-sec">
    <h2>Oferta 1/2026</h2>
    ${seccionOferta(m)}
  </section>

  ${resenas ? renderResenas(m, resenas, sesion ?? { usuario: null }) : ""}`;
}
