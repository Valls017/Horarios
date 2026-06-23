// main.js — arranque de la app: carga datos, conecta router/filtros y renderiza.

import { cargarDataset } from "./data/dataset.js";
import { getEstado, setDataset, suscribir, setSesionUsuario, cargarDatosUsuario, limpiarDatosUsuario } from "./state/estado.js";
import { iniciarRouter } from "./events/router.js";
import { conectarFiltros } from "./events/filtros-ui.js";
import { conectarArmador } from "./events/armador-ui.js";
import { conectarAvance } from "./events/avance-ui.js";
import { conectarAuth } from "./events/auth-ui.js";
import { conectarResenas, cargarResumen } from "./events/resenas-ui.js";
import { sesionActual, alCambiarSesion } from "./data/auth.js";
import { renderCatalogo } from "./render/catalogo.js";
import { renderMateria } from "./render/materia.js";
import { renderDocentes } from "./render/docentes.js";
import { renderArmador } from "./render/armador.js";
import { renderAvance } from "./render/avance.js";
import { renderAuth } from "./render/auth.js";

// Campos en vivo cuyo foco/cursor se preserva al re-renderizar.
const CAMPOS_VIVOS = new Set(["f-texto", "ar-busqueda", "av-busqueda", "rsn-comentario"]);

const vista = document.getElementById("vista");
const nav = document.getElementById("nav");
const authSlot = document.getElementById("auth");

/** Marca activo el enlace de navegación según la vista. */
function marcarNav(rutaVista) {
  for (const a of nav.querySelectorAll("a")) {
    a.classList.toggle("activo", a.dataset.vista === rutaVista);
  }
}

/** Re-renderiza preservando foco/cursor del campo de búsqueda en vivo. */
function render(estado) {
  if (authSlot) authSlot.innerHTML = renderAuth(estado.sesion); // no depende del dataset
  if (!estado.dataset) return;
  const activo = document.activeElement;
  const idVivo = activo && CAMPOS_VIVOS.has(activo.id) ? activo.id : null;
  const caret = idVivo ? activo.selectionStart : null;
  // Preserva el scroll del checklist del armador (re-render al elegir materias).
  const scrollChecklist = vista.querySelector(".ar-checklist")?.scrollTop ?? null;

  const { ruta, dataset, filtros, armador, avance, resenas, sesion } = estado;
  let html;
  if (ruta.vista === "materia") html = renderMateria(dataset, ruta.codigo, resenas, sesion);
  else if (ruta.vista === "docentes") html = renderDocentes(dataset);
  else if (ruta.vista === "catalogo") html = renderCatalogo(dataset, filtros);
  else if (ruta.vista === "avance") html = renderAvance(dataset, avance, sesion);
  else html = renderArmador(dataset, armador, sesion); // portada (#/)

  vista.innerHTML = html;
  marcarNav(ruta.vista);

  // Carga (idempotente) del resumen de reseñas al ver una materia.
  if (ruta.vista === "materia") cargarResumen(ruta.codigo);

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
    conectarAvance(vista);
    if (authSlot) conectarAuth(authSlot);
    conectarResenas(vista);
    // Aviso al salir solo si hay aprobadas SIN sesión (no se persistirían).
    window.addEventListener("beforeunload", (e) => {
      const s = getEstado();
      if (!s.sesion.usuario && s.avance.aprobadas.size > 0) { e.preventDefault(); e.returnValue = ""; }
    });
    suscribir(render);
    setDataset(dataset);     // primer render
    iniciarRouter();         // aplica la ruta del hash

    // Sesión: intento perezoso; si el CDN/Supabase falla, la app sigue andando.
    (async () => {
      try {
        const u = await sesionActual();
        if (u) { setSesionUsuario({ id: u.id, email: u.email }); cargarDatosUsuario(); }
        await alCambiarSesion((usuario) => {
          if (usuario) { setSesionUsuario({ id: usuario.id, email: usuario.email }); cargarDatosUsuario(); }
          else { setSesionUsuario(null); limpiarDatosUsuario(); }
        });
      } catch (e) {
        console.warn("Auth no disponible:", e?.message);
      }
    })();
  } catch (e) {
    vista.innerHTML = `<p class="error">No se pudo iniciar la app: ${e.message}.
      ¿Estás sirviendo el sitio con un servidor estático? (npm run dev)</p>`;
    console.error(e);
  }
}

iniciar();
