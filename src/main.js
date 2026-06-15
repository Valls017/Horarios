// main.js — arranque de la app: carga datos, conecta router/filtros y renderiza.

import { cargarDataset } from "./data/dataset.js";
import { getEstado, setDataset, suscribir } from "./state/estado.js";
import { iniciarRouter } from "./events/router.js";
import { conectarFiltros } from "./events/filtros-ui.js";
import { renderCatalogo } from "./render/catalogo.js";
import { renderMateria } from "./render/materia.js";
import { renderDocentes } from "./render/docentes.js";

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
  const reFocoTexto = activo && activo.id === "f-texto";
  const caret = reFocoTexto ? activo.selectionStart : null;

  const { ruta, dataset, filtros } = estado;
  let html;
  if (ruta.vista === "materia") html = renderMateria(dataset, ruta.codigo);
  else if (ruta.vista === "docentes") html = renderDocentes(dataset);
  else html = renderCatalogo(dataset, filtros);

  vista.innerHTML = html;
  marcarNav(ruta.vista);

  if (reFocoTexto) {
    const campo = document.getElementById("f-texto");
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
