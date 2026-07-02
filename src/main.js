// main.js — arranque de la app: carga datos, conecta router/filtros y renderiza.

import { cargarDataset } from "./data/dataset.js";
import { getEstado, setDataset, suscribir, setSesionUsuario, cargarDatosUsuario, limpiarDatosUsuario } from "./state/estado.js";
import { iniciarRouter } from "./events/router.js";
import { conectarFiltros } from "./events/filtros-ui.js";
import { conectarArmador } from "./events/armador-ui.js";
import { conectarAvance } from "./events/avance-ui.js";
import { conectarAuth } from "./events/auth-ui.js";
import { conectarAvisos } from "./events/avisos-ui.js";
import { conectarPlegables } from "./events/plegables-ui.js";
import { conectarResenas, cargarResumen } from "./events/resenas-ui.js";
import { sesionActual, alCambiarSesion } from "./data/auth.js";
import { esc } from "./render/comunes.js";
import { renderCatalogo } from "./render/catalogo.js";
import { renderMateria } from "./render/materia.js";
import { renderDocentes } from "./render/docentes.js";
import { renderArmador } from "./render/armador.js";
import { renderAvance } from "./render/avance.js";
import { renderPerfil } from "./render/perfil.js";
import { renderAvisos } from "./render/avisos.js";

// Campos en vivo cuyo foco/cursor se preserva al re-renderizar.
const CAMPOS_VIVOS = new Set(["f-texto", "ar-busqueda", "av-busqueda", "d-busqueda", "rsn-comentario"]);

const vista = document.getElementById("vista");
const navs = [document.getElementById("nav"), document.getElementById("tabbar")].filter(Boolean);
const avisosSlot = document.getElementById("avisos");
const usuarioSlot = document.getElementById("usuario");
const toastSlot = document.getElementById("toast");

const ICONO_USUARIO = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
  stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

/** Avatar de la barra superior: inicial del email (logueado) o silueta (invitado). */
function renderAvatarTop(sesion) {
  if (!usuarioSlot) return;
  if (sesion.usuario) {
    usuarioSlot.classList.add("log");
    usuarioSlot.title = sesion.usuario.email;
    usuarioSlot.innerHTML = esc(sesion.usuario.email[0].toUpperCase());
  } else {
    usuarioSlot.classList.remove("log");
    usuarioSlot.title = "Perfil";
    usuarioSlot.innerHTML = ICONO_USUARIO;
  }
}

// Título de la pestaña del navegador por vista (historial y multitarea legibles).
const TITULOS = {
  armar: "Armar horario", catalogo: "Materias", docentes: "Docentes",
  avance: "Mi avance", perfil: "Perfil",
};

function ponerTitulo(ruta, dataset) {
  let t = TITULOS[ruta.vista] ?? TITULOS.armar;
  if (ruta.vista === "materia") {
    t = dataset.materias.find((m) => m.codigo === ruta.codigo)?.nombre ?? "Materia";
  }
  document.title = `${t} · Semester Draft`;
}

/** Marca activo el enlace de navegación (nav de escritorio, tabbar y avatar).
 * El detalle de materia cuenta como "Materias"; Mi avance vive dentro de "Perfil". */
function marcarNav(rutaVista) {
  const seccion =
    rutaVista === "materia" ? "catalogo" :
    rutaVista === "avance" ? "perfil" : rutaVista;
  for (const nav of navs) {
    for (const a of nav.querySelectorAll("a")) {
      const activo = a.dataset.vista === seccion;
      a.classList.toggle("activo", activo);
      if (activo) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
  }
  if (usuarioSlot) usuarioSlot.classList.toggle("activo", seccion === "perfil");
}

/** Re-renderiza preservando foco/cursor del campo de búsqueda en vivo. */
function render(estado) {
  if (avisosSlot) avisosSlot.innerHTML = renderAvisos(estado.avisos); // no depende del dataset
  renderAvatarTop(estado.sesion);
  if (toastSlot) toastSlot.innerHTML = estado.toast.msg
    ? `<div class="toast ${estado.toast.tipo === "error" ? "error" : "ok"}">${esc(estado.toast.msg)}</div>`
    : "";
  if (!estado.dataset) return;
  const activo = document.activeElement;
  const idVivo = activo && CAMPOS_VIVOS.has(activo.id) ? activo.id : null;
  const caret = idVivo ? activo.selectionStart : null;
  // Si el foco estaba en un plegable (teclado), se restaura tras re-renderizar.
  const plegableVivo = activo?.dataset?.plegable ?? null;
  // Preserva el scroll del checklist del armador (re-render al elegir materias).
  const scrollChecklist = vista.querySelector(".ar-checklist")?.scrollTop ?? null;

  const { ruta, dataset, filtros, armador, avance, resenas, sesion, ui } = estado;
  let html;
  if (ruta.vista === "materia") html = renderMateria(dataset, ruta.codigo, resenas, sesion, armador);
  else if (ruta.vista === "docentes") html = renderDocentes(dataset, estado.docentes.busqueda);
  else if (ruta.vista === "catalogo") html = renderCatalogo(dataset, filtros, ui);
  else if (ruta.vista === "avance") html = renderAvance(dataset, avance, sesion, armador.indice, ui);
  else if (ruta.vista === "perfil") html = renderPerfil(dataset, sesion, armador, avance, ui);
  else html = renderArmador(dataset, armador, sesion, ui); // portada (#/)

  vista.innerHTML = html;
  marcarNav(ruta.vista);
  ponerTitulo(ruta, dataset);

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
  if (plegableVivo) {
    vista.querySelector(`summary[data-plegable="${CSS.escape(plegableVivo)}"]`)?.focus();
  }
}

async function iniciar() {
  try {
    const dataset = await cargarDataset();
    conectarFiltros(vista);
    conectarArmador(vista);
    conectarAvance(vista);
    conectarAuth(vista);      // la tarjeta de cuenta vive en la vista Perfil
    conectarAvisos();         // campana (delegado en document: cierra al clickear afuera)
    conectarPlegables(vista); // semestres plegables (catálogo, checklists, roadmap)
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

// PWA: service worker (offline + instalable/APK). Si falla, la app sigue igual.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => { /* opcional */ });
}
