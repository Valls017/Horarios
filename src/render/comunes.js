// comunes.js — helpers de presentación compartidos por las vistas.

import { NOMBRE_DIA, DIAS, turnoDeBloque } from "../data/tiempo.js";

/** Escapa texto para insertarlo seguro en HTML. */
export function esc(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Los estudiantes piensan en semestres; la letra del pensum va entre paréntesis.
export const NOMBRE_NIVEL = {
  A: "Semestre 1 (A)", B: "Semestre 2 (B)", C: "Semestre 3 (C)",
  D: "Semestre 4 (D)", E: "Semestre 5 (E)", F: "Semestre 6 (F)",
  G: "Semestre 7 (G)", H: "Semestre 8 (H)", I: "Semestre 9 (I)",
};

/** ¿Está abierta la sección plegable `clave`? (con su default si el usuario no la tocó). */
export function estaAbierto(ui, clave, porDefecto = false) {
  return ui?.abiertos?.[clave] ?? porDefecto;
}

/** Sección plegable `<details>` controlada por el estado (clave en `ui.abiertos`).
 * Si `fijarAbierto` es true (p. ej. hay búsqueda activa), se fuerza abierta. */
export function plegable({ clave, ui, porDefecto = false, fijarAbierto = false, clase = "", resumen, contenido }) {
  const abierto = fijarAbierto || estaAbierto(ui, clave, porDefecto);
  return `<details class="${clase}"${abierto ? " open" : ""}>
    <summary${fijarAbierto ? "" : ` data-plegable="${esc(clave)}"`}>${resumen}<span class="chev" aria-hidden="true"></span></summary>
    ${contenido}
  </details>`;
}

export const NOMBRE_TURNO = { manana: "Mañana", tarde: "Tarde", noche: "Noche" };

/** Anillo de progreso (SVG puro): % hacia el egreso, con el número al centro. */
export function anilloProgreso(pct) {
  const p = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
  const R = 40;
  const C = 2 * Math.PI * R;
  const off = C * (1 - p / 100);
  return `<span class="anillo" role="img" aria-label="${p}% hacia el egreso">
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="${R}" fill="none" stroke="var(--panel-2)" stroke-width="11"/>
      <circle cx="50" cy="50" r="${R}" fill="none" stroke="var(--acento)" stroke-width="11"
        stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>
    </svg>
    <span class="anillo-num">${p}%</span>
  </span>`;
}

/** Nombre visible de un docente (o "Por designar"). */
export function nombreDocente(docente) {
  return docente ?? "Por designar";
}

/** Ordena los bloques por día (LU..SA) y hora. */
export function ordenarBloques(bloques) {
  return [...bloques].sort(
    (a, b) => DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia) || a.inicio.localeCompare(b.inicio)
  );
}

/** "LU 09:45–11:15 · 692F" para un bloque. */
export function bloqueATexto(b) {
  return `${b.dia} ${b.inicio}–${b.fin} · ${esc(b.aula)}`;
}

export { NOMBRE_DIA, turnoDeBloque };
