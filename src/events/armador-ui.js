// armador-ui.js — conecta los controles del armador con el estado (delegado).

import {
  toggleElegida, setOpcionArmador, toggleFijado, limpiarFijados, setFijado,
  setOpcionActiva, setBusquedaArmador, limpiarArmador, verMasOpciones,
  setPreferirCalificados, guardarHorarioActual, cargarHorarioGuardado, eliminarHorario,
  setGuardarAbierto, setConfirmarBorrar, mostrarToast, datosHorarioActivo,
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
    else if (t.classList.contains("ar-fijar")) setFijado(t.dataset.codigo, t.value || null);
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

    if (e.target.id === "ar-guardar") { setGuardarAbierto(true); return; }
    if (e.target.id === "ar-guardar-cancelar") { setGuardarAbierto(false); return; }

    // Compartir: copia un link que reconstruye este horario exacto.
    if (e.target.id === "ar-compartir") {
      const d = datosHorarioActivo();
      if (!d) return;
      const f = Object.entries(d.fijados).map(([c, g]) => `${c}:${g}`).join(",");
      const url = `${location.origin}${location.pathname}#/?m=${d.materias.join(",")}&f=${encodeURIComponent(f)}`;
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(url)
          .then(() => mostrarToast("Link copiado — pasáselo a tus compas 🔗"))
          .catch(() => mostrarToast("No se pudo copiar el link.", "error"));
      } else {
        mostrarToast("Tu navegador no permite copiar; usá la barra de dirección.", "error");
      }
      return;
    }

    // "Agregar al armador" desde el detalle de una materia.
    if (e.target.id === "mat-armar") {
      const codigo = e.target.dataset.codigo;
      const estaba = getEstado().armador.elegidas.has(codigo);
      toggleElegida(codigo);
      mostrarToast(estaba ? "Quitada de tu armador" : "Agregada — la ves en la pestaña Horario ✓");
      return;
    }

    const cargar = e.target.closest(".ar-cargar");
    if (cargar) {
      const g = getEstado().armador.guardados.find((x) => x.id === cargar.dataset.id);
      if (g) {
        cargarHorarioGuardado(g.datos);
        location.hash = "#/"; // desde Perfil también: lleva al armador a verlo
        mostrarToast(`«${g.nombre}» cargado en el armador`);
      }
      return;
    }

    // Borrar guardado: dos toques (borrar → "sí, borrar"), sin window.confirm.
    if (e.target.classList.contains("ar-borrar-no")) { setConfirmarBorrar(null); return; }
    const borrar = e.target.closest(".ar-borrar-h");
    if (borrar) {
      const id = borrar.dataset.id;
      if (getEstado().armador.confirmarBorrar === id) {
        setConfirmarBorrar(null);
        eliminarHorario(id).then(() => mostrarToast("Horario borrado"));
      } else {
        setConfirmarBorrar(id);
      }
    }
  });

  // Guardar horario: formulario inline (reemplaza a window.prompt/alert).
  raiz.addEventListener("submit", (e) => {
    if (e.target.id !== "ar-guardar-form") return;
    e.preventDefault();
    const nombre = raiz.querySelector("#ar-nombre")?.value ?? "";
    guardarHorarioActual(nombre)
      .then(() => { setGuardarAbierto(false); mostrarToast("Horario guardado ★"); })
      .catch(() => mostrarToast("No se pudo guardar el horario. Reintentá.", "error"));
  });

  // Fijar/soltar grupo con teclado (Enter o Espacio) sobre una clase de la grilla.
  raiz.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const clase = e.target.closest(".hg-item[data-codigo][data-grupo]");
    if (clase) { e.preventDefault(); toggleFijado(clase.dataset.codigo, clase.dataset.grupo); }
  });
}
