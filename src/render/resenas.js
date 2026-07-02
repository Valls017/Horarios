// resenas.js (render) — sección de reseñas en la página de una materia.
// Ver es público; calificar requiere cuenta institucional (D7).

import { esc } from "./comunes.js";
import { esCorreoInstitucional } from "../data/auth.js";

/** Docentes reseñables de una materia: { id, nombre } únicos (sin "por designar"). */
export function docentesResenables(materia) {
  const vistos = new Map();
  for (const g of materia.grupos) {
    if (g.docente_id && g.docente) vistos.set(g.docente_id, g.docente);
    for (const b of g.bloques) {
      if (b.docente_tp_id && b.docente_tp) vistos.set(b.docente_tp_id, b.docente_tp);
    }
  }
  return [...vistos.entries()].map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** "★★★☆☆" para mostrar (no interactivo). */
function estrellas(n) {
  const llenas = Math.round(n);
  return `<span class="estrellas" aria-label="${n} de 5">${"★".repeat(llenas)}${"☆".repeat(5 - llenas)}</span>`;
}

function fecha(iso) {
  try { return new Date(iso).toLocaleDateString("es", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return ""; }
}

function resumenTexto(res) {
  if (!res || !res.cantidad) return `<span class="rsn-sin">sin reseñas todavía — sé el primero ⭐</span>`;
  return `${estrellas(res.promedio)} <span class="rsn-prom">${res.promedio.toFixed(1)}</span>
    <span class="rsn-cant">· ${res.cantidad} reseña${res.cantidad === 1 ? "" : "s"}</span>`;
}

// --- Formulario de calificación (estado del borrador en estado.resenas) ---
function formulario(docente, materia, slice, sesion) {
  if (!sesion.usuario) {
    return `<p class="rsn-gate">Iniciá sesión desde <a href="#/perfil">Perfil</a> con tu correo institucional para reseñar.</p>`;
  }
  if (!esCorreoInstitucional(sesion.usuario.email)) {
    return `<p class="rsn-gate">Solo un correo institucional <code>@est.umss.edu</code> puede reseñar.</p>`;
  }
  const b = slice.borrador;
  const estrellasInput = [1, 2, 3, 4, 5].map((n) =>
    `<button type="button" class="rsn-star${n <= b.calificacion ? " on" : ""}" data-estrella="${n}" aria-label="${n} estrella${n === 1 ? "" : "s"}">★</button>`
  ).join("");
  const err = slice.error ? `<p class="rsn-err">${esc(slice.error)}</p>` : "";
  const dis = slice.enviando ? " disabled" : "";
  return `
    <form id="rsn-form" class="rsn-form" data-docente-id="${esc(docente.id)}" data-materia="${esc(materia.codigo)}">
      <div class="rsn-stars-input" role="group" aria-label="Calificación">${estrellasInput}</div>
      <textarea id="rsn-comentario" class="rsn-coment" placeholder="Tu comentario (opcional)" maxlength="2000"${dis}>${esc(b.comentario)}</textarea>
      ${err}
      <button type="submit" class="rsn-enviar"${b.calificacion < 1 || slice.enviando ? " disabled" : ""}>
        ${slice.enviando ? "Guardando…" : slice.mia ? "Actualizar mi reseña" : "Publicar reseña"}</button>
    </form>`;
}

function bloqueDocente(docente, materia, slice, sesion) {
  const res = slice.resumen[docente.id];
  const abierto = slice.abierto === docente.id;
  const cabecera = `
    <div class="rsn-doc-h">
      <span class="rsn-doc-nom">${esc(docente.nombre)}</span>
      <span class="rsn-doc-res">${resumenTexto(res)}</span>
      <button type="button" class="rsn-toggle btn-link" data-docente-id="${esc(docente.id)}">
        ${abierto ? "ocultar" : "ver / calificar"}</button>
    </div>`;
  if (!abierto) return `<article class="rsn-doc">${cabecera}</article>`;

  const lista = slice.cargando
    ? `<p class="rsn-cargando">Cargando reseñas…</p>`
    : slice.lista.length
      ? `<ul class="rsn-lista">${slice.lista.map((r) => `
          <li><div class="rsn-li-h">${estrellas(r.calificacion)}<span class="rsn-li-fecha">${esc(fecha(r.created_at))}</span></div>
            ${r.comentario ? `<p class="rsn-li-com">${esc(r.comentario)}</p>` : `<p class="rsn-li-com rsn-vacio">(sin comentario)</p>`}</li>`).join("")}</ul>`
      : `<p class="rsn-sin">Todavía no hay reseñas. Sé la primera persona en dejar una.</p>`;

  return `<article class="rsn-doc abierta">${cabecera}${lista}${formulario(docente, materia, slice, sesion)}</article>`;
}

/** Sección completa de reseñas para una materia. */
export function renderResenas(materia, slice, sesion) {
  const docentes = docentesResenables(materia);
  if (!docentes.length) {
    return `<section class="resenas-sec"><h2>Reseñas de docentes</h2>
      <p class="rel-vacio">Esta materia no tiene docentes asignados para reseñar (todos "por designar").</p></section>`;
  }
  const cargandoMateria = slice.codigo !== materia.codigo;
  const cuerpo = cargandoMateria
    ? `<p class="rsn-cargando">Cargando reseñas…</p>`
    : slice.error
      ? `<p class="rsn-err">${esc(slice.error)}</p>`
      : docentes.map((d) => bloqueDocente(d, materia, slice, sesion)).join("");

  return `
    <section class="resenas-sec">
      <h2>Reseñas de docentes</h2>
      ${cuerpo}
    </section>`;
}
