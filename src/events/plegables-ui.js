// plegables-ui.js — abre/cierra secciones <details> controladas por el estado.
// El clic en el summary NO usa el toggle nativo: pasa por el estado, así el
// abierto/cerrado sobrevive a los re-renders (que reconstruyen el HTML).

import { setPlegable } from "../state/estado.js";

let conectado = false;

export function conectarPlegables(raiz) {
  if (conectado) return;
  conectado = true;

  raiz.addEventListener("click", (e) => {
    const sum = e.target.closest("summary[data-plegable]");
    if (!sum) return;
    e.preventDefault(); // el estado decide, no el toggle nativo
    const det = sum.closest("details");
    setPlegable(sum.dataset.plegable, !det.open);
  });
}
