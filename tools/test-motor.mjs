// test-motor.mjs — pruebas del motor de horarios (Definition of Done, Sprint 2).
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { construirIndiceSlots, slotsDeMask, cuentaBits } from "../src/motor/slots.js";
import { unidadesDe } from "../src/motor/unidades.js";
import {
  generarTodos, generarPorProductoCartesiano, generarPermisivo, generarHorarios,
} from "../src/motor/generador.js";
import { rankear, metricasDeHorario, calificacionDeHorario } from "../src/motor/ranking.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ds = JSON.parse(readFileSync(resolve(__dirname, "..", "data", "horario-1-2026.json"), "utf8"));
const porCodigo = new Map(ds.materias.map((m) => [m.codigo, m]));
const indice = construirIndiceSlots(ds.materias); // bandas derivadas de TODO el dataset

let fallos = 0;
const ok = (c, m) => (c ? console.log("  ✓ " + m) : (console.error("  ✗ " + m), fallos++));
const clave = (h) => h.unidades.map((u) => u.id).sort().join("|");
const conjunto = (hs) => new Set(hs.map(clave));

// --- ORÁCULO: backtracking ↔ producto cartesiano (caso de 3 materias) ---
console.log("Equivalencia backtracking ↔ producto cartesiano (3 materias)");
const tres = ["2008019", "2006063", "2010010"].map((c) => unidadesDe(porCodigo.get(c), indice));
const bt = generarTodos(tres);
const oraculo = generarPorProductoCartesiano(tres);
const sBt = conjunto(bt), sOr = conjunto(oraculo);
ok(bt.length === oraculo.length, `mismo número de combinaciones (${bt.length} vs ${oraculo.length})`);
ok(sBt.size === sOr.size && [...sBt].every((k) => sOr.has(k)), "ambos devuelven EXACTAMENTE el mismo conjunto");
ok(bt.length > 0, `hay combinaciones válidas (${bt.length})`);

// --- FÍSICA: siempre teoría + exactamente 1 lab ---
console.log("Física: teoría + exactamente un laboratorio");
const uFis = unidadesDe(porCodigo.get("2006063"), indice);
ok(uFis.length === 6, `6 unidades agendables, hay ${uFis.length}`);
const malas = uFis.filter((u) => {
  const roles = u.grupos.map((g) => g.rol);
  return roles.filter((r) => r === "teoria").length !== 1
      || roles.filter((r) => r === "laboratorio" || r === "practica").length !== 1;
});
ok(malas.length === 0, "ninguna unidad tiene 2 labs ni teoría sin lab");
ok(uFis.every((u) => u.grupos.some((g) => g.id === "B")), "toda unidad incluye la teoría B");

// --- CHOQUE: en ningún horario dos unidades comparten slot ---
console.log("Choque: dos unidades nunca comparten slot en un horario");
const muchas = ["2008019", "2006063", "2010010", "2008054"].map((c) => unidadesDe(porCodigo.get(c), indice));
const todos = generarTodos(muchas);
const sinChoque = todos.every((h) => {
  for (let i = 0; i < h.unidades.length; i++)
    for (let j = i + 1; j < h.unidades.length; j++)
      if ((h.unidades[i].mask & h.unidades[j].mask) !== 0n) return false;
  return true;
});
ok(sinChoque, `los ${todos.length} horarios generados están libres de choques`);

// --- FILTROS ---
console.log("Filtros");
const evitar = generarHorarios([porCodigo.get("2006063")], { indice, evitarPrimeraBanda: true, limite: 99 });
const usaPrimera = evitar.horarios.some((h) =>
  h.unidades.some((u) => u.bloques.some((b) => b.inicio === indice.bandas[0])));
ok(!usaPrimera, "evitar 06:45 elimina toda unidad con la primera banda");

