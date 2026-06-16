// armador.js — vista del autogenerador de horarios.

import { agruparPorNivel } from "../data/filtros.js";
import { nombreDocente } from "./comunes.js";
import { esc, NOMBRE_NIVEL } from "./comunes.js";
import { renderHorarioGrid } from "./horario-grid.js";

const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// ---------- Selector de materias ----------
function selector(materias, armador) {
  const q = norm(armador.busqueda);
  const filtradas = materias.filter(
    (m) => !q || norm(m.codigo).includes(q) || norm(m.nombre).includes(q)
  );
  const grupos = agruparPorNivel(filtradas);
  const lista = grupos.length
    ? grupos.map(([nivel, ms]) => `
        <div class="ar-nivel"><span class="ar-nivel-t">${esc(NOMBRE_NIVEL[nivel])}</span>
          ${ms.map((m) => {
            const on = armador.elegidas.has(m.codigo);
            return `<label class="ar-item${on ? " on" : ""}">
              <input type="checkbox" class="ar-check" data-codigo="${esc(m.codigo)}"${on ? " checked" : ""}>
              <code>${esc(m.codigo)}</code> ${esc(m.nombre)}</label>`;
          }).join("")}
        </div>`).join("")
    : `<p class="rel-vacio">Sin materias que coincidan.</p>`;

  return `
    <div class="ar-selector">
      <input type="search" id="ar-busqueda" placeholder="Buscar materia ofertada…" value="${esc(armador.busqueda)}" aria-label="Buscar materia">
      <div class="ar-checklist">${lista}</div>
    </div>`;
}

// ---------- Materias elegidas + fijar grupo ----------
function fijarSelect(m, fijados) {
  const sel = fijados[m.codigo] ?? "";
  const opts = [`<option value="">cualquier grupo</option>`]
    .concat(m.grupos.map((g) =>
      `<option value="${esc(g.id)}"${g.id === sel ? " selected" : ""}>g${esc(g.id)} — ${esc(nombreDocente(g.docente))}</option>`))
    .join("");
  return `<select class="ar-fijar" data-codigo="${esc(m.codigo)}" aria-label="Fijar grupo de ${esc(m.nombre)}">${opts}</select>`;
}

function elegidas(materias, armador) {
  const ms = materias.filter((m) => armador.elegidas.has(m.codigo));
  if (!ms.length) return `<p class="rel-vacio">Todavía no elegiste materias.</p>`;
  return `<ul class="ar-elegidas">${ms.map((m) => `
    <li>
      <button class="ar-quitar" data-quitar="${esc(m.codigo)}" title="Quitar" aria-label="Quitar ${esc(m.nombre)}">×</button>
      <span class="ar-eleg-nom"><code>${esc(m.codigo)}</code> ${esc(m.nombre)}</span>
      ${fijarSelect(m, armador.opciones.fijados)}
    </li>`).join("")}</ul>`;
}

// ---------- Filtros ----------
function filtros(opciones) {
  const turno = (t, etq) =>
    `<label class="ar-chk"><input type="checkbox" class="ar-turno" data-turno="${t}"${opciones.turnos.has(t) ? " checked" : ""}> ${etq}</label>`;
  const pref = (v, etq) => `<option value="${v}"${opciones.turnoPreferido === (v || null) ? " selected" : ""}>${etq}</option>`;
  return `
    <div class="ar-filtros">
      <fieldset><legend>Turnos permitidos</legend>${turno("manana", "Mañana")}${turno("tarde", "Tarde")}${turno("noche", "Noche")}</fieldset>
      <label class="ar-chk"><input type="checkbox" id="ar-evitar0645"${opciones.evitarPrimeraBanda ? " checked" : ""}> Evitar 06:45</label>
      <label class="ar-chk"><input type="checkbox" id="ar-pordesignar"${opciones.excluirPorDesignar ? " checked" : ""}> Excluir “por designar”</label>
      <label class="ar-chk" title="Sesga el ranking, no descarta">Preferir turno:
        <select id="ar-turnopref">${pref("", "—")}${pref("manana", "Mañana")}${pref("tarde", "Tarde")}${pref("noche", "Noche")}</select></label>
      <label class="ar-chk deshabilitado" title="Disponible en el Sprint 3 (requiere reseñas)">
        <input type="checkbox" disabled> Mejor calificados <span class="proximamente">próximamente</span></label>
    </div>`;
}

// ---------- Resultados ----------
function leyenda(horario) {
  return `<ul class="hg-leyenda">${horario.unidades.map((u, i) => {
    const docs = [...u.docentes];
    return `<li class="mat-c${i % 12}"><span class="hg-pill"></span>
      <strong>${esc(u.materiaNombre)}</strong> · grupo ${esc(u.gruposIds.join("+"))}
      ${docs.length ? `· ${esc(docs.join(", "))}` : `· <em>por designar</em>`}</li>`;
  }).join("")}</ul>`;
}

function resultados(armador) {
  if (armador.elegidas.size === 0)
    return `<p class="rel-vacio">Elegí una o más materias para generar horarios sin choques.</p>`;

  const r = armador.resultado;
  if (r && r.diagnostico) {
    return `<div class="ar-diag">
      <h3>No hay horario posible</h3>
      <p class="ar-diag-msg">${esc(r.diagnostico.mensaje)}</p>
      <p class="ar-diag-sug">💡 ${esc(r.diagnostico.sugerencia)}</p>
    </div>`;
  }
  if (!r || r.horarios.length === 0) return `<p class="rel-vacio">Sin resultados.</p>`;

  const activo = Math.min(armador.opcionActiva, r.horarios.length - 1);
  const h = r.horarios[activo];
  const chips = r.horarios.map((hr, i) =>
    `<button class="ar-opcion${i === activo ? " on" : ""}" data-opcion="${i}">
       Opción ${i + 1}<span>${hr.metricas.huecos} hueco${hr.metricas.huecos === 1 ? "" : "s"}</span></button>`).join("");

  return `
    <div class="ar-res-top">
      <span class="ar-total">${r.total} horario${r.total === 1 ? "" : "s"} sin choques${r.truncado ? "+" : ""} · mostrando top ${r.horarios.length}</span>
    </div>
    <div class="ar-opciones">${chips}</div>
    ${leyenda(h)}
    ${renderHorarioGrid(h, armador.indice)}`;
}

// ---------- Vista ----------
export function renderArmador(dataset, armador) {
  const ofertadas = dataset.materias.filter((m) => m.grupos.length > 0);

  return `
  <header class="seccion-h">
    <h1>Armar horario</h1>
    <p class="sub">Elegí materias y el motor genera todas las combinaciones sin choques. Sin cuenta.</p>
  </header>
  <div class="armador">
    <section class="ar-col ar-izq">
      <h2 class="ar-h">1 · Materias <span class="ar-n">${armador.elegidas.size}</span>
        ${armador.elegidas.size ? `<button id="ar-limpiar" class="btn-link">limpiar</button>` : ""}</h2>
      ${selector(ofertadas, armador)}
      <h2 class="ar-h">Elegidas</h2>
      ${elegidas(dataset.materias, armador)}
      <h2 class="ar-h">2 · Filtros</h2>
      ${filtros(armador.opciones)}
    </section>
    <section class="ar-col ar-der">
      <h2 class="ar-h">3 · Horarios</h2>
      ${resultados(armador)}
    </section>
  </div>`;
}
