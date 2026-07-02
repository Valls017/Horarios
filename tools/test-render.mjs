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
import { renderCuenta } from "../src/render/auth.js";
import { renderPerfil } from "../src/render/perfil.js";
import { renderAvisos } from "../src/render/avisos.js";
import { renderResenas, docentesResenables } from "../src/render/resenas.js";
import { esCorreoInstitucional } from "../src/data/auth.js";
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
ok(det.includes('href="#/materias"'), "el breadcrumb vuelve al catálogo (#/materias, no al armador)");

console.log("Detalle: CTA al armador");
const detCta = renderMateria(dataset, "2006063", undefined, undefined, { elegidas: new Set() });
ok(detCta.includes('id="mat-armar"') && detCta.includes("Agregar al armador"), "materia ofertada: botón agregar");
ok(renderMateria(dataset, "2006063", undefined, undefined, { elegidas: new Set(["2006063"]) }).includes("En tu armador"), "ya elegida: muestra estado y permite quitar");
ok(!renderMateria(dataset, "2016046", undefined, undefined, { elegidas: new Set() }).includes("mat-armar"), "no ofertada: sin botón");

console.log("Detalle con 'por designar' (Cálculo I grupo 10)");
const det2 = renderMateria(dataset, "2008054");
ok(det2.includes("Por designar"), "docente nulo se muestra como 'Por designar'");

console.log("Detalle de materia inexistente");
ok(renderMateria(dataset, "9999999").includes("No se encontró"), "código inexistente da aviso");

console.log("Docentes");
const doc = renderDocentes(dataset);
ok(doc.includes("Aparicio Yuja Tatiana"), "índice incluye un docente conocido");
ok(doc.includes('id="d-busqueda"'), "tiene buscador de docentes");
const docQ = renderDocentes(dataset, "aparicio");
ok(docQ.includes("Aparicio Yuja Tatiana") && (docQ.match(/class="docente"/g) || []).length < (doc.match(/class="docente"/g) || []).length,
  "la búsqueda acota el índice");
ok(renderDocentes(dataset, "fisica general").includes("docente"), "también busca por materia dictada");

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
ok(arOk.includes('class="ar-fijar"') && arOk.includes("grupo: auto"), "cada elegida tiene selector de grupo/docente");
ok(arOk.includes("Carrasco") || arOk.includes("por designar"), "el selector muestra el nombre del docente");
ok(arOk.includes('id="ar-compartir"'), "botón compartir presente");

// Guardar horario: botón + sección "Mis horarios" solo con sesión.
const armGuard = { ...baseArmador, elegidas, resultado, guardados: [{ id: "g1", nombre: "Mi test", created_at: new Date().toISOString(), datos: { materias: ["2006063"], fijados: {} } }] };
const arSaved = renderArmador(dataset, armGuard, { usuario: { id: "u", email: "a@est.umss.edu" } });
ok(arSaved.includes("★ Guardar") && arSaved.includes("Mis horarios guardados") && arSaved.includes("Mi test"), "logueado: botón Guardar + lista de guardados");
ok(!renderArmador(dataset, armGuard, { usuario: null }).includes("Mis horarios guardados"), "sin sesión: no muestra guardados");

// Guardado/borrado inline (sin window.prompt/confirm).
const arForm = renderArmador(dataset, { ...armGuard, guardarAbierto: true }, { usuario: { id: "u", email: "a@est.umss.edu" } });
ok(arForm.includes('id="ar-guardar-form"') && arForm.includes('id="ar-nombre"'), "guardar abre formulario inline con nombre");
const arConf = renderArmador(dataset, { ...armGuard, confirmarBorrar: "g1" }, { usuario: { id: "u", email: "a@est.umss.edu" } });
ok(arConf.includes("sí, borrar") && arConf.includes("ar-borrar-no"), "borrar pide confirmación en dos toques");

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
ok(avVacio.includes("Mi avance") && avVacio.includes("no se guarda"), "sin sesión: aviso de no-guardado junto al checklist");
ok(avVacio.includes("anillo") && avVacio.includes("hacia el egreso"), "resumen con anillo de progreso arriba");
ok(renderAvance(dataset, { aprobadas: new Set(), busqueda: "", error: null }, { usuario: { email: "a@est.umss.edu" } }).includes("se guardan en tu cuenta"), "con sesión: las aprobadas se guardan");
ok(avVacio.includes("av-check") && avVacio.includes("Roadmap"), "checklist + roadmap presentes");

const avIntro = renderAvance(dataset, { aprobadas: new Set(["2010010"]), busqueda: "" }, undefined, indice);
ok(avIntro.includes('href="#/materia/2010003"') && avIntro.includes('href="#/materia/2010200"'), "recomienda 2010003 y 2010200 (sin choques)");
ok(avIntro.includes('id="av-armar"') && avIntro.includes("data-codigos"), "botón para armar con las recomendadas (#10)");

const avTaller = renderAvance(dataset, { aprobadas: new Set(["2010024"]), busqueda: "" });
ok(avTaller.includes('href="#/materia/2016046"') && avTaller.includes("no se abren en 1/2026"), "Contabilidad Básica: desbloqueada pero no ofertada");

const obl = dataset.materias.filter((m) => !m.es_electiva).map((m) => m.codigo);
const elec = dataset.materias.filter((m) => m.es_electiva).map((m) => m.codigo);
const av100 = renderAvance(dataset, { aprobadas: new Set([...obl, ...elec.slice(0, 6)]), busqueda: "" });
ok(av100.includes("100% hacia el egreso") && av100.includes("Cumplís los requisitos"), "progreso 100% y egresable");

