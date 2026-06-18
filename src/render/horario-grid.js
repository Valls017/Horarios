// horario-grid.js — dibuja un horario como grilla semanal (días × bandas).
// Soporta CRUCE: si dos clases caen en el mismo slot, la celda se marca como
// choque (hg-choque) y muestra AMBAS materias/grupos apiladas.

import { aMinutos, aHHMM, NOMBRE_DIA } from "../data/tiempo.js";
import { esc } from "./comunes.js";

const N_COLORES = 12; // clases .mat-c0..c11 en el CSS

/** Mapa "dia|inicio" -> [entrada, ...]. Más de una entrada = cruce. */
export function celdasDe(horario) {
  const celdas = new Map();
  horario.unidades.forEach((u, idx) => {
    const color = idx % N_COLORES;
    for (const g of u.grupos) {
      for (const b of g.bloques) {
        const key = `${b.dia}|${b.inicio}`;
        const entrada = {
          codigo: u.materiaCodigo, nombre: u.materiaNombre,
          grupo: g.id, aula: b.aula, tp: b.tipo === "TP", color,
          fijada: false, // lo setea el render según opciones.fijados
        };
        if (celdas.has(key)) celdas.get(key).push(entrada);
        else celdas.set(key, [entrada]);
      }
    }
  });
  return celdas;
}

function celdaContenido(entrada) {
  return `<span class="hg-item mat-c${entrada.color}" data-codigo="${esc(entrada.codigo)}" data-grupo="${esc(entrada.grupo)}"
      title="${esc(entrada.nombre)} · grupo ${esc(entrada.grupo)} · ${esc(entrada.aula)} (clic: fijar/soltar grupo)">
      <span class="hg-mat">${entrada.fijada ? "🔒 " : ""}${esc(entrada.nombre)}</span>
      <span class="hg-meta">g${esc(entrada.grupo)} · ${esc(entrada.aula)}${entrada.tp ? " · TP" : ""}</span>
    </span>`;
}

/**
 * HTML de la grilla. `indice` aporta días/bandas; `fijados` marca con candado.
 */
export function renderHorarioGrid(horario, indice, fijados = {}) {
  const celdas = celdasDe(horario);
  for (const entradas of celdas.values())
    for (const e of entradas) e.fijada = fijados[e.codigo] === e.grupo;

  const diasUsados = indice.dias.filter((d) =>
    indice.bandas.some((ini) => celdas.has(`${d}|${ini}`))
  );

  const thead = `<tr><th class="hg-hora"></th>${
    diasUsados.map((d) => `<th>${esc(NOMBRE_DIA[d] ?? d)}</th>`).join("")
  }</tr>`;

  const filas = indice.bandas
    .map((ini) => {
      if (!diasUsados.some((d) => celdas.has(`${d}|${ini}`))) return "";
      const fin = aHHMM(aMinutos(ini) + 90);
      const tds = diasUsados
        .map((d) => {
          const entradas = celdas.get(`${d}|${ini}`);
          if (!entradas) return `<td class="hg-vacia"></td>`;
          const choque = entradas.length > 1;
          const cls = "hg-clase" + (choque ? " hg-choque" : "") + (entradas.some((e) => e.fijada) ? " hg-fijada" : "");
          return `<td class="${cls}">${entradas.map(celdaContenido).join("")}</td>`;
        })
        .join("");
      return `<tr><th class="hg-hora">${esc(ini)}<span>${esc(fin)}</span></th>${tds}</tr>`;
    })
    .join("");

  return `<table class="hgrid"><thead>${thead}</thead><tbody>${filas}</tbody></table>`;
}
