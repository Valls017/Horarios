// estado.js — store mínimo observable de la app (sin dependencias).
// La UI se re-renderiza cuando cambia el estado.

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
};

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
