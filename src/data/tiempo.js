// tiempo.js — utilidades de horas y solapamiento de bloques.
// Sin dependencias del DOM: usable en Node (validación/tests) y en el navegador.

export const DIAS = ["LU", "MA", "MI", "JU", "VI", "SA"];
export const NOMBRE_DIA = {
  LU: "Lunes", MA: "Martes", MI: "Miércoles",
  JU: "Jueves", VI: "Viernes", SA: "Sábado",
};

/** "09:45" -> 585 (minutos desde medianoche). */
export function aMinutos(hhmm) {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) throw new Error(`Hora inválida: "${hhmm}"`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/** 585 -> "09:45". */
export function aHHMM(min) {
  const hh = String(Math.floor(min / 60)).padStart(2, "0");
  const mm = String(min % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** ¿Dos bloques se solapan? Mismo día y los intervalos [inicio,fin) se cruzan. */
export function bloquesSolapan(a, b) {
  if (a.dia !== b.dia) return false;
  const ai = aMinutos(a.inicio), af = aMinutos(a.fin);
  const bi = aMinutos(b.inicio), bf = aMinutos(b.fin);
  return ai < bf && bi < af;
}

/** ¿Algún bloque de A choca con alguno de B? */
export function listasSolapan(bloquesA, bloquesB) {
  for (const a of bloquesA) {
    for (const b of bloquesB) {
      if (bloquesSolapan(a, b)) return true;
    }
  }
  return false;
}

/** Turno de un bloque según su hora de inicio. */
export function turnoDeBloque(bloque) {
  const min = aMinutos(bloque.inicio);
  if (min < 12 * 60) return "manana";
  if (min < 18 * 60) return "tarde";
  return "noche";
}
