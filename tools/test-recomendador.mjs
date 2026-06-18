// test-recomendador.mjs — recomendador de semestre, progreso de egreso y roadmap.
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  habilitadas, recomendadas, habilitadasNoOfertadas,
  roadmap, roadmapAvance, progresoEgreso, ELECTIVAS_PARA_EGRESO,
} from "../src/data/prerequisitos.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ds = JSON.parse(readFileSync(resolve(__dirname, "..", "data", "horario-1-2026.json"), "utf8"));
const M = ds.materias;
const cods = (xs) => xs.map((m) => m.codigo).sort();

let fallos = 0;
const ok = (c, m) => (c ? console.log("  ✓ " + m) : (console.error("  ✗ " + m), fallos++));

console.log("Grafo acíclico");
ok(roadmap(M, new Set()).ciclo.length === 0, "el grafo de prerrequisitos no tiene ciclos");
ok(roadmap(M, new Set()).niveles.flat().length === 54, "el roadmap cubre las 54 materias");

console.log("Habilitadas iniciales (aprobadas = ∅)");
const hab0 = habilitadas(M, new Set());
ok(hab0.length === 5, `son exactamente 5, hay ${hab0.length}`);
ok(hab0.every((m) => m.nivel === "A" && m.prerrequisitos.length === 0), "todas nivel A sin prereqs");

console.log("Aprobar Intro a la Programación (2010010)");
const habIntro = new Set(habilitadas(M, new Set(["2010010"])).map((m) => m.codigo));
ok(habIntro.has("2010003"), "habilita Elem. de Programación y Estruc. de Datos (2010003)");
ok(habIntro.has("2010200"), "habilita Programación (2010200)");
ok(!habIntro.has("2010010"), "la ya aprobada no figura como habilitada");

console.log("recomendadas ⊆ habilitadas (ofertada) y no-ofertadas aparte");
const rec0 = recomendadas(M, new Set());
const habSet0 = new Set(hab0.map((m) => m.codigo));
ok(rec0.every((m) => habSet0.has(m.codigo)), "recomendadas ⊆ habilitadas");
ok(rec0.every((m) => m.ofertada === true), "toda recomendada tiene ofertada=true");
ok(habilitadasNoOfertadas(M, new Set()).every((m) => m.ofertada === false), "habilitadasNoOfertadas: todas ofertada=false");

console.log("Contabilidad Básica (2016046): habilitada solo con 2010024, siempre no-ofertada");
ok(!new Set(habilitadas(M, new Set()).map((m) => m.codigo)).has("2016046"), "sin 2010024 no está habilitada");
const conTaller = new Set(["2010024"]);
ok(new Set(habilitadas(M, conTaller).map((m) => m.codigo)).has("2016046"), "con 2010024 aprobada, queda habilitada");
ok(cods(habilitadasNoOfertadas(M, conTaller)).includes("2016046"), "cae en habilitadasNoOfertadas (no se abre 1/2026)");
ok(!cods(recomendadas(M, conTaller)).includes("2016046"), "NO aparece como recomendada");

console.log("Progreso de egreso");
const p0 = progresoEgreso(M, new Set(), 6);
ok(p0.obligatorias.total === 42, `42 obligatorias derivadas, hay ${p0.obligatorias.total}`);
ok(p0.electivas.requeridas === 6 && ELECTIVAS_PARA_EGRESO === 6, "requeridas = ELECTIVAS_PARA_EGRESO = 6");
ok(p0.porcentaje === 0 && p0.egresable === false, "0 aprobadas → 0% y egresable=false");
ok(p0.electivas.faltan === 6, "faltan 6 electivas al inicio");

const obl = M.filter((m) => !m.es_electiva).map((m) => m.codigo);
const elec = M.filter((m) => m.es_electiva).map((m) => m.codigo);
const p100 = progresoEgreso(M, new Set([...obl, ...elec.slice(0, 6)]), 6);
ok(p100.porcentaje === 100 && p100.egresable === true, "42 obligatorias + 6 electivas → 100% y egresable=true");
ok(p100.electivas.faltan === 0, "faltan = 0 al cumplir las requeridas");

console.log("Electivas por encima del requerido (ajuste)");
const pMas = progresoEgreso(M, new Set([...obl, ...elec.slice(0, 8)]), 6); // 8 > 6
ok(pMas.egresable === true, "egresable=true con electivas por encima del requerido");
ok(pMas.electivas.faltan === 0, "faltan=0 (capeado, nunca negativo)");
ok(pMas.porcentaje === 100, "% capeado a 100, no lo supera");

console.log("roadmapAvance");
const ra = roadmapAvance(M, new Set());
ok(ra.ahora.length === 5 && ra.ahora.every((m) => m.nivel === "A"), "ahora = las 5 de nivel A");
ok(ra.despues.length === 49, `después = 49 restantes, hay ${ra.despues.length}`);
ok((ra.faltan.get("2010003") ?? []).includes("2010010"), "a Elem. de Programación le falta 2010010");
ok(ra.ahora.every((m) => (ra.faltan.get(m.codigo) ?? []).length === 0), "las de 'ahora' no tienen prereqs faltantes");

console.log(fallos === 0 ? "\n✓ recomendador OK" : `\n✗ ${fallos} fallo(s)`);
process.exit(fallos ? 1 : 0);
