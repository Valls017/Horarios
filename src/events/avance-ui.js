// avance-ui.js — conecta la vista "Mi avance" con el estado (delegado).

import {
  toggleAprobada, limpiarAprobadas, setBusquedaAvance, precargarArmador,
} from "../state/estado.js";

let conectado = false;

export function conectarAvance(raiz) {
  if (conectado) return;
  conectado = true;

  raiz.addEventListener("input", (e) => {
    if (e.target.id === "av-busqueda") setBusquedaAvance(e.target.value);
  });

  raiz.addEventListener("change", (e) => {
    if (e.target.classList.contains("av-check")) toggleAprobada(e.target.dataset.codigo);
  });

  raiz.addEventListener("click", (e) => {
    if (e.target.id === "av-limpiar") { limpiarAprobadas(); return; }
    const armar = e.target.closest("#av-armar");
    if (armar) {
      const codigos = (armar.dataset.codigos || "").split(",").filter(Boolean);
      precargarArmador(codigos);
      location.hash = "#/"; // ir al armador (portada)
    }
  });
}
