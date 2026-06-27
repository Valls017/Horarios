// armador-ui.js — conecta los controles del armador con el estado (delegado).

import {
  toggleElegida, setOpcionArmador, toggleFijado, limpiarFijados,
  setOpcionActiva, setBusquedaArmador, limpiarArmador, verMasOpciones,
  setPreferirCalificados, guardarHorarioActual, cargarHorarioGuardado, eliminarHorario,
  getEstado,
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
    else if (t.id === "ar-calificados") setPreferirCalificados(t.checked);
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
    if (e.target.closest("#ar-imprimir")) { window.print(); return; }

    if (e.target.id === "ar-guardar") {
      const nombre = window.prompt("Nombre del horario:", "Mi horario");
      if (nombre !== null) {
        guardarHorarioActual(nombre).catch(() => window.alert("No se pudo guardar el horario. Reintentá."));
      }
      return;
    }
    const cargar = e.target.closest(".ar-cargar");
    if (cargar) {
      const g = getEstado().armador.guardados.find((x) => x.id === cargar.dataset.id);
      if (g) cargarHorarioGuardado(g.datos);
      return;
    }
    const borrar = e.target.closest(".ar-borrar-h");
    if (borrar && window.confirm("¿Borrar este horario guardado?")) eliminarHorario(borrar.dataset.id);
  });

  // Fijar/soltar grupo con teclado (Enter o Espacio) sobre una clase de la grilla.
  raiz.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const clase = e.target.closest(".hg-item[data-codigo][data-grupo]");
    if (clase) { e.preventDefault(); toggleFijado(clase.dataset.codigo, clase.dataset.grupo); }
  });
}
