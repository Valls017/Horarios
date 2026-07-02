// estado.js — store mínimo observable de la app (sin dependencias).
// La UI se re-renderiza cuando cambia el estado.

import { construirIndiceSlots } from "../motor/slots.js";
import { generarHorarios } from "../motor/generador.js";
import { resumenTodos } from "../data/resenas.js";
import { cargarAprobadas, marcarAprobada, desmarcarAprobada, limpiarAprobadasDB } from "../data/aprobadas.js";
import { listarHorarios, guardarHorario, borrarHorario } from "../data/horarios.js";
import { ULTIMO_AVISO } from "../data/avisos.js";

// Marcador "hasta qué aviso viste" (UI, no crítico — por eso localStorage está OK acá).
const CLAVE_AVISOS = "sd-avisos-visto";
function leerUltimoVisto() {
  try { return Number(localStorage.getItem(CLAVE_AVISOS)) || 0; } catch { return 0; }
}

const estado = {
  dataset: null,        // dataset canónico cargado
  ruta: { vista: "catalogo", codigo: null }, // ruta actual (la setea el router)
  filtros: {
    texto: "",          // busca en nombre/código/sigla/docente
    nivel: "todos",     // "todos" | "A".."I"
    tipo: "todas",      // "todas" | "obligatorias" | "electivas"
    turno: "todos",     // "todos" | "manana" | "tarde" | "noche"
    soloOfertadas: false,
  },
  armador: {
    elegidas: new Set(),          // códigos de materia elegidos
    opciones: {
      turnos: new Set(),          // turnos permitidos (vacío = todos)
      evitarPrimeraBanda: false,  // evitar 06:45
      excluirPorDesignar: false,
      turnoPreferido: null,       // sesga el ranking, no descarta
      preferirCalificados: false, // rankear por promedio de reseñas
      fijados: {},                // { codigo: grupoId }
    },
    calificaciones: {},           // { "docenteId|materiaCodigo": promedio }
    calificadasCargadas: false,   // ya se trajeron los promedios de Supabase
    indice: null,                 // índice de slots (se arma con el dataset)
    resultado: null,              // salida del motor
    opcionActiva: 0,              // qué horario del resultado se muestra
    mostrados: 0,                 // cuántas opciones se ven (paginación "ver más")
    busqueda: "",                 // filtro del selector de materias (solo UI)
    guardados: [],                // horarios guardados del usuario
    guardarAbierto: false,        // formulario inline "guardar horario" visible
    confirmarBorrar: null,        // id del guardado esperando confirmación de borrado
  },
  avance: {
    aprobadas: new Set(),         // códigos aprobados (persisten si hay sesión)
    busqueda: "",                 // filtro del checklist (solo UI)
    error: null,                  // error al guardar un cambio
  },
  sesion: {
    usuario: null,                // { id, email } o null (no logueado)
    cargando: false,              // operación de auth en curso
    error: null,                  // mensaje (error o info) de auth
    emailDraft: "",               // email tipeado (se conserva si falla el login)
  },
  avisos: {
    abierto: false,               // panel de la campana abierto
    ultimoVisto: leerUltimoVisto(), // id del último aviso visto (puntito de sin-leer)
  },
  ui: {
    abiertos: {},                 // secciones plegables tocadas: { clave: bool }
  },
  docentes: {
    busqueda: "",                 // filtro del índice de docentes (solo UI)
  },
  toast: {
    id: 0,                        // correlativo (evita que un timer viejo borre un toast nuevo)
    msg: null,
    tipo: "ok",                   // "ok" | "error"
  },
  resenas: {
    codigo: null,                 // materia cuyas reseñas están cargadas
    resumen: {},                  // { docenteId: { promedio, cantidad } }
    abierto: null,                // docenteId expandido
    lista: [],                    // reseñas públicas del docente abierto
    mia: null,                    // mi reseña del docente abierto (o null)
    borrador: { calificacion: 0, comentario: "" },
    cargando: false,
    enviando: false,
    error: null,
  },
};

const LIMITE_GEN = 50;            // tope de horarios traídos por generación (no MAX_COMBOS)
const MOSTRAR_INICIAL = 6;        // opciones visibles al inicio
const MOSTRAR_PASO = 6;           // cuántas suma cada "ver más"

