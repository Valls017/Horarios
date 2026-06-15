// test-render.mjs — pruebas de humo de la capa de render (DOM-free).
// Verifica que las vistas producen HTML coherente con el dataset real.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderCatalogo } from "../src/render/catalogo.js";
import { renderMateria } from "../src/render/materia.js";
import { renderDocentes } from "../src/render/docentes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataset = JSON.parse(
  readFileSync(resolve(__dirname, "..", "data", "horario-1-2026.json"), "utf8")
);
const filtros = { texto: "", nivel: "todos", tipo: "todas", turno: "todos", soloOfertadas: false };

let fallos = 0;
const ok = (c, m) => (c ? console.log("  ✓ " + m) : (console.error("  ✗ " + m), fallos++));

console.log("Catálogo");
const cat = renderCatalogo(dataset, filtros);
ok(cat.includes("Álgebra I"), "lista incluye Álgebra I");
ok(cat.includes('href="#/materia/2006063"'), "enlaza al detalle de Física");
ok((cat.match(/class="tarjeta"/g) || []).length === 54, "renderiza 54 tarjetas sin filtro");

console.log("Catálogo filtrado (texto=física, solo ofertadas)");
const cat2 = renderCatalogo(dataset, { ...filtros, texto: "fisica", soloOfertadas: true });
ok(cat2.includes("Física General") && !cat2.includes("Cálculo I"), "filtro de texto acota resultados");

console.log("Detalle de materia (Física General, con vínculo)");
const det = renderMateria(dataset, "2006063");
ok(det.includes("Teoría") && det.includes("Laboratorio"), "muestra roles teoría/laboratorio");
ok(det.includes("un grupo de Teoría + un Laboratorio"), "explica la regla de selección con vínculo");
ok(det.includes("Habilita a") && det.includes("2010013"), "muestra que habilita Arquitectura de Computadoras I");

console.log("Detalle con 'por designar' (Cálculo I grupo 10)");
const det2 = renderMateria(dataset, "2008054");
ok(det2.includes("Por designar"), "docente nulo se muestra como 'Por designar'");

console.log("Detalle de materia inexistente");
ok(renderMateria(dataset, "9999999").includes("No se encontró"), "código inexistente da aviso");

console.log("Docentes");
const doc = renderDocentes(dataset);
ok(doc.includes("Aparicio Yuja Tatiana"), "índice incluye un docente conocido");

console.log(fallos === 0 ? "\n✓ render OK" : `\n✗ ${fallos} fallo(s)`);
process.exit(fallos ? 1 : 0);
