// estado.js — store mínimo observable de la app (sin dependencias).
// La UI se re-renderiza cuando cambia el estado.

import { construirIndiceSlots } from "../motor/slots.js";
import { generarHorarios } from "../motor/generador.js";

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
      fijados: {},                // { codigo: grupoId }
    },
    indice: null,                 // índice de slots (se arma con el dataset)
    resultado: null,              // salida del motor
    opcionActiva: 0,              // qué horario del resultado se muestra
    mostrados: 0,                 // cuántas opciones se ven (paginación "ver más")
    busqueda: "",                 // filtro del selector de materias (solo UI)
  },
  avance: {
    aprobadas: new Set(),         // códigos aprobados (EN SESIÓN, no se persiste aún)
    busqueda: "",                 // filtro del checklist (solo UI)
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
  a.resultado = generarHorarios(materias, { ...a.opciones, indice: a.indice, limite: LIMITE_GEN });
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
    turnoPreferido: null, fijados: {},
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
  a.has(codigo) ? a.delete(codigo) : a.add(codigo);
  notificar();
}

export function limpiarAprobadas() {
  estado.avance.aprobadas = new Set();
  notificar();
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

export function setRuta(ruta) {
  estado.ruta = ruta;
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