const suscriptores = new Set();

/** @returns {object} estado actual (solo lectura por convención). */
export function getEstado() {
  return estado;
}

/** Suscribe una función que se llama tras cada cambio. Devuelve la baja. */
export function suscribir(fn) {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}

function notificar() {
  for (const fn of suscriptores) fn(estado);
}

export function setDataset(dataset) {
  estado.dataset = dataset;
  estado.armador.indice = construirIndiceSlots(dataset.materias);
  notificar();
}

// ---------------------------------------------------------------------------
// Armador de horarios
// ---------------------------------------------------------------------------

/** Recalcula el resultado del motor con el estado actual del armador. */
function regenerar() {
  const a = estado.armador;
  a.opcionActiva = 0;
  a.mostrados = MOSTRAR_INICIAL;
  if (a.elegidas.size === 0) { a.resultado = null; return; }
  const materias = estado.dataset.materias.filter((m) => a.elegidas.has(m.codigo));
  a.resultado = generarHorarios(materias, {
    ...a.opciones, indice: a.indice, limite: LIMITE_GEN, calificaciones: a.calificaciones,
  });
}

/** Activa/desactiva "mejor calificados"; trae los promedios la primera vez. */
export async function setPreferirCalificados(on) {
  estado.armador.opciones.preferirCalificados = on;
  if (on && !estado.armador.calificadasCargadas) {
    try {
      const arr = await resumenTodos();
      const mapa = {};
      for (const x of arr) mapa[`${x.docente_id}|${x.materia_codigo}`] = Number(x.promedio);
      estado.armador.calificaciones = mapa;
      estado.armador.calificadasCargadas = true;
    } catch { /* sin datos: el ranking cae a compacidad */ }
  }
  regenerar();
  notificar();
}

/** "Ver más": pagina sobre lo ya traído (no regenera; el tope ya vino en LIMITE_GEN). */
export function verMasOpciones() {
  const a = estado.armador;
  const total = a.resultado?.horarios.length ?? 0;
  a.mostrados = Math.min(a.mostrados + MOSTRAR_PASO, total);
  notificar();
}

export function toggleElegida(codigo) {
  const e = estado.armador.elegidas;
  if (e.has(codigo)) {
    e.delete(codigo);
    delete estado.armador.opciones.fijados[codigo]; // soltar grupo fijado al quitar
  } else {
    e.add(codigo);
  }
  regenerar();
  notificar();
}

export function toggleTurnoArmador(turno) {
  const t = estado.armador.opciones.turnos;
  t.has(turno) ? t.delete(turno) : t.add(turno);
  regenerar();
  notificar();
}

export function setOpcionArmador(parcial) {
  Object.assign(estado.armador.opciones, parcial);
  regenerar();
  notificar();
}

export function setFijado(codigo, grupoId) {
  if (grupoId) estado.armador.opciones.fijados[codigo] = grupoId;
  else delete estado.armador.opciones.fijados[codigo];
  regenerar();
  notificar();
}

/** Fijar/soltar un grupo desde la grilla: si ya estaba ese mismo, lo suelta. */
export function toggleFijado(codigo, grupoId) {
  const f = estado.armador.opciones.fijados;
  if (f[codigo] === grupoId) delete f[codigo];
  else f[codigo] = grupoId;
  regenerar();
  notificar();
}

export function limpiarFijados() {
  estado.armador.opciones.fijados = {};
  regenerar();
  notificar();
}

export function setOpcionActiva(i) {
  estado.armador.opcionActiva = i;
  notificar();
}

export function setBusquedaArmador(texto) {
  estado.armador.busqueda = texto;   // no regenera: solo filtra el selector
  notificar();
}

export function limpiarArmador() {
  estado.armador.elegidas = new Set();
  estado.armador.opciones = {
    turnos: new Set(), evitarPrimeraBanda: false, excluirPorDesignar: false,
    turnoPreferido: null, preferirCalificados: false, fijados: {},
  };
  estado.armador.resultado = null;
  estado.armador.opcionActiva = 0;
  estado.armador.mostrados = MOSTRAR_INICIAL;
  notificar();
}

