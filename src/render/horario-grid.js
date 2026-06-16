// horario-grid.js — dibuja un horario como grilla semanal (días × bandas).

import { aMinutos, aHHMM, NOMBRE_DIA } from "../data/tiempo.js";
import { esc } from "./comunes.js";

const N_COLORES = 12; // clases .mat-c0..c11 en el CSS

/** Mapa "dia|inicio" -> celda, a partir de las unidades del horario. */
function celdasDe(horario) {
  const celdas = new Map();
  horario.unidades.forEach((u, idx) => {
    const color = idx % N_COLORES;
    for (const g of u.grupos) {
      for (const b of g.bloques) {
        celdas.set(`${b.dia}|${b.inicio}`, {
          codigo: u.materiaCodigo,
          nombre: u.materiaNombre,
          grupo: g.id,
          aula: b.aula,
          tp: b.tipo === "TP",
          color,
        });
      }
    }
  });
  return celdas;
}

/** HTML de la grilla de un horario. `indice` aporta días y bandas. */
export function renderHorarioGrid(horario, indice) {
  const celdas = celdasDe(horario);
  // Solo días con al menos una clase, para no llenar de columnas vacías.
  const diasUsados = indice.dias.filter((d) =>
    indice.bandas.some((ini) => celdas.has(`${d}|${ini}`))
  );

  const thead = `<tr><th class="hg-hora"></th>${
    diasUsados.map((d) => `<th>${esc(NOMBRE_DIA[d] ?? d)}</th>`).join("")
  }</tr>`;

  const filas = indice.bandas
    .map((ini) => {
      // Omite bandas totalmente vacías en este horario.
      if (!diasUsados.some((d) => celdas.has(`${d}|${ini}`))) return "";
      const fin = aHHMM(aMinutos(ini) + 90);
      const tds = diasUsados
        .map((d) => {
          const c = celdas.get(`${d}|${ini}`);
          if (!c) return `<td class="hg-vacia"></td>`;
          return `<td class="hg-clase mat-c${c.color}" title="${esc(c.nombre)} · grupo ${esc(c.grupo)} · ${esc(c.aula)}">
            <span class="hg-mat">${esc(c.nombre)}</span>
            <span class="hg-meta">g${esc(c.grupo)} · ${esc(c.aula)}${c.tp ? " · TP" : ""}</span>
          </td>`;
        })
        .join("");
      return `<tr><th class="hg-hora">${esc(ini)}<span>${esc(fin)}</span></th>${tds}</tr>`;
    })
    .join("");

  return `<table class="hgrid"><thead>${thead}</thead><tbody>${filas}</tbody></table>`;
}
