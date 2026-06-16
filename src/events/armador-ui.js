// armador-ui.js — conecta los controles del armador con el estado (delegado).

import {
  toggleElegida, toggleTurnoArmador, setOpcionArmador, setFijado,
  setOpcionActiva, setBusquedaArmador, limpiarArmador,
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
    else if (t.classList.contains("ar-turno")) toggleTurnoArmador(t.dataset.turno);
    else if (t.classList.contains("ar-fijar")) setFijado(t.dataset.codigo, t.value);
    else if (t.id === "ar-evitar0645") setOpcionArmador({ evitarPrimeraBanda: t.checked });
    else if (t.id === "ar-pordesignar") setOpcionArmador({ excluirPorDesignar: t.checked });
    else if (t.id === "ar-turnopref") setOpcionArmador({ turnoPreferido: t.value || null });
  });

  raiz.addEventListener("click", (e) => {
    const quitar = e.target.closest(".ar-quitar");
    if (quitar) { toggleElegida(quitar.dataset.quitar); return; }
    const opcion = e.target.closest(".ar-opcion");
    if (opcion) { setOpcionActiva(Number(opcion.dataset.opcion)); return; }
    if (e.target.id === "ar-limpiar") limpiarArmador();
  });
}
