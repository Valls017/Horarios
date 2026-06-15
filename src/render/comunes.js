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

export const NOMBRE_NIVEL = {
  A: "Nivel A", B: "Nivel B", C: "Nivel C", D: "Nivel D", E: "Nivel E",
  F: "Nivel F", G: "Nivel G", H: "Nivel H", I: "Nivel I",
};

export const NOMBRE_TURNO = { manana: "Mañana", tarde: "Tarde", noche: "Noche" };

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
