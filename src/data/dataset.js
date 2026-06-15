// dataset.js — carga del dataset canónico en el navegador.
// La ruta es relativa a la raíz servida (ver index.html / servidor estático).

const RUTA = "./data/horario-1-2026.json";

let _cache = null;

/**
 * Carga el dataset (con caché en memoria).
 * @param {string} [ruta]
 * @returns {Promise<object>}
 */
export async function cargarDataset(ruta = RUTA) {
  if (_cache) return _cache;
  const resp = await fetch(ruta);
  if (!resp.ok) throw new Error(`No se pudo cargar el dataset (${resp.status})`);
  _cache = await resp.json();
  return _cache;
}

/** Lista de docentes únicos con las materias en que aparecen (para reseñas/filtros). */
export function docentesDe(materias) {
  const mapa = new Map(); // docente -> Set(codigos)
  for (const m of materias) {
    for (const g of m.grupos) {
      const nombres = [g.docente, ...g.bloques.map((b) => b.docente_tp)].filter(Boolean);
      for (const d of nombres) {
        if (!mapa.has(d)) mapa.set(d, new Set());
        mapa.get(d).add(m.codigo);
      }
    }
  }
  return [...mapa.entries()]
    .map(([docente, codigos]) => ({ docente, materias: [...codigos] }))
    .sort((a, b) => a.docente.localeCompare(b.docente, "es"));
}
