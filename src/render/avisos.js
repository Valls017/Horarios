// avisos.js (render) — campana de avisos del producto en la barra superior.

import { AVISOS, ULTIMO_AVISO } from "../data/avisos.js";
import { esc } from "./comunes.js";

const CAMPANA = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
  stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;

function fechaCorta(iso) {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "short" });
  } catch { return iso; }
}

function panel() {
  const items = AVISOS.map((a) => `
    <li class="aviso-item">
      <div class="aviso-item-h"><strong>${esc(a.titulo)}</strong><span class="aviso-fecha">${esc(fechaCorta(a.fecha))}</span></div>
      <p>${esc(a.texto)}</p>
    </li>`).join("");
  return `
    <div class="avisos-panel" role="dialog" aria-label="Avisos">
      <div class="avisos-panel-h">Avisos</div>
      <ul class="avisos-lista">${items}</ul>
    </div>`;
}

/** Campana + panel de avisos. `avisos` = slice del estado { abierto, ultimoVisto }. */
export function renderAvisos(avisos) {
  const sinLeer = ULTIMO_AVISO > (avisos.ultimoVisto ?? 0);
  return `
    <div class="avisos${avisos.abierto ? " abierto" : ""}">
      <button id="avisos-btn" class="btn-icono" aria-label="Avisos"
        aria-expanded="${avisos.abierto}" title="Avisos">
        ${CAMPANA}${sinLeer ? `<span class="avisos-dot" aria-hidden="true"></span>` : ""}
      </button>
      ${avisos.abierto ? panel() : ""}
    </div>`;
}
