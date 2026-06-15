// docentes-audit.mjs — QA de nombres de docentes.
// 1) Lista los docentes únicos.
// 2) Marca pares casi iguales (distancia de edición pequeña) = posibles
//    duplicados de la misma persona o dos personas reales (a confirmar contra el PDF).
// 3) Marca variantes que solo difieren por acento/mayúsculas (mismo slug).

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { docentesDe } from "../src/data/dataset.js";
import { slugDocente } from "../src/data/docentes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataset = JSON.parse(
  readFileSync(resolve(__dirname, "..", "data", "horario-1-2026.json"), "utf8")
);

const nombres = docentesDe(dataset.materias).map((d) => d.docente);

// Forma normalizada (minúsculas, sin acentos) para comparar.
const norm = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Distancia de Levenshtein.
function lev(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
  return dp[m][n];
}

console.log(`=== Docentes únicos: ${nombres.length} ===`);
for (const n of nombres) console.log(`  ${n}  ·  ${slugDocente(n)}`);

// Variantes con mismo slug (difieren solo por acento/caso/espacios).
const porSlug = new Map();
for (const n of nombres) {
  const s = slugDocente(n);
  if (!porSlug.has(s)) porSlug.set(s, []);
  porSlug.get(s).push(n);
}
const variantes = [...porSlug.values()].filter((v) => v.length > 1);

console.log(`\n=== Variantes con MISMO slug (auto-unificadas por id): ${variantes.length} ===`);
if (variantes.length === 0) console.log("  (ninguna)");
for (const v of variantes) console.log("  " + v.join("  ≈  "));

// Todos los pares ordenados por distancia (forma normalizada, sin acentos).
const pares = [];
for (let i = 0; i < nombres.length; i++)
  for (let j = i + 1; j < nombres.length; j++)
    pares.push({ a: nombres[i], b: nombres[j], d: lev(norm(nombres[i]), norm(nombres[j])) });
pares.sort((x, y) => x.d - y.d);

const criticos = pares.filter((p) => p.d <= 2);
console.log(`\n=== Pares con distancia ≤2 (casi seguro misma persona): ${criticos.length} ===`);
if (criticos.length === 0) console.log("  (ninguno) — no hay grafías casi idénticas");

console.log(`\n=== 12 pares MÁS CERCANOS (distancia mínima primero) — confirmar contra PDF ===`);
for (const p of pares.slice(0, 12)) console.log(`  [d=${p.d}]  "${p.a}"   vs   "${p.b}"`);
