// avance.js — vista "Mi avance": marcar aprobadas (en sesión) y ver recomendación
// del próximo semestre, desbloqueadas no ofertadas, progreso de egreso y roadmap.

import { agruparPorNivel } from "../data/filtros.js";
import {
  indexar, planSemestre, habilitadasNoOfertadas, progresoEgreso,
  roadmapAvance, ELECTIVAS_PARA_EGRESO, MATERIAS_POR_SEMESTRE,
} from "../data/prerequisitos.js";
import { planSemestreSinChoques } from "../motor/plan.js";
import { esc, NOMBRE_NIVEL, plegable, anilloProgreso } from "./comunes.js";

const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function avisoSesion(sesion) {
  return sesion?.usuario
    ? `<div class="av-aviso ok">✓ Tus materias aprobadas <strong>se guardan en tu cuenta</strong>.</div>`
    : `<div class="av-aviso">⚠ Esto <strong>no se guarda</strong>: lo que marques se reinicia al recargar. Iniciá sesión desde <a href="#/perfil">Perfil</a> para guardar tu avance.</div>`;
}

// ---------- Checklist de aprobadas (semestres plegables; buscar los abre) ----------
function checklist(materias, avance, ui) {
  const q = norm(avance.busqueda);
  const filtradas = materias.filter((m) => !q || norm(m.codigo).includes(q) || norm(m.nombre).includes(q));
  const grupos = agruparPorNivel(filtradas);
  const lista = grupos.length
    ? grupos.map(([nivel, ms]) => {
        const marcadas = ms.filter((m) => avance.aprobadas.has(m.codigo)).length;
        return plegable({
          clave: `avch:${nivel}`, ui, fijarAbierto: Boolean(q), clase: "ar-nivel",
          resumen: `<span class="ar-nivel-t">${esc(NOMBRE_NIVEL[nivel])}</span>
            ${marcadas ? `<span class="ar-nivel-c">${marcadas}/${ms.length} ✓</span>` : ""}`,
          contenido: ms.map((m) => {
            const on = avance.aprobadas.has(m.codigo);
            return `<label class="ar-item${on ? " on" : ""}">
              <input type="checkbox" class="av-check" data-codigo="${esc(m.codigo)}"${on ? " checked" : ""}>
              <code>${esc(m.codigo)}</code> ${esc(m.nombre)}</label>`;
          }).join(""),
        });
      }).join("")
    : `<p class="rel-vacio">Sin materias que coincidan.</p>`;
  return `
    <div class="ar-selector">
      <input type="search" id="av-busqueda" placeholder="Buscar materia…" value="${esc(avance.busqueda)}" aria-label="Buscar materia">
      <div class="ar-checklist">${lista}</div>
    </div>`;
}

function chipMateria(m) {
  return `<a class="chip" href="#/materia/${esc(m.codigo)}"><code>${esc(m.codigo)}</code> ${esc(m.nombre)}</a>`;
}

/** Tarjeta chica de materia recomendada (código + nivel + nombre). */
function cardMateria(m) {
  return `<a class="reco-card" href="#/materia/${esc(m.codigo)}">
    <span class="reco-cod"><code>${esc(m.codigo)}</code><span class="badge nivel">${esc(m.nivel)}</span></span>
    <span class="reco-nom">${esc(m.nombre)}</span>
  </a>`;
}

// ---------- Bloque: recomendadas (tope + sin choques) + botón "armar" ----------
function bloqueRecomendadas(plan) {
  const { sugeridas, tambien } = plan;
  const chocan = plan.chocan ?? [];
  if (!sugeridas.length)
    return `<p class="rel-vacio">Marcá lo que aprobaste para ver qué podés cursar el próximo semestre.</p>`;
  const codigos = sugeridas.map((m) => m.codigo).join(",");
  const choque = chocan.length
    ? `<p class="av-choca">⚠ No entran <strong>sin choque</strong> con las 6 de arriba: ${esc(chocan.map((m) => m.nombre).join(", "))}.
        Podés cursarlas igual fijando otro grupo en el armador, o dejarlas para otro momento.</p>`
    : "";
  const otras = [...chocan, ...tambien]; // todo lo demás que podés tomar este semestre
  const extra = otras.length
    ? `<div class="av-otras">
        <p class="av-otras-t">Otras que también podés tomar este semestre:</p>
        <div class="chips">${otras.map(chipMateria).join("")}</div>
      </div>`
    : "";
  return `
    <p class="av-tope">Hasta ${MATERIAS_POR_SEMESTRE} por semestre, <strong>sin choques</strong> · priorizamos los niveles más bajos.</p>
    <div class="reco-grid">${sugeridas.map(cardMateria).join("")}</div>
    <button id="av-armar" type="button" class="av-armar" data-codigos="${esc(codigos)}">
      Armar horario con estas ${sugeridas.length} →</button>
    ${choque}
    ${extra}`;
}

