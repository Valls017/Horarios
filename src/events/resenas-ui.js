// resenas-ui.js — interacción de reseñas (ver/calificar) y carga async.

import { getEstado } from "../state/estado.js";
import {
  setResenasCargando, setResenasResumen, abrirResena, cerrarResena,
  setResenaBorrador, setResenasEnviando, setResenasError,
} from "../state/estado.js";
import { resumenMateria, resenasDe, miResena, guardarResena } from "../data/resenas.js";

const mapResumen = (arr) => {
  const o = {};
  for (const x of arr) o[x.docente_id] = { promedio: Number(x.promedio), cantidad: Number(x.cantidad) };
  return o;
};

/** Carga el resumen de reseñas de una materia (idempotente). Llamada desde el render. */
export async function cargarResumen(codigo) {
  const r = getEstado().resenas;
  if (r.codigo === codigo || r.cargando) return;
  setResenasCargando(true);
  try {
    setResenasResumen(codigo, mapResumen(await resumenMateria(codigo)));
  } catch {
    setResenasError("No se pudieron cargar las reseñas (¿corriste el schema.sql?).");
  }
}

async function abrirDocente(docenteId, materiaCodigo) {
  abrirResena(docenteId, [], null);   // expande
  setResenasCargando(true);           // muestra "Cargando reseñas…"
  try {
    const logueado = !!getEstado().sesion.usuario;
    const [lista, mia] = await Promise.all([
      resenasDe(docenteId, materiaCodigo),
      logueado ? miResena(docenteId, materiaCodigo) : Promise.resolve(null),
    ]);
    abrirResena(docenteId, lista, mia);
  } catch {
    setResenasError("No se pudieron cargar las reseñas de este docente.");
  }
}

async function enviar(form) {
  const docenteId = form.dataset.docenteId;
  const materiaCodigo = form.dataset.materia;
  const { calificacion, comentario } = getEstado().resenas.borrador;
  if (calificacion < 1) return;
  setResenasEnviando(true);
  try {
    await guardarResena(docenteId, materiaCodigo, calificacion, comentario);
    const [lista, mia, resumen] = await Promise.all([
      resenasDe(docenteId, materiaCodigo),
      miResena(docenteId, materiaCodigo),
      resumenMateria(materiaCodigo),
    ]);
    setResenasResumen(materiaCodigo, mapResumen(resumen)); // mismo código: no colapsa
    abrirResena(docenteId, lista, mia);
  } catch (e) {
    setResenasError(mensajeError(e));
  } finally {
    setResenasEnviando(false);
  }
}

export function conectarResenas(raiz) {
  raiz.addEventListener("click", (e) => {
    const toggle = e.target.closest(".rsn-toggle");
    if (toggle) {
      const id = toggle.dataset.docenteId;
      if (getEstado().resenas.abierto === id) cerrarResena();
      else abrirDocente(id, getEstado().ruta.codigo);
      return;
    }
    const star = e.target.closest(".rsn-star");
    if (star) { setResenaBorrador({ calificacion: Number(star.dataset.estrella) }); }
  });

  raiz.addEventListener("input", (e) => {
    if (e.target.id === "rsn-comentario") setResenaBorrador({ comentario: e.target.value });
  });

  raiz.addEventListener("submit", (e) => {
    if (e.target.id === "rsn-form") { e.preventDefault(); enviar(e.target); }
  });
}

function mensajeError(e) {
  const m = e?.message ?? "";
  if (/row-level security|violates row-level|new row violates/i.test(m))
    return "No se pudo publicar: reseñar requiere un correo institucional @est.umss.edu.";
  return m || "No se pudo guardar la reseña.";
}