const { filtrarUnidades } = await import("../src/motor/filtros.js");
const { turnoDeBloque } = await import("../src/data/tiempo.js");
const todasIntro = unidadesDe(porCodigo.get("2010010"), indice); // 8 grupos en varios turnos
const turnosOK = new Set(["tarde", "noche"]);
const tn = filtrarUnidades(todasIntro, { turnos: turnosOK }, indice);
ok(tn.length > 0 && tn.length < todasIntro.length, `filtro de turno (tarde/noche) acota: ${todasIntro.length} → ${tn.length}`);
ok(tn.every((u) => u.bloques.every((b) => turnosOK.has(turnoDeBloque(b)))), "toda unidad que pasa tiene SUS bloques dentro del turno permitido");

const designar = generarHorarios([porCodigo.get("2010005")], { indice, excluirPorDesignar: true });
ok(designar.total === 0 && designar.diagnostico?.tipo === "sin_candidatos",
   "excluir 'por designar' deja sin candidatos a Taller de Prog. en Bajo Nivel (todo por designar)");

// --- FIJAR GRUPO ---
console.log("Fijar grupo");
const fijado = generarHorarios([porCodigo.get("2006063")], { indice, fijados: { "2006063": "B2" }, limite: 99 });
ok(fijado.horarios.length === 1 && fijado.horarios[0].unidades[0].gruposIds.includes("B2"),
   "fijar el laboratorio B2 deja solo la unidad B+B2");

// --- DIAGNÓSTICO de conflicto (no vacío silencioso) ---
console.log("Diagnóstico de caso sobre-restringido");
// Busca dos materias de un solo grupo que choquen en TODOS sus grupos.
const unicas = ds.materias
  .filter((m) => m.grupos.length > 0)
  .map((m) => ({ m, u: unidadesDe(m, indice) }))
  .filter((x) => x.u.length === 1);
let par = null;
for (let i = 0; i < unicas.length && !par; i++)
  for (let j = i + 1; j < unicas.length && !par; j++)
    if ((unicas[i].u[0].mask & unicas[j].u[0].mask) !== 0n) par = [unicas[i].m, unicas[j].m];
ok(par !== null, "existe un par de materias de un solo grupo que chocan (para el test)");
if (par) {
  const r = generarHorarios(par, { indice });
  ok(r.total === 0, "no hay combinación limpia (total 0)");
  ok(r.diagnostico && r.diagnostico.tipo === "conflicto_par", `diagnostica conflicto_par (no vacío silencioso)`);
  ok(/chocan/.test(r.diagnostico.mensaje) && r.diagnostico.sugerencia, "el diagnóstico trae mensaje y sugerencia");
  // Con el modo permisivo, ya NO devuelve vacío: ofrece "armar igual".
  ok(r.permisivo === true && r.horarios.length >= 1, "ofrece horarios permisivos en vez de vacío");
}

// --- PERMISIVO: oráculo de mínimo conflicto (sintético controlado) ---
console.log("Permisivo: oráculo de mínimo conflicto");
const ixMini = { dias: ["LU"], bandas: ["06:45", "08:15", "09:45"], nBandas: 3, total: 3 };
const U = (id, m) => ({ id, materiaCodigo: id, materiaNombre: id, grupos: [], gruposIds: [], docentes: new Set(), porDesignar: false, bloques: [], mask: m });
// Toda unidad comparte la banda 0 -> NO existe combinación limpia.
const listasMini = [
  [U("A1", 0b001n), U("A2", 0b011n)],
  [U("B1", 0b001n), U("B2", 0b111n)],
];
// Oráculo: producto cartesiano contando bandas en choque por combinación.
function oraculoMinConflicto(listas) {
  let productos = [[]];
  for (const l of listas) { const nx = []; for (const c of productos) for (const u of l) nx.push([...c, u]); productos = nx; }
  let min = Infinity;
  for (const combo of productos) {
    let union = 0n, conf = 0n;
    for (const u of combo) { conf |= u.mask & union; union |= u.mask; }
    min = Math.min(min, cuentaBits(conf));
  }
  return min;
}
ok(generarTodos(listasMini).length === 0, "el caso sintético no tiene combinación limpia");
const perm = generarPermisivo(listasMini, { indice: ixMini, limite: 30 });
const minPerm = perm[0].conflictCount;
const minOraculo = oraculoMinConflicto(listasMini);
ok(minPerm === minOraculo, `mínimo conflictCount permisivo (${minPerm}) == oráculo fuerza bruta (${minOraculo})`);
ok(minPerm >= 1, "en el camino permisivo el mínimo conflictCount es ≥ 1 (0 sería bug de generarTodos)");
ok(perm.every((h, i, a) => i === 0 || a[i - 1].conflictCount <= h.conflictCount), "permisivo ordenado por conflictCount asc");