console.log("Perfil / cuenta");
const sesionOut = { usuario: null, error: null, cargando: false, emailDraft: "" };
const sesionIn = { usuario: { id: "x", email: "ana@est.umss.edu" }, error: null, cargando: false, emailDraft: "" };
const cOut = renderCuenta(sesionOut);
ok(cOut.includes('id="auth-form"') && cOut.includes("Crear cuenta"), "deslogueado: formulario entrar/crear visible");
ok(renderCuenta({ ...sesionOut, error: "x", emailDraft: "ana@est.umss.edu" }).includes('value="ana@est.umss.edu"'), "si falla, conserva el email tipeado");
ok(renderCuenta(sesionIn) === "", "logueado: sin tarjeta de cuenta (Salir vive en el hero del Perfil)");
ok(esCorreoInstitucional("ana@est.umss.edu") && !esCorreoInstitucional("ana@gmail.com"), "esCorreoInstitucional discrimina el dominio");

const armPerf = { guardados: [{ id: "g1", nombre: "Mi test", created_at: new Date().toISOString(), datos: { materias: ["2006063"], fijados: {} } }] };
const perfOut = renderPerfil(dataset, sesionOut, armPerf, { aprobadas: new Set() });
ok(perfOut.includes("Mi avance") && perfOut.includes('href="#/avance"'), "Perfil enlaza a Mi avance");
ok(perfOut.includes('id="auth-form"'), "Perfil sin sesión muestra el formulario de cuenta");
ok(!perfOut.includes("Mis horarios guardados"), "Perfil sin sesión no lista guardados");
ok(perfOut.includes("perfil-carrera") && perfOut.includes("anillo") && perfOut.includes("hacia el egreso"), "Perfil muestra la tarjeta de carrera con anillo y progreso");
const perfIn = renderPerfil(dataset, sesionIn, armPerf, { aprobadas: new Set(["2010010"]) });
ok(perfIn.includes("Mis horarios guardados") && perfIn.includes("Mi test"), "Perfil con sesión lista los guardados (plegable)");
ok(perfIn.includes("ana@est.umss.edu") && perfIn.includes('id="auth-salir"'), "Perfil con sesión: email + Salir en el hero");
ok(perfIn.includes("hacia el egreso"), "la fila Mi avance resume el progreso en texto");
ok(!perfIn.includes('id="auth-form"'), "logueado: sin formulario de cuenta");

console.log("Plegables (semestres)");
const catCerrado = renderCatalogo(dataset, filtros);
ok(catCerrado.includes('data-plegable="cat:A"') && !catCerrado.includes("<details class=\"nivel-bloque\" open"), "sin filtros: semestres plegables cerrados");
ok(catCerrado.includes("Semestre 1 (A)"), "los niveles se muestran como semestres");
const catAbierto = renderCatalogo(dataset, filtros, { abiertos: { "cat:A": true } });
ok(catAbierto.includes('class="nivel-bloque" open'), "abrir Semestre 1 desde el estado lo renderiza abierto");
ok(renderCatalogo(dataset, { ...filtros, texto: "fisica" }).includes(" open"), "con búsqueda activa los semestres se abren solos");

console.log("Avisos (campana)");
ok(renderAvisos({ abierto: false, ultimoVisto: 0 }).includes("avisos-dot"), "hay avisos sin ver: muestra el puntito");
ok(!renderAvisos({ abierto: false, ultimoVisto: 999 }).includes("avisos-dot"), "todo visto: sin puntito");
const avAbierto = renderAvisos({ abierto: true, ultimoVisto: 999 });
ok(avAbierto.includes("avisos-panel") && avAbierto.includes("Oferta 1/2026 cargada"), "panel abierto lista los avisos");

console.log("Reseñas");
const alg = dataset.materias.find((m) => m.codigo === "2008019");
const sliceBase = { codigo: "2008019", resumen: {}, abierto: null, lista: [], mia: null, borrador: { calificacion: 0, comentario: "" }, cargando: false, enviando: false, error: null };
const docs = docentesResenables(alg);
ok(docs.length >= 1 && docs.every((d) => d.id && d.nombre), "docentesResenables devuelve {id,nombre}");
ok(renderResenas(alg, sliceBase, { usuario: null }).includes("Reseñas de docentes"), "sección de reseñas con docentes");

const docId = docs[0].id;
const sliceAbierto = { ...sliceBase, abierto: docId };
ok(renderResenas(alg, sliceAbierto, { usuario: null }).includes("Iniciá sesión"), "sin sesión: invita a entrar (puede leer)");
ok(renderResenas(alg, sliceAbierto, { usuario: { email: "x@gmail.com" } }).includes("correo institucional"), "no institucional: bloquea calificar");
const formOut = renderResenas(alg, sliceAbierto, { usuario: { email: "x@est.umss.edu" } });
ok(formOut.includes('id="rsn-form"') && formOut.includes("rsn-star"), "institucional: formulario con estrellas");
ok(renderResenas(alg, { ...sliceBase, resumen: { [docId]: { promedio: 4.5, cantidad: 2 } } }, { usuario: null }).includes("2 reseñas"), "muestra promedio/cantidad");
ok(renderMateria(dataset, "2008019", sliceBase, { usuario: null }).includes("Reseñas de docentes"), "la página de materia integra las reseñas");
ok(renderResenas(alg, { ...sliceBase, error: "Falló la carga" }, { usuario: null }).includes("Falló la carga"), "muestra el error de carga (no 'Cargando…' eterno)");

console.log(fallos === 0 ? "\n✓ render OK" : `\n✗ ${fallos} fallo(s)`);
process.exit(fallos ? 1 : 0);
