// prerequisitos.js — habilitación de materias y roadmap por niveles.
// Una materia se habilita cuando TODAS sus previas están aprobadas (AND).

// Electivas necesarias para egreso (de las 12 ofrecidas).
// ⚠️ Esta regla "6 de 12" NO figura en el PDF del pensum; es decisión de plan.
// CONFIRMAR CONTRA REGLAMENTO antes de tratarla como definitiva.
export const ELECTIVAS_PARA_EGRESO = 6;

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

/** Habilitadas Y ofertadas esta gestión: el "recomendado para el próximo semestre". */
export function recomendadas(materias, aprobadas) {
  return habilitadas(materias, aprobadas).filter((m) => m.ofertada === true);
}

/**
 * Habilitadas pero NO ofertadas esta gestión ("desbloqueada, pero no se abre").
 * Se muestran aparte; no se ocultan.
 */
export function habilitadasNoOfertadas(materias, aprobadas) {
  return habilitadas(materias, aprobadas).filter((m) => m.ofertada === false);
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
 * Roadmap para "Mi avance": reusa roadmap() y faltantes().
 * - ahora: materias cursables ya (nivel topológico 0, prereqs todos aprobados).
 * - despues: el resto de pendientes, en orden de desbloqueo.
 * - faltan: Map<codigo, string[]> con los prereqs que aún faltan por materia.
 * El campo `ofertada` solo es confiable para la gestión actual; cualquier
 * proyección a futuro va sin grupos/horas y rotulada "puede cambiar" en la UI.
 * @returns {{ ahora: object[], despues: object[], faltan: Map<string,string[]>, ciclo: string[] }}
 */
export function roadmapAvance(materias, aprobadas) {
  const { niveles, ciclo } = roadmap(materias, aprobadas);
  const ahora = niveles[0] ?? [];
  const despues = niveles.slice(1).flat();
  const faltan = new Map(
    [...ahora, ...despues].map((m) => [m.codigo, faltantes(m, aprobadas)])
  );
  return { ahora, despues, faltan, ciclo };
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
 * Egreso = TODAS las obligatorias + `electivasRequeridas` electivas.
 * Obligatorias/electivas se DERIVAN del dataset (es_electiva), no se hardcodean.
 *
 * @param {number} [electivasRequeridas=ELECTIVAS_PARA_EGRESO]  (los tests pasan el valor explícito)
 * @returns {{
 *   obligatorias:{aprobadas,total}, electivas:{aprobadas,requeridas,faltan},
 *   porcentaje:number, egresable:boolean
 * }}
 */
export function progresoEgreso(materias, aprobadas, electivasRequeridas = ELECTIVAS_PARA_EGRESO) {
  const obligatorias = materias.filter((m) => !m.es_electiva);
  const electivas = materias.filter((m) => m.es_electiva);
  const oblAprob = obligatorias.filter((m) => aprobadas.has(m.codigo)).length;
  const elecAprob = electivas.filter((m) => aprobadas.has(m.codigo)).length;

  // "faltan" se capea a 0 (nunca negativo aunque sobren electivas). El capeo es
  // SOLO para este campo y para el %: NO afecta `egresable`.
  const elecFaltan = Math.max(0, electivasRequeridas - elecAprob);
  const completados = oblAprob + Math.min(elecAprob, electivasRequeridas);
  const requeridosTotal = obligatorias.length + electivasRequeridas;

  return {
    obligatorias: { aprobadas: oblAprob, total: obligatorias.length },
    electivas: { aprobadas: elecAprob, requeridas: electivasRequeridas, faltan: elecFaltan },
    porcentaje: requeridosTotal ? Math.round((completados / requeridosTotal) * 100) : 0,
    egresable: oblAprob === obligatorias.length && elecAprob >= electivasRequeridas,
  };
}
