// docentes.js — identidad estable de docentes.
//
// El `docente_id` es un slug normalizado del nombre: minúsculas, sin acentos ni
// ñ, y separadores colapsados a "-". Por diseño es INSENSIBLE a acentos, caso y
// espacios, así que corregir un acento en el nombre NO cambia el id ni rompe las
// reseñas (decisión D2: reseña atada a (docente, materia), persistente).
//
// Lo que SÍ cambia el id es corregir un error tipográfico real (otra letra). Por
// eso esos casos se detectan y unifican en la fase de datos (tools/docentes-audit.mjs),
// antes de que existan reseñas.

/** "Ordoñez Salvatierra Miguel Angel" -> "ordonez-salvatierra-miguel-angel" */
export function slugDocente(nombre) {
  return String(nombre)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // quita diacríticos combinantes (acentos, ~ de la ñ)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")    // todo lo no alfanumérico -> "-"
    .replace(/^-+|-+$/g, "");       // recorta guiones de los extremos
}

/**
 * Construye el registro de docentes a partir de las materias.
 * @returns {{ registro: object[], idsPorNombre: Map<string,string> }}
 *   registro: [{ id, nombre, materias:[codigo...] }] ordenado por nombre.
 *   Lanza si dos nombres distintos colisionan en el mismo id (requiere desambiguar).
 */
export function construirRegistroDocentes(materias) {
  const porId = new Map(); // id -> { id, nombre, materias:Set }
  const colisiones = [];

  const registrar = (nombre, codigo) => {
    if (!nombre) return; // null = por designar
    const id = slugDocente(nombre);
    if (!porId.has(id)) {
      porId.set(id, { id, nombre, materias: new Set([codigo]) });
    } else {
      const ya = porId.get(id);
      ya.materias.add(codigo);
      if (ya.nombre !== nombre) colisiones.push([id, ya.nombre, nombre]);
    }
  };

  for (const m of materias) {
    for (const g of m.grupos) {
      registrar(g.docente, m.codigo);
      for (const b of g.bloques) registrar(b.docente_tp, m.codigo);
    }
  }

  if (colisiones.length) {
    const detalle = colisiones
      .map(([id, a, b]) => `  ${id}: "${a}" vs "${b}"`)
      .join("\n");
    throw new Error(`Colisión de docente_id (nombres distintos, mismo slug):\n${detalle}`);
  }

  const registro = [...porId.values()]
    .map((d) => ({ id: d.id, nombre: d.nombre, materias: [...d.materias].sort() }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return { registro, idsPorNombre: new Map(registro.map((d) => [d.nombre, d.id])) };
}
