// armador-ui.js — conecta los controles del armador con el estado (delegado).

import {
  toggleElegida, setOpcionArmador, toggleFijado, limpiarFijados,
  setOpcionActiva, setBusquedaArmador, limpiarArmador, verMasOpciones,
} from "../state/estado.js";

let conectado = false;

export function conectarArmador(raiz) {
  if (conectado) return;
  conectado = true;

  raiz.addEventListener("input", (e) => {
    if (e.target.id === "ar-busqueda") setBusquedaArmador(e.target.value);
  });

  raiz.addEventListener("change", (e) => {
    const t = e.target;
    if (t.classList.contains("ar-check")) toggleElegida(t.dataset.codigo);
    else if (t.id === "ar-evitar0645") setOpcionArmador({ evitarPrimeraBanda: t.checked });
    else if (t.id === "ar-pordesignar") setOpcionArmador({ excluirPorDesignar: t.checked });
  });

  raiz.addEventListener("click", (e) => {
    const quitar = e.target.closest(".ar-quitar");
    if (quitar) { toggleElegida(quitar.dataset.quitar); return; }

    const opcion = e.target.closest(".ar-opcion");
    if (opcion) { setOpcionActiva(Number(opcion.dataset.opcion)); return; }

    // Fijar/soltar grupo desde una clase de la grilla.
    const clase = e.target.closest("[data-codigo][data-grupo]");
    if (clase) { toggleFijado(clase.dataset.codigo, clase.dataset.grupo); return; }

    if (e.target.id === "ar-vermas") { verMasOpciones(); return; }
    if (e.target.id === "ar-soltar") { limpiarFijados(); return; }
    if (e.target.id === "ar-limpiar") { limpiarArmador(); return; }
    if (e.target.closest("#ar-imprimir")) window.print();
  });
}
