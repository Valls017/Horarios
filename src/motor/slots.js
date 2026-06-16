// slots.js — modelo de tiempo discreto para el motor de horarios.
//
// Las bandas horarias NO están hardcodeadas: se derivan EN CARGA de los inicios
// distintos presentes en los datos (decisión data-driven). 6 días × N bandas =
// total de slots. Cada (día, banda) es un bit; un horario/unidad es un bitmask
// (BigInt). Choque = AND de bitmasks ≠ 0n.

import { DIAS, aMinutos } from "../data/tiempo.js";

/**
 * Construye el índice de slots a partir de las materias.
 * @param {object[]} materias
 * @returns {{ dias:string[], bandas:string[], nBandas:number, total:number,
 *            bitDe(dia,inicio):number }}
 */
export function construirIndiceSlots(materias) {
  const inicios = new Set();
  for (const m of materias)
    for (const g of m.grupos)
      for (const b of g.bloques) inicios.add(b.inicio);

  const bandas = [...inicios].sort((a, b) => aMinutos(a) - aMinutos(b));
  const bandaIdx = new Map(bandas.map((ini, i) => [ini, i]));
  const dias = DIAS; // eje canónico de 6 días (LU..SA)
  const nBandas = bandas.length;

  function bitDe(dia, inicio) {
    const di = dias.indexOf(dia);
    const bi = bandaIdx.get(inicio);
    if (di < 0 || bi === undefined) throw new Error(`slot fuera de índice: ${dia} ${inicio}`);
    return di * nBandas + bi;
  }

  return { dias, bandas, nBandas, total: dias.length * nBandas, bitDe };
}

/**
 * Bitmask de una lista de bloques. Marca TODA banda que el bloque cubre
 * (robusto ante bloques que abarquen más de una banda; con los datos 1/2026
 * cada bloque dura una banda).
 * @returns {{ mask: bigint, colision: boolean }} colision = dos bloques de la
 *          misma unidad caen en el mismo slot (unidad inasistible).
 */
export function maskDeBloques(bloques, indice) {
  let mask = 0n;
  let colision = false;
  for (const b of bloques) {
    const ini = aMinutos(b.inicio);
    const fin = aMinutos(b.fin);
    const di = indice.dias.indexOf(b.dia);
    if (di < 0) throw new Error(`día fuera de índice: ${b.dia}`);
    for (let bi = 0; bi < indice.nBandas; bi++) {
      const bm = aMinutos(indice.bandas[bi]);
      if (bm >= ini && bm < fin) {
        const bit = 1n << BigInt(di * indice.nBandas + bi);
        if (mask & bit) colision = true;
        mask |= bit;
      }
    }
  }
  return { mask, colision };
}

/** ¿Dos bitmasks comparten algún slot? */
export function chocan(maskA, maskB) {
  return (maskA & maskB) !== 0n;
}

/** Decodifica un bitmask a lista de { dia, inicio } ocupados (para la UI). */
export function slotsDeMask(mask, indice) {
  const out = [];
  for (let di = 0; di < indice.dias.length; di++) {
    for (let bi = 0; bi < indice.nBandas; bi++) {
      if (mask & (1n << BigInt(di * indice.nBandas + bi))) {
        out.push({ dia: indice.dias[di], inicio: indice.bandas[bi] });
      }
    }
  }
  return out;
}
