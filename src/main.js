// main.js — arranque de la app: carga datos, conecta router/filtros y renderiza.

import { cargarDataset } from "./data/dataset.js";
import { getEstado, setDataset, suscribir } from "./state/estado.js";
import { iniciarRouter } from "./events/router.js";
import { conectarFiltros } from "./events/filtros-ui.js";
import { conectarArmador } from "./events/armador-ui.js";
import { renderCatalogo } from "./render/catalogo.js";
import { renderMateria } from "./render/materia.js";
import { renderDocentes } from "./render/docentes.js";
import { renderArmador } from "./render/armador.js";

// Campos de búsqueda en vivo cuyo foco/cursor se preserva al re-renderizar.
const CAMPOS_VIVOS = new Set(["f-texto", "ar-busqueda"]);

const vista = document.getElementById("vista");
const nav = document.getElementById("nav");

/** Marca activo el enlace de navegación según la vista. */
function marcarNav(rutaVista) {
  for (const a of nav.querySelectorAll("a")) {
    a.classList.toggle("activo", a.dataset.vista === rutaVista);
  }
}

/** Re-renderiza preservando foco/cursor del campo de búsqueda en vivo. */
function render(estado) {
  if (!estado.dataset) return;
  const activo = document.activeElement;
  const idVivo = activo && CAMPOS_VIVOS.has(activo.id) ? activo.id : null;
  const caret = idVivo ? activo.selectionStart : null;
  // Preserva el scroll del checklist del armador (re-render al elegir materias).
  const scrollChecklist = vista.querySelector(".ar-checklist")?.scrollTop ?? null;

  const { ruta, dataset, filtros, armador } = estado;
  let html;
  if (ruta.vista === "materia") html = renderMateria(dataset, ruta.codigo);
  else if (ruta.vista === "docentes") html = renderDocentes(dataset);
  else if (ruta.vista === "armar") html = renderArmador(dataset, armador);
  else html = renderCatalogo(dataset, filtros);

  vista.innerHTML = html;
  marcarNav(ruta.vista);

  if (scrollChecklist !== null) {
    const cl = vista.querySelector(".ar-checklist");
    if (cl) cl.scrollTop = scrollChecklist;
  }
  if (idVivo) {
    const campo = document.getElementById(idVivo);
    if (campo) {
      campo.focus();
      const pos = caret ?? campo.value.length;
      campo.setSelectionRange(pos, pos);
    }
  }
}

async function iniciar() {
  try {
    const dataset = await cargarDataset();
    conectarFiltros(vista);
    conectarArmador(vista);
    suscribir(render);
    setDataset(dataset);     // primer render
    iniciarRouter();         // aplica la ruta del hash
  } catch (e) {
    vista.innerHTML = `<p class="error">No se pudo iniciar la app: ${e.message}.
      ¿Estás sirviendo el sitio con un servidor estático? (npm run dev)</p>`;
    console.error(e);
  }
}

iniciar();
