// test-data.mjs — pruebas de humo de la capa de datos (sin framework de test).
// Corre con `node tools/test-data.mjs`. Sale 1 si algo falla.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { seleccionesDe, seleccionesChocan } from "../src/data/modelo.js";
import { bloquesSolapan } from "../src/data/tiempo.js";
import { roadmap, habilitadas, progresoEgreso, estado } from "../src/data/prerequisitos.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataset = JSON.parse(
  readFileSync(resolve(__dirname, "..", "data", "horario-1-2026.json"), "utf8")
);
const porCodigo = new Map(dataset.materias.map((m) => [m.codigo, m]));

let fallos = 0;
function ok(cond, msg) {
  if (cond) { console.log("  ✓ " + msg); }
  else { console.error("  ✗ " + msg); fallos++; }
}

console.log("Solapamiento de bloques");
ok(bloquesSolapan({ dia: "LU", inicio: "09:45", fin: "11:15" }, { dia: "LU", inicio: "10:00", fin: "11:30" }), "se cruzan el mismo día");
ok(!bloquesSolapan({ dia: "LU", inicio: "09:45", fin: "11:15" }, { dia: "LU", inicio: "11:15", fin: "12:45" }), "contiguos no se cruzan");
ok(!bloquesSolapan({ dia: "LU", inicio: "09:45", fin: "11:15" }, { dia: "MA", inicio: "09:45", fin: "11:15" }), "distinto día no se cruza");

console.log("Selecciones con vínculo (Física General 2006063)");
const fisica = porCodigo.get("2006063");
const selFis = seleccionesDe(fisica);
ok(selFis.length === 6, `6 selecciones (teoría B × 6 laboratorios), hay ${selFis.length}`);
ok(selFis.every((s) => s.grupos.length === 2), "cada selección tiene teoría + laboratorio");
ok(selFis.every((s) => s.grupos.some((g) => g.rol === "teoria") && s.grupos.some((g) => g.rol === "laboratorio")), "roles correctos en cada selección");

console.log("Selecciones sin vínculo (Álgebra I 2008019)");
const alg = porCodigo.get("2008019");
const selAlg = seleccionesDe(alg);
ok(selAlg.length === 3, `3 selecciones (grupos 10/15/8), hay ${selAlg.length}`);
const g8 = selAlg.find((s) => s.id.endsWith(":8"));
ok(g8 && g8.docentes.has("Aranibar Zambrana Ammy Shalem"), "el docente TP del grupo 8 entra en docentes de la selección");

console.log("Detección de choques entre materias");
const selUno = selAlg[0];
ok(seleccionesChocan(selUno, selUno), "una selección choca consigo misma");

console.log("Prerrequisitos / roadmap");
const sinAprobar = new Set();
const rm = roadmap(dataset.materias, sinAprobar);
ok(rm.ciclo.length === 0, "el grafo de prerrequisitos no tiene ciclos");
ok(rm.niveles[0].length === 5 && rm.niveles[0].every((m) => m.prerrequisitos.length === 0), "nivel 0 del roadmap = 5 materias sin previas");
ok(rm.niveles.flat().length === 54, "el roadmap cubre las 54 materias");

const hab0 = habilitadas(dataset.materias, sinAprobar);
ok(hab0.length === 5, `sin aprobaciones, 5 materias habilitadas, hay ${hab0.length}`);

// Tras aprobar las 5 de nivel A, Álgebra II (2008022) debe habilitarse.
const aprobA = new Set(["1803001", "2006063", "2008019", "2008054", "2010010"]);
ok(estado(porCodigo.get("2008022"), aprobA) === "habilitada", "Álgebra II se habilita al aprobar Álgebra I");
ok(estado(porCodigo.get("2008019"), aprobA) === "aprobada", "Álgebra I figura como aprobada");
ok(estado(porCodigo.get("2010215"), aprobA) === "bloqueada", "Taller de Grado II sigue bloqueado");

const prog = progresoEgreso(dataset.materias, sinAprobar, 6);
ok(prog.obligatorias.total === 42, `42 obligatorias, hay ${prog.obligatorias.total}`);
ok(prog.electivas.requeridas === 6 && !prog.egresable, "egreso requiere 6 electivas y aún no es egresable");

console.log(fallos === 0 ? "\n✓ todas las pruebas pasaron" : `\n✗ ${fallos} prueba(s) fallaron`);
process.exit(fallos ? 1 : 0);
