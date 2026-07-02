// avisos-ui.js — abre/cierra el panel de la campana (clic afuera lo cierra).

import { getEstado, toggleAvisos, cerrarAvisos } from "../state/estado.js";

let conectado = false;

export function conectarAvisos() {
  if (conectado) return;
  conectado = true;

  document.addEventListener("click", (e) => {
    if (e.target.closest("#avisos-btn")) { toggleAvisos(); return; }
    // Clic fuera del panel: cerrar (si estaba abierto).
    if (getEstado().avisos.abierto && !e.target.closest(".avisos-panel")) cerrarAvisos();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && getEstado().avisos.abierto) cerrarAvisos();
  });
}
