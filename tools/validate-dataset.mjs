// validate-dataset.mjs — valida data/horario-1-2026.json contra el esquema
// (src/data/validacion.js) y cruza el grafo de prerrequisitos contra la fuente
// de verdad declarada en CLAUDE.md. Sale con código 1 si algo falla.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validarDataset } from "../src/data/validacion.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const dataset = JSON.parse(
  readFileSync(resolve(ROOT, "data", "horario-1-2026.json"), "utf8")
);

const errores = [...validarDataset(dataset)];

// --- Cross-check: grafo de prerrequisitos canónico (CLAUDE.md, plan 134111) ---
const GRAFO = {
  1803001: [], 2006063: [], 2008019: [], 2008054: [], 2010010: [],
  1803002: ["1803001"], 2008022: ["2008019"], 2008056: ["2008054"],
  2010003: ["2010010"], 2010013: ["2006063"], 2010200: ["2010010"],
  2008060: ["2008056"], 2008140: ["2008022"], 2010014: ["2010013"],
  2010037: ["2010200"], 2010041: ["1803002"], 2010206: ["2010003"],
  2008029: ["2008060"], 2010005: ["2010014"], 2010015: ["2010041"],
  2010018: ["2010206"], 2010038: ["2008140"], 2010197: ["2010037"],
  2010016: ["2010015"], 2010017: ["2010005"], 2010022: ["2010018"],
  2010040: ["2010005"], 2010042: ["2010197"], 2010201: ["2008029", "2010038"],
  2010020: ["2010022"], 2010047: ["2010017"], 2010049: ["2010040"],
  2010053: ["2010016"], 2010202: ["2010201"], 2010203: ["2010042"],
  2010019: ["2010049"], 2010024: ["2010020", "2010053"], 2010100: ["2010203"],
  2010182: ["2010016"], 2010204: ["2010202"], 2010205: ["2010047"],
  2010033: ["2010049"], 2010035: ["2010205"], 2010102: ["2010100"],
  2010214: ["2010024"], 2016046: ["2010024"],
  2010066: ["2010020"], 2010079: ["2010020"], 2010103: ["2010201"],
  2010174: ["2010047"], 2010209: ["2010102"], 2010211: ["2010017"],
  2010215: ["2010102", "2010214"], 2010217: ["2010020"],
};

const porCodigo = new Map(dataset.materias.map((m) => [m.codigo, m]));

// Códigos esperados vs presentes.
for (const codigo of Object.keys(GRAFO)) {
  if (!porCodigo.has(codigo)) errores.push(`falta materia ${codigo} (en grafo, no en dataset)`);
}
for (const m of dataset.materias) {
  if (!(m.codigo in GRAFO)) errores.push(`materia ${m.codigo} no está en el grafo canónico`);
}

// Prerrequisitos deben coincidir exactamente (como conjuntos).
const mismoSet = (a, b) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();
for (const [codigo, previas] of Object.entries(GRAFO)) {
  const m = porCodigo.get(codigo);
  if (m && !mismoSet(m.prerrequisitos, previas)) {
    errores.push(
      `prereqs ${codigo}: dataset=[${m.prerrequisitos}] vs grafo=[${previas}]`
    );
  }
}

// --- Conteos esperados ---
const total = dataset.materias.length;
const electivas = dataset.materias.filter((m) => m.es_electiva).length;
const ofertadas = dataset.materias.filter((m) => m.grupos.length > 0).length;
if (total !== 54) errores.push(`se esperaban 54 materias, hay ${total}`);
if (electivas !== 12) errores.push(`se esperaban 12 electivas, hay ${electivas}`);
if (ofertadas !== 52) errores.push(`se esperaban 52 materias ofertadas en 1/2026, hay ${ofertadas}`);

// --- Reporte ---
if (errores.length) {
  console.error(`✗ ${errores.length} problema(s):`);
  for (const e of errores) console.error("  - " + e);
  process.exit(1);
}

const grupos = dataset.materias.reduce((n, m) => n + m.grupos.length, 0);
const bloques = dataset.materias.reduce(
  (n, m) => n + m.grupos.reduce((k, g) => k + g.bloques.length, 0), 0
);
console.log("✓ dataset válido");
console.log(`  ${total} materias · ${electivas} electivas · ${ofertadas} ofertadas · ${grupos} grupos · ${bloques} bloques`);