// --- PERMISIVO: invariante (si hay solución limpia, NO se usa el permisivo) ---
console.log("Permisivo: invariante con solución limpia");
const limpio = generarHorarios(["2008019", "2006063"].map((c) => porCodigo.get(c)), { indice });
ok(limpio.total > 0 && limpio.permisivo === false && limpio.diagnostico === null, "caso con solución: permisivo=false, sin diagnóstico");
ok(limpio.horarios.every((h) => h.conflictCount === undefined), "los horarios limpios no traen conflictCount");

// --- PERMISIVO: caso real (dos materias que chocan en todos sus grupos) ---
console.log("Permisivo: caso real de choque total");
if (par) {
  const r = generarHorarios(par, { indice });
  ok(r.permisivo === true && r.diagnostico?.tipo === "conflicto_par", "la fachada usa el permisivo y reporta conflicto_par");
  ok(r.horarios.length >= 1 && r.horarios[0].conflictCount >= 1, "≥1 horario permisivo con conflictCount ≥ 1");
  const uA = unidadesDe(par[0], indice)[0], uB = unidadesDe(par[1], indice)[0];
  const esperado = slotsDeMask(uA.mask & uB.mask, indice).map((s) => s.dia + s.inicio).sort();
  const obtenido = r.horarios[0].conflictos.map((s) => s.dia + s.inicio).sort();
  ok(JSON.stringify(esperado) === JSON.stringify(obtenido), "los slots en choque coinciden con el AND de las dos unidades");
}

// --- RANKING por compacidad (caso sintético controlado) ---
console.log("Ranking por compacidad");
const ix = { dias: ["LU"], bandas: ["06:45", "08:15", "09:45"], nBandas: 3, total: 3 };
const compacto = { unidades: [], mask: 0b011n };   // bandas 0 y 1 (sin hueco)
const conHueco = { unidades: [], mask: 0b101n };    // bandas 0 y 2 (1 hueco)
ok(metricasDeHorario(compacto, ix).huecos === 0, "horario contiguo => 0 huecos");
ok(metricasDeHorario(conHueco, ix).huecos === 1, "horario con banda libre intermedia => 1 hueco");
const ranked = rankear([conHueco, compacto], ix); // rankear clona y adjunta métricas
ok(ranked[0].mask === compacto.mask, "el más compacto queda primero");

// --- RANKING: "mejor calificados" ---
console.log("Ranking por reseñas (mejor calificados)");
const cal = { "d-alta|M": 5, "d-baja|M": 2 };
const hAlta = { unidades: [{ materiaCodigo: "M", grupos: [{ docente_id: "d-alta" }] }], mask: 0b001n };
const hBaja = { unidades: [{ materiaCodigo: "M", grupos: [{ docente_id: "d-baja" }] }], mask: 0b010n };
ok(calificacionDeHorario(hAlta, cal) === 5, "la calificación del horario es el promedio de sus docentes");
const rc = rankear([hBaja, hAlta], ix, { calificaciones: cal, preferirCalificados: true });
ok(rc[0].calificacion === 5, "con 'mejor calificados', el de mayor promedio queda primero");
const rsin = rankear([hBaja, hAlta], ix, { calificaciones: cal, preferirCalificados: false });
ok(rsin[0].calificacion === 2, "sin preferir: NO reordena por reseñas (mantiene orden por compacidad)");

console.log(fallos === 0 ? "\n✓ motor OK" : `\n✗ ${fallos} fallo(s)`);
process.exit(fallos ? 1 : 0);
