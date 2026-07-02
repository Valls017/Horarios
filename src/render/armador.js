// armador.js — vista del autogenerador de horarios (portada, #/).

import { agruparPorNivel } from "../data/filtros.js";
import { MATERIAS_POR_SEMESTRE } from "../data/prerequisitos.js";
import { unidadesDe } from "../motor/unidades.js";
import { esc, NOMBRE_NIVEL, NOMBRE_DIA, plegable } from "./comunes.js";
import { renderHorarioGrid } from "./horario-grid.js";

const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// ---------- Selector de materias (semestres plegables; buscar los abre) ----------
function selector(materias, armador, ui) {
  const q = norm(armador.busqueda);
  const filtradas = materias.filter((m) => !q || norm(m.codigo).includes(q) || norm(m.nombre).includes(q));
  const grupos = agruparPorNivel(filtradas);
  const lista = grupos.length
    ? grupos.map(([nivel, ms]) => {
        const marcadas = ms.filter((m) => armador.elegidas.has(m.codigo)).length;
        return plegable({
          clave: `arch:${nivel}`, ui, fijarAbierto: Boolean(q), clase: "ar-nivel",
          resumen: `<span class="ar-nivel-t">${esc(NOMBRE_NIVEL[nivel])}</span>
            ${marcadas ? `<span class="ar-nivel-c">${marcadas} ✓</span>` : ""}`,
          contenido: ms.map((m) => {
            const on = armador.elegidas.has(m.codigo);
            return `<label class="ar-item${on ? " on" : ""}">
              <input type="checkbox" class="ar-check" data-codigo="${esc(m.codigo)}"${on ? " checked" : ""}>
              <code>${esc(m.codigo)}</code> ${esc(m.nombre)}</label>`;
          }).join(""),
        });
      }).join("")
    : `<p class="rel-vacio">Sin materias que coincidan.</p>`;
  return `
    <div class="ar-selector">
      <input type="search" id="ar-busqueda" placeholder="Buscar materia ofertada…" value="${esc(armador.busqueda)}" aria-label="Buscar materia">
      <div class="ar-checklist">${lista}</div>
    </div>`;
}

// ---------- Materias elegidas: quitar + elegir grupo/docente a mano ----------
// Para quien ya sabe qué docente quiere: el selector fija esa unidad y el motor
// arma alrededor (equivale a fijar desde la grilla, pero sin generar primero).
function selectorGrupo(m, armador) {
  const unidades = unidadesDe(m, armador.indice);
  if (!unidades.length) return "";
  const fijado = armador.opciones.fijados[m.codigo];
  const opciones = unidades.map((u) => {
    // El lab/práctica identifica unívocamente la unidad (Física); si no, el grupo.
    const disc = u.grupos.find((g) => g.rol === "laboratorio" || g.rol === "practica") ?? u.grupos[0];
    const docs = [...u.docentes];
    const etiqueta = `g${u.gruposIds.join("+")} · ${docs.length ? docs.join(", ") : "por designar"}`;
    const sel = fijado && u.gruposIds.includes(fijado) ? " selected" : "";
    return `<option value="${esc(disc.id)}"${sel}>${esc(etiqueta)}</option>`;
  }).join("");
  return `<select class="ar-fijar" data-codigo="${esc(m.codigo)}" aria-label="Elegir grupo y docente de ${esc(m.nombre)}">
    <option value="">grupo: auto (el mejor)</option>${opciones}</select>`;
}

function elegidas(materias, armador) {
  const ms = materias.filter((m) => armador.elegidas.has(m.codigo));
  if (!ms.length) return `<p class="rel-vacio">Todavía no elegiste materias.</p>`;
  return `<ul class="ar-elegidas">${ms.map((m) => `
    <li>
      <button class="ar-quitar" data-quitar="${esc(m.codigo)}" title="Quitar" aria-label="Quitar ${esc(m.nombre)}">×</button>
      <span class="ar-eleg-nom"><code>${esc(m.codigo)}</code> ${esc(m.nombre)}</span>
      ${selectorGrupo(m, armador)}
    </li>`).join("")}</ul>`;
}

// ---------- Filtros: dos toggles + "mejor calificados" deshabilitado ----------
function filtros(opciones) {
  return `
    <div class="ar-filtros2">
      <label class="ar-chk"><input type="checkbox" id="ar-evitar0645"${opciones.evitarPrimeraBanda ? " checked" : ""}> Evitar 06:45</label>
      <label class="ar-chk"><input type="checkbox" id="ar-pordesignar"${opciones.excluirPorDesignar ? " checked" : ""}> Sin “por designar”</label>
      <label class="ar-chk" title="Ordena por promedio de reseñas de los docentes">
        <input type="checkbox" id="ar-calificados"${opciones.preferirCalificados ? " checked" : ""}> Mejor calificados</label>
    </div>`;
}