// ---------------------------------------------------------------------------
// Mi avance (aprobadas en sesión)
// ---------------------------------------------------------------------------

export function toggleAprobada(codigo) {
  const a = estado.avance.aprobadas;
  const estaba = a.has(codigo);
  estaba ? a.delete(codigo) : a.add(codigo);
  estado.avance.error = null;
  notificar();
  // Persistir si hay sesión; revertir si falla.
  if (estado.sesion.usuario) {
    (estaba ? desmarcarAprobada(codigo) : marcarAprobada(codigo)).catch(() => {
      estaba ? a.add(codigo) : a.delete(codigo);
      estado.avance.error = "No se pudo guardar el cambio. Reintentá.";
      notificar();
    });
  }
}

export function setAprobadas(codigos) {
  estado.avance.aprobadas = new Set(codigos);
  estado.avance.error = null;
  notificar();
}

export function limpiarAprobadas() {
  const previas = estado.avance.aprobadas;
  if (previas.size === 0) return;
  estado.avance.aprobadas = new Set();
  estado.avance.error = null;
  notificar();
  // Persistir el borrado si hay sesión; revertir si falla.
  if (estado.sesion.usuario) {
    limpiarAprobadasDB().catch(() => {
      estado.avance.aprobadas = previas;
      estado.avance.error = "No se pudo limpiar. Reintentá.";
      notificar();
    });
  }
}

// --- Datos del usuario (al iniciar/cerrar sesión) ---
export async function cargarDatosUsuario() {
  try { setAprobadas(await cargarAprobadas()); } catch { /* sin conexión: queda como esté */ }
  await refrescarGuardados();
}

export function limpiarDatosUsuario() {
  estado.avance.aprobadas = new Set();
  estado.armador.guardados = [];
  notificar();
}

// --- Horarios guardados ---
async function refrescarGuardados() {
  try { estado.armador.guardados = await listarHorarios(); notificar(); } catch { /* ignora */ }
}

/** Datos (materias + grupos fijados) del horario activo — para guardar o compartir. */
export function datosHorarioActivo() {
  const a = estado.armador;
  const r = a.resultado;
  if (!r || !r.horarios.length) return null;
  const h = r.horarios[Math.min(a.opcionActiva, r.horarios.length - 1)];
  const fijados = {};
  for (const u of h.unidades) {
    // El laboratorio/práctica identifica unívocamente la unidad (Física); si no, el grupo.
    const disc = u.grupos.find((g) => g.rol === "laboratorio" || g.rol === "practica") ?? u.grupos[0];
    fijados[u.materiaCodigo] = disc.id;
  }
  return { materias: [...a.elegidas], fijados };
}

/** Guarda el horario activo como (materias + grupos fijados) para reconstruirlo. */
export async function guardarHorarioActual(nombre) {
  const datos = datosHorarioActivo();
  if (!datos) return;
  await guardarHorario(nombre?.trim() || "Mi horario", datos);
  await refrescarGuardados();
}

/** Recarga un horario guardado: restaura materias + grupos fijados y regenera.
 * Resetea los filtros para que el horario exacto se reconstruya sin interferencias. */
export function cargarHorarioGuardado(datos) {
  estado.armador.elegidas = new Set(datos?.materias ?? []);
  estado.armador.opciones = {
    turnos: new Set(), evitarPrimeraBanda: false, excluirPorDesignar: false,
    turnoPreferido: null, preferirCalificados: false,
    fijados: { ...(datos?.fijados ?? {}) },
  };
  regenerar();
  notificar();
}

export async function eliminarHorario(id) {
  try { await borrarHorario(id); await refrescarGuardados(); } catch { /* ignora */ }
}

export function setBusquedaAvance(texto) {
  estado.avance.busqueda = texto;
  notificar();
}

/** Precarga el armador con una lista de materias y regenera (para "armar con las recomendadas"). */
export function precargarArmador(codigos) {
  estado.armador.elegidas = new Set(codigos);
  estado.armador.opciones.fijados = {};
  regenerar();
  notificar();
}

// ---------------------------------------------------------------------------
// Sesión / auth
// ---------------------------------------------------------------------------

