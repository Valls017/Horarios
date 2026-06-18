// test-render.mjs — pruebas de humo de la capa de render (DOM-free).
// Verifica que las vistas producen HTML coherente con el dataset real.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderCatalogo } from "../src/render/catalogo.js";
import { renderMateria } from "../src/render/materia.js";
import { renderDocentes } from "../src/render/docentes.js";
import { renderArmador } from "../src/render/armador.js";
import { renderAvance } from "../src/render/avance.js";
import { construirIndiceSlots } from "../src/motor/slots.js";
import { unidadesDe } from "../src/motor/unidades.js";
import { generarHorarios } from "../src/motor/generador.js";

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

console.log("Armador");
const indice = construirIndiceSlots(dataset.materias);
const baseArmador = {
  opciones: { turnos: new Set(), evitarPrimeraBanda: false, excluirPorDesignar: false, turnoPreferido: null, fijados: {} },
  indice, busqueda: "", opcionActiva: 0, mostrados: 6,
};
// Sin materias elegidas: invita a elegir.
const arVacio = renderArmador(dataset, { ...baseArmador, elegidas: new Set(), resultado: null });
ok(arVacio.includes("Armar horario") && arVacio.includes("Elegí"), "vista vacía invita a elegir materias");

// Con Física + Álgebra: genera y dibuja grilla.
const elegidas = new Set(["2006063", "2008019"]);
const materias = dataset.materias.filter((m) => elegidas.has(m.codigo));
const resultado = generarHorarios(materias, { indice, limite: 15 });
const arOk = renderArmador(dataset, { ...baseArmador, elegidas, resultado });
ok(arOk.includes("hgrid"), "renderiza la grilla semanal");
ok(arOk.includes("Opción 1") && arOk.includes("mejor armado"), "lista rankeada con 'mejor armado'");
ok(arOk.includes("Física General"), "la leyenda incluye las materias del horario");
ok(arOk.includes('data-codigo="2006063"'), "las celdas llevan data-codigo (fijar desde la grilla)");

// Sin candidatos (excluir 'por designar' vacía una materia toda por designar): aviso de relajar filtro.
const taller = dataset.materias.find((m) => m.codigo === "2010005"); // todos los grupos por designar
const sc = generarHorarios([taller], { indice, excluirPorDesignar: true });
const arSc = renderArmador(dataset, { ...baseArmador, elegidas: new Set(["2010005"]), resultado: sc, opciones: { ...baseArmador.opciones, excluirPorDesignar: true } });
ok(sc.diagnostico?.tipo === "sin_candidatos", "excluir 'por designar' deja sin candidatos");
ok(arSc.includes("ar-aviso-info") && !arSc.includes("No hay horario posible"), "muestra aviso de relajar filtro (sin 'No hay horario posible')");

// Conflicto: se muestran horarios permisivos DIRECTO, con la celda en cruce marcada.
const unicas = dataset.materias.filter((m) => m.grupos.length).map((m) => ({ m, u: unidadesDe(m, indice) })).filter((x) => x.u.length === 1);
let par = null;
for (let i = 0; i < unicas.length && !par; i++)
  for (let j = i + 1; j < unicas.length && !par; j++)
    if ((unicas[i].u[0].mask & unicas[j].u[0].mask) !== 0n) par = [unicas[i].m, unicas[j].m];
if (par) {
  const rp = generarHorarios(par, { indice });
  const arCruce = renderArmador(dataset, { ...baseArmador, elegidas: new Set(par.map((m) => m.codigo)), resultado: rp });
  ok(rp.permisivo === true, "el caso en conflicto va por el camino permisivo");
  ok(arCruce.includes("hgrid") && arCruce.includes("hg-choque"), "dibuja la grilla y marca la celda en cruce (hg-choque)");
  ok(arCruce.includes("cruce") && !arCruce.includes("No hay horario posible"), "una línea de aviso de cruce, sin bloque 'No hay horario posible'");
}

console.log("Mi avance");
const avVacio = renderAvance(dataset, { aprobadas: new Set(), busqueda: "" });
ok(avVacio.includes("Mi avance") && avVacio.includes("no se guarda"), "header con aviso de no-guardado");
ok((avVacio.match(/no se guarda/g) || []).length >= 2, "el aviso se repite junto al checklist (no solo arriba)");
ok(avVacio.includes("av-check") && avVacio.includes("Roadmap"), "checklist + roadmap presentes");

const avIntro = renderAvance(dataset, { aprobadas: new Set(["2010010"]), busqueda: "" });
ok(avIntro.includes('href="#/materia/2010003"') && avIntro.includes('href="#/materia/2010200"'), "recomienda 2010003 y 2010200");
ok(avIntro.includes('id="av-armar"') && avIntro.includes("data-codigos"), "botón para armar con las recomendadas (#10)");

const avTaller = renderAvance(dataset, { aprobadas: new Set(["2010024"]), busqueda: "" });
ok(avTaller.includes('href="#/materia/2016046"') && avTaller.includes("no se abren en 1/2026"), "Contabilidad Básica: desbloqueada pero no ofertada");

const obl = dataset.materias.filter((m) => !m.es_electiva).map((m) => m.codigo);
const elec = dataset.materias.filter((m) => m.es_electiva).map((m) => m.codigo);
const av100 = renderAvance(dataset, { aprobadas: new Set([...obl, ...elec.slice(0, 6)]), busqueda: "" });
ok(av100.includes("100% hacia el egreso") && av100.includes("Cumplís los requisitos"), "progreso 100% y egresable");

console.log(fallos === 0 ? "\n✓ render OK" : `\n✗ ${fallos} fallo(s)`);
process.exit(fallos ? 1 : 0);