// ---------- Cruces (modo permisivo) ----------
function unidadesEnSlot(h, slot) {
  const out = [];
  for (const u of h.unidades) {
    for (const g of u.grupos) {
      if (g.bloques.some((b) => b.dia === slot.dia && b.inicio === slot.inicio)) {
        out.push(`${u.materiaNombre} (g${g.id})`);
        break;
      }
    }
  }
  return out;
}

function avisoCruce(h) {
  if (!h.conflictos?.length) return "";
  const partes = h.conflictos.map((s) =>
    `${unidadesEnSlot(h, s).join(" y ")} se pisan el ${(NOMBRE_DIA[s.dia] ?? s.dia).toLowerCase()} ${s.inicio}`);
  const n = h.conflictCount;
  return `<div class="ar-cruce-aviso">⚠ ${n} cruce${n === 1 ? "" : "s"} — ${esc(partes.join("; "))}</div>`;
}

// ---------- Leyenda ----------
function leyenda(h, fijados) {
  return `<ul class="hg-leyenda">${h.unidades.map((u, i) => {
    const docs = [...u.docentes];
    const fij = u.gruposIds.includes(fijados[u.materiaCodigo]);
    return `<li class="mat-c${i % 12}"><span class="hg-pill"></span>
      ${fij ? '<span class="hg-lock" title="grupo fijado">🔒</span> ' : ""}<strong>${esc(u.materiaNombre)}</strong> · grupo ${esc(u.gruposIds.join("+"))}
      ${docs.length ? `· ${esc(docs.join(", "))}` : `· <em>por designar</em>`}</li>`;
  }).join("")}</ul>`;
}

function etiquetaTotal(r) {
  if (r.permisivo) return `Sin combinación libre de choques — mostrando ${r.horarios.length} con el menor cruce posible`;
  return `${r.total} horario${r.total === 1 ? "" : "s"} sin choques${r.truncado ? "+" : ""} · top ${r.horarios.length}`;
}

function chip(hr, i, activo, permisivo, calificados) {
  let sec;
  if (permisivo) sec = `con ${hr.conflictCount} cruce${hr.conflictCount === 1 ? "" : "s"}`;
  else if (calificados) sec = hr.calificacion > 0 ? `★ ${hr.calificacion.toFixed(1)}` : "sin calificar";
  else sec = `${hr.metricas.huecos} hueco${hr.metricas.huecos === 1 ? "" : "s"}`;
  const badge = i === 0 ? `<span class="ar-mejor">mejor armado</span>` : "";
  return `<button class="ar-opcion${i === activo ? " on" : ""}${permisivo ? " cruce" : ""}" data-opcion="${i}">
    <span class="ar-op-n">Opción ${i + 1}${badge}</span><span class="ar-op-sec">${sec}</span></button>`;
}

// ---------- Mis horarios guardados (también se muestra en Perfil) ----------
/** Solo la lista (la usan el armador y el menú de Perfil). */
export function listaGuardados(armador) {
  const gs = armador.guardados ?? [];
  const fecha = (iso) => { try { return new Date(iso).toLocaleDateString("es"); } catch { return ""; } };
  const acciones = (g) => armador.confirmarBorrar === g.id
    ? `<button type="button" class="ar-borrar-h confirm" data-id="${esc(g.id)}">sí, borrar</button>
       <button type="button" class="ar-borrar-no btn-link">no</button>`
    : `<button type="button" class="ar-cargar btn-link" data-id="${esc(g.id)}">cargar</button>
       <button type="button" class="ar-borrar-h btn-link" data-id="${esc(g.id)}">borrar</button>`;
  return gs.length
    ? `<ul class="ar-guardados-lista">${gs.map((g) => `
        <li>
          <span class="arg-nom">${esc(g.nombre)}</span>
          <span class="arg-fecha">${esc(fecha(g.created_at))}</span>
          ${acciones(g)}
        </li>`).join("")}</ul>`
    : `<p class="rel-vacio">Todavía no guardaste horarios.</p>`;
}

export function renderGuardados(armador) {
  return `<section class="ar-guardados"><h2 class="ar-h">Mis horarios guardados</h2>${listaGuardados(armador)}</section>`;
}

// ---------- Formulario inline "guardar horario" (reemplaza a window.prompt) ----------
function formGuardar(armador) {
  if (!armador.guardarAbierto) return "";
  return `
    <form id="ar-guardar-form" class="ar-guardar-form">
      <input type="text" id="ar-nombre" maxlength="60" placeholder="Nombre del horario"
        value="Mi horario" aria-label="Nombre del horario">
      <button type="submit" class="ar-guardar-ok">Guardar</button>
      <button type="button" id="ar-guardar-cancelar" class="btn-link">cancelar</button>
    </form>`;
}