export function setSesionUsuario(usuario) {
  estado.sesion.usuario = usuario;
  estado.sesion.cargando = false;
  estado.sesion.error = null;
  notificar();
}

export function setSesionEstado(parcial) {
  Object.assign(estado.sesion, parcial);
  notificar();
}

// ---------------------------------------------------------------------------
// Avisos (campana)
// ---------------------------------------------------------------------------

export function toggleAvisos() {
  const av = estado.avisos;
  av.abierto = !av.abierto;
  if (av.abierto && av.ultimoVisto < ULTIMO_AVISO) {
    av.ultimoVisto = ULTIMO_AVISO;
    try { localStorage.setItem(CLAVE_AVISOS, String(ULTIMO_AVISO)); } catch { /* sin storage: solo esta sesión */ }
  }
  notificar();
}

export function cerrarAvisos() {
  if (!estado.avisos.abierto) return;
  estado.avisos.abierto = false;
  notificar();
}

/** Abre/cierra una sección plegable (sobrevive a los re-renders). */
export function setPlegable(clave, abierto) {
  estado.ui.abiertos[clave] = abierto;
  notificar();
}

export function setBusquedaDocentes(texto) {
  estado.docentes.busqueda = texto;
  notificar();
}

/** Aviso breve no bloqueante (reemplaza a window.alert). Se oculta solo. */
export function mostrarToast(msg, tipo = "ok") {
  const t = estado.toast;
  t.id += 1; t.msg = msg; t.tipo = tipo;
  notificar();
  const mio = t.id;
  setTimeout(() => {
    if (estado.toast.id === mio) { estado.toast.msg = null; notificar(); }
  }, 3500);
}

export function setGuardarAbierto(abierto) {
  estado.armador.guardarAbierto = abierto;
  notificar();
}

export function setConfirmarBorrar(id) {
  estado.armador.confirmarBorrar = id;
  notificar();
}

// ---------------------------------------------------------------------------
// Reseñas
// ---------------------------------------------------------------------------

export function setResenasCargando(b) {
  estado.resenas.cargando = b;
  if (b) estado.resenas.error = null;
  notificar();
}

export function setResenasResumen(codigo, resumen) {
  const r = estado.resenas;
  if (r.codigo !== codigo) { r.abierto = null; r.lista = []; r.mia = null; } // solo al cambiar de materia
  r.codigo = codigo;
  r.resumen = resumen;
  r.cargando = false; r.error = null;
  notificar();
}

export function abrirResena(docenteId, lista, mia) {
  const r = estado.resenas;
  r.abierto = docenteId;
  r.lista = lista;
  r.mia = mia;
  r.borrador = mia
    ? { calificacion: mia.calificacion, comentario: mia.comentario ?? "" }
    : { calificacion: 0, comentario: "" };
  r.cargando = false; r.error = null;
  notificar();
}

export function cerrarResena() {
  Object.assign(estado.resenas, { abierto: null, lista: [], mia: null, error: null });
  notificar();
}

export function setResenaBorrador(parcial) {
  Object.assign(estado.resenas.borrador, parcial);
  notificar();
}

export function setResenasEnviando(b) {
  estado.resenas.enviando = b;
  if (b) estado.resenas.error = null;
  notificar();
}

export function setResenasError(msg) {
  estado.resenas.error = msg;
  estado.resenas.cargando = false;
  estado.resenas.enviando = false;
  notificar();
}

/** Falla al cargar el resumen: marca la materia como intentada (corta reintentos) y guarda el error. */
export function setResenasFallo(codigo, msg) {
  const r = estado.resenas;
  r.codigo = codigo; r.resumen = {}; r.error = msg;
  r.cargando = false; r.abierto = null; r.lista = []; r.mia = null;
  notificar();
}

export function setRuta(ruta) {
  estado.ruta = ruta;
  estado.avisos.abierto = false; // navegar cierra el panel de avisos
  notificar();
}

/** Actualiza uno o varios filtros y notifica. */
export function setFiltros(parcial) {
  Object.assign(estado.filtros, parcial);
  notificar();
}

export function limpiarFiltros() {
  estado.filtros = { texto: "", nivel: "todos", tipo: "todas", turno: "todos", soloOfertadas: false };
  notificar();
}
