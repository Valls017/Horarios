// filtros-ui.js — conecta los controles de filtro del catálogo con el estado.
// Usa delegación de eventos en la raíz para sobrevivir a los re-render.

import { setFiltros, limpiarFiltros } from "../state/estado.js";

let conectado = false;

/** Conecta una sola vez los listeners delegados sobre el contenedor raíz. */
export function conectarFiltros(raiz) {
  if (conectado) return;
  conectado = true;

  // Búsqueda en vivo (input) sin re-crear el campo: se actualiza el estado y
  // el render preserva el valor; el foco se restaura en main.js.
  raiz.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "f-texto") setFiltros({ texto: t.value });
  });

  raiz.addEventListener("change", (e) => {
    const t = e.target;
    if (t.id === "f-nivel") setFiltros({ nivel: t.value });
    else if (t.id === "f-tipo") setFiltros({ tipo: t.value });
    else if (t.id === "f-turno") setFiltros({ turno: t.value });
    else if (t.id === "f-ofertadas") setFiltros({ soloOfertadas: t.checked });
  });

  raiz.addEventListener("click", (e) => {
    if (e.target.id === "f-limpiar") {
      e.preventDefault();
      limpiarFiltros();
    }
  });
}