function resultados(armador, sesion) {
  if (armador.elegidas.size === 0)
    return `
    <div class="ar-onboard">
      <h3>Así funciona</h3>
      <ol class="ar-pasos">
        <li><strong>Elegí tus materias</strong> en el panel — tocá un semestre para abrirlo.</li>
        <li><strong>Mirá las opciones</strong>: generamos todas las combinaciones <em>sin choques</em>, de mejor a peor.</li>
        <li><strong>Fijá el grupo</strong> que quieras tocándolo en la grilla, e imprimí o guardá tu draft.</li>
      </ol>
      <p class="ar-onboard-tip">¿No sabés qué te toca cursar? <a href="#/avance">Mi avance</a> te lo recomienda según tus aprobadas.</p>
    </div>`;

  const r = armador.resultado;
  if (!r) return `<p class="rel-vacio">Sin resultados.</p>`;

  // Sin candidatos (un filtro vació una materia): no hay grupos que combinar.
  if (r.horarios.length === 0) {
    const d = r.diagnostico;
    return `<div class="ar-aviso-info">
      <p>${esc(d?.mensaje ?? "No hay grupos disponibles con estos filtros.")}</p>
      ${d?.sugerencia ? `<p class="ar-aviso-sug">💡 ${esc(d.sugerencia)}</p>` : ""}
    </div>`;
  }

  const activo = Math.min(armador.opcionActiva, r.horarios.length - 1);
  const h = r.horarios[activo];
  const fijados = armador.opciones.fijados;
  const visibles = Math.min(armador.mostrados || r.horarios.length, r.horarios.length);
  const chips = r.horarios.slice(0, visibles).map((hr, i) => chip(hr, i, activo, r.permisivo, armador.opciones.preferirCalificados)).join("");
  const verMas = visibles < r.horarios.length
    ? `<button id="ar-vermas" type="button" class="btn-link">ver más (${r.horarios.length - visibles})</button>` : "";
  const hayFijados = Object.keys(fijados).length > 0;

  return `
    ${r.permisivo ? avisoCruce(h) : ""}
    <div class="ar-res-top">
      <span class="ar-total">${etiquetaTotal(r)}</span>
      ${sesion?.usuario ? `<button id="ar-guardar" type="button" class="btn-pdf" title="Guardar este horario en tu cuenta">★ Guardar</button>` : ""}
      <button id="ar-compartir" type="button" class="btn-pdf" title="Copia un link con este horario para pasarlo a tus compañeros">🔗 Compartir</button>
      <button id="ar-imprimir" type="button" class="btn-pdf" title="Abre el diálogo del navegador: elegí “Guardar como PDF”">⤓ Imprimir / PDF</button>
    </div>
    ${formGuardar(armador)}
    <div class="ar-opciones">${chips}${verMas}</div>
    <div class="ar-leyenda-top">
      ${hayFijados
        ? `<button id="ar-soltar" type="button" class="btn-link">soltar grupos fijados</button>`
        : `<span class="ar-tip">tip: clic en una clase de la grilla para fijar/soltar su grupo</span>`}
    </div>
    <div class="ar-imprimible">
      <div class="solo-print print-head">
        <strong>Horario — Gestión 1/2026 · Ing. Informática UMSS</strong>
        <span>Opción ${activo + 1}${r.permisivo ? ` · ${h.conflictCount} cruce(s)` : ""} · los horarios pueden cambiar.</span>
      </div>
      ${leyenda(h, fijados)}
      ${renderHorarioGrid(h, armador.indice, fijados)}
    </div>`;
}

// ---------- Vista ----------
export function renderArmador(dataset, armador, sesion, ui) {
  const ofertadas = dataset.materias.filter((m) => m.grupos.length > 0);
  return `
  <header class="seccion-h">
    <h1>Armar horario</h1>
    <p class="sub"><strong>Draftea tu semestre, sin choques.</strong> Elegí materias y se generan todas las combinaciones, de mejor a peor. Sin cuenta.</p>
  </header>
  <div class="armador">
    <section class="ar-col ar-izq">
      <h2 class="ar-h">Materias <span class="ar-n">${armador.elegidas.size}</span>
        ${armador.elegidas.size ? `<button id="ar-limpiar" class="btn-link">limpiar</button>` : ""}</h2>
      ${selector(ofertadas, armador, ui)}
      <h2 class="ar-h">Elegidas</h2>
      ${armador.elegidas.size > MATERIAS_POR_SEMESTRE
        ? `<p class="ar-tope-aviso">⚠ Estás tomando ${armador.elegidas.size} materias; lo normal es hasta ${MATERIAS_POR_SEMESTRE} por semestre.</p>`
        : ""}
      ${elegidas(dataset.materias, armador)}
    </section>
    <section class="ar-col ar-der">
      ${filtros(armador.opciones)}
      ${resultados(armador, sesion)}
      ${sesion?.usuario ? renderGuardados(armador) : ""}
    </section>
  </div>`;
}
