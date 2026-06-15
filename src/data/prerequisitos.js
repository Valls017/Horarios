// prerequisitos.js — habilitación de materias y roadmap por niveles.
// Una materia se habilita cuando TODAS sus previas están aprobadas (AND).

/**
 * Indexa las materias por código.
 * @param {object[]} materias
 * @returns {Map<string, object>}
 */
export function indexar(materias) {
  return new Map(materias.map((m) => [m.codigo, m]));
}

/**
 * ¿Está habilitada la materia dado el conjunto de códigos aprobados?
 * (Aprobada no implica habilitada; ver `estado`.)
 */
export function estaHabilitada(materia, aprobadas) {
  return materia.prerrequisitos.every((c) => aprobadas.has(c));
}

/** Previas faltantes (aún no aprobadas) de una materia. */
export function faltantes(materia, aprobadas) {
  return materia.prerrequisitos.filter((c) => !aprobadas.has(c));
}

/**
 * Estado de una materia: "aprobada" | "habilitada" | "bloqueada".
 */
export function estado(materia, aprobadas) {
  if (aprobadas.has(materia.codigo)) return "aprobada";
  return estaHabilitada(materia, aprobadas) ? "habilitada" : "bloqueada";
}

/**
 * Materias que el estudiante puede cursar ahora: habilitadas y no aprobadas.
 * @returns {object[]}
 */
export function habilitadas(materias, aprobadas) {
  return materias.filter(
    (m) => !aprobadas.has(m.codigo) && estaHabilitada(m, aprobadas)
  );
}

/**
 * Roadmap hasta titulación: ordena las materias pendientes en niveles topológicos
 * según prerrequisitos (nivel 0 = cursables ya). Detecta ciclos.
 *
 * @returns {{ niveles: object[][], ciclo: string[] }}
 */
export function roadmap(materias, aprobadas = new Set()) {
  const porCodigo = indexar(materias);
  const pendientes = materias.filter((m) => !aprobadas.has(m.codigo));
  const resueltas = new Set(aprobadas);
  const niveles = [];
  let restantes = pendientes;

  while (restantes.length) {
    const nivel = restantes.filter((m) =>
      m.prerrequisitos.every((c) => !porCodigo.has(c) || resueltas.has(c))
    );
    if (nivel.length === 0) {
      // No avanza: el resto forma (o depende de) un ciclo.
      return { niveles, ciclo: restantes.map((m) => m.codigo) };
    }
    niveles.push(nivel);
    for (const m of nivel) resueltas.add(m.codigo);
    const enNivel = new Set(nivel.map((m) => m.codigo));
    restantes = restantes.filter((m) => !enNivel.has(m.codigo));
  }
  return { niveles, ciclo: [] };
}

/**
 * Mapa inverso: código -> [códigos que lo tienen como prerrequisito].
 * Útil para mostrar "esta materia habilita a…".
 * @returns {Map<string, string[]>}
 */
export function dependientes(materias) {
  const mapa = new Map(materias.map((m) => [m.codigo, []]));
  for (const m of materias) {
    for (const p of m.prerrequisitos) {
      if (mapa.has(p)) mapa.get(p).push(m.codigo);
    }
  }
  return mapa;
}

/**
 * Progreso de egreso: obligatorias aprobadas y electivas aprobadas.
 * Egreso = todas las obligatorias + `electivasRequeridas` electivas.
 */
export function progresoEgreso(materias, aprobadas, electivasRequeridas = 6) {
  const obligatorias = materias.filter((m) => !m.es_electiva);
  const electivas = materias.filter((m) => m.es_electiva);
  const oblAprob = obligatorias.filter((m) => aprobadas.has(m.codigo)).length;
  const elecAprob = electivas.filter((m) => aprobadas.has(m.codigo)).length;
  return {
    obligatorias: { aprobadas: oblAprob, total: obligatorias.length },
    electivas: { aprobadas: elecAprob, requeridas: electivasRequeridas },
    egresable:
      oblAprob === obligatorias.length && elecAprob >= electivasRequeridas,
  };
}