// ---------- Bloque: desbloqueadas pero no ofertadas (plegable, discreto) ----------
function bloqueNoOfertadas(noOf, ui) {
  if (!noOf.length) return "";
  return plegable({
    clave: "av:noof", ui, clase: "av-bloque av-noof",
    resumen: `<h2>Desbloqueadas, pero no se abren esta gestión <span class="ar-nivel-c">${noOf.length}</span></h2>`,
    contenido: `<div class="chips">${noOf.map(chipMateria).join("")}</div>
      <p class="av-nota">Las podés cursar (tenés las previas), pero <strong>no se abren en 1/2026</strong>.</p>`,
  });
}

// ---------- Resumen de progreso (anillo + barras), arriba de todo ----------
function barra(etq, aprob, total) {
  const pct = total ? Math.round((Math.min(aprob, total) / total) * 100) : 0;
  return `
    <div class="av-bar-row">
      <span class="av-bar-etq">${etq}</span>
      <span class="av-bar"><span class="av-bar-fill" style="width:${pct}%"></span></span>
      <span class="av-bar-num">${aprob}/${total}</span>
    </div>`;
}

function resumenProgreso(prog) {
  return `
  <section class="avz">
    <div class="pc-ring">
      ${anilloProgreso(prog.porcentaje)}
      <span class="pc-ring-t">hacia el egreso</span>
    </div>
    <div class="avz-barras">
      ${barra("Obligatorias", prog.obligatorias.aprobadas, prog.obligatorias.total)}
      ${barra("Electivas", prog.electivas.aprobadas, prog.electivas.requeridas)}
      ${prog.egresable ? `<p class="av-egreso-ok">✓ Cumplís los requisitos de egreso.</p>` : ""}
      <p class="av-regla">Egreso: todas las obligatorias + ${prog.electivas.requeridas} electivas
        (de 12). <em>Regla 6/12 a confirmar contra reglamento.</em></p>
    </div>
  </section>`;
}

// ---------- Roadmap "después", por semestre (plegable) ----------
function roadmapSeccion(ra, porCodigo, ui) {
  if (!ra.despues.length)
    return `<p class="rel-vacio">No queda nada por delante con lo marcado. 🎓</p>`;
  const grupos = agruparPorNivel(ra.despues);
  return grupos.map(([nivel, ms]) => {
    const listas = ms.filter((m) => (ra.faltan.get(m.codigo) ?? []).length === 0).length;
    return plegable({
      clave: `rm:${nivel}`, ui, clase: "av-rm-nivel",
      resumen: `<h3 class="av-rm-titulo">${esc(NOMBRE_NIVEL[nivel])}</h3>
        <span class="av-rm-c">${ms.length} pendiente${ms.length === 1 ? "" : "s"}${listas ? ` · ${listas} lista${listas === 1 ? "" : "s"}` : ""}</span>`,
      contenido: `<ul class="av-rm-lista">${ms.map((m) => {
        const f = ra.faltan.get(m.codigo) ?? [];
        const falta = f.length
          ? `<span class="av-falta">falta: ${esc(f.map((c) => porCodigo.get(c)?.nombre ?? c).join(", "))}</span>`
          : `<span class="av-listo">lista para cursar</span>`;
        return `<li><a href="#/materia/${esc(m.codigo)}"><code>${esc(m.codigo)}</code> ${esc(m.nombre)}</a> ${falta}</li>`;
      }).join("")}</ul>`,
    });
  }).join("");
}

// ---------- Vista ----------
export function renderAvance(dataset, avance, sesion, indice, ui) {
  const M = dataset.materias;
  const porCodigo = indexar(M);
  const ap = avance.aprobadas;
  // Con índice de slots: recomendación SIN choques. Sin él: solo por nivel (fallback).
  const plan = indice ? planSemestreSinChoques(M, ap, indice) : planSemestre(M, ap);
  const noOf = habilitadasNoOfertadas(M, ap);
  const prog = progresoEgreso(M, ap, ELECTIVAS_PARA_EGRESO);
  const ra = roadmapAvance(M, ap);

  return `
  <header class="seccion-h">
    <h1>Mi avance</h1>
    <p class="sub">Marcá las materias que aprobaste y te muestro qué cursar, qué te falta y tu progreso a egreso.</p>
  </header>
  ${resumenProgreso(prog)}
  <div class="avance">
    <section class="av-col av-izq">
      <h2 class="ar-h">Aprobadas <span class="ar-n">${ap.size}</span>
        ${ap.size ? `<button id="av-limpiar" class="btn-link">limpiar</button>` : ""}</h2>
      ${avisoSesion(sesion)}
      ${avance.error ? `<p class="av-error">${esc(avance.error)}</p>` : ""}
      ${checklist(M, avance, ui)}
    </section>
    <section class="av-col av-der">
      <div class="av-bloque destacado">
        <h2>Recomendado para el próximo semestre</h2>
        ${bloqueRecomendadas(plan)}
      </div>
      <div class="av-bloque">
        <h2>Roadmap — lo que viene <span class="av-puede-cambiar">la oferta futura puede cambiar</span></h2>
        ${roadmapSeccion(ra, porCodigo, ui)}
      </div>
      ${bloqueNoOfertadas(noOf, ui)}
    </section>
  </div>`;
}
