// avance.js — vista "Mi avance": marcar aprobadas (en sesión) y ver recomendación
// del próximo semestre, desbloqueadas no ofertadas, progreso de egreso y roadmap.

import { agruparPorNivel } from "../data/filtros.js";
import {
  indexar, recomendadas, habilitadasNoOfertadas, progresoEgreso,
  roadmapAvance, ELECTIVAS_PARA_EGRESO,
} from "../data/prerequisitos.js";
import { esc, NOMBRE_NIVEL } from "./comunes.js";

const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function avisoSesion(sesion) {
  return sesion?.usuario
    ? `<div class="av-aviso ok">✓ Tus materias aprobadas <strong>se guardan en tu cuenta</strong>.</div>`
    : `<div class="av-aviso">⚠ Esto <strong>no se guarda</strong>: lo que marques se reinicia al recargar. Iniciá sesión para guardar tu avance.</div>`;
}

// ---------- Checklist de aprobadas (las 54, por nivel) ----------
function checklist(materias, avance) {
  const q = norm(avance.busqueda);
  const filtradas = materias.filter((m) => !q || norm(m.codigo).includes(q) || norm(m.nombre).includes(q));
  const grupos = agruparPorNivel(filtradas);
  const lista = grupos.length
    ? grupos.map(([nivel, ms]) => `
        <div class="ar-nivel"><span class="ar-nivel-t">${esc(NOMBRE_NIVEL[nivel])}</span>
          ${ms.map((m) => {
            const on = avance.aprobadas.has(m.codigo);
            return `<label class="ar-item${on ? " on" : ""}">
              <input type="checkbox" class="av-check" data-codigo="${esc(m.codigo)}"${on ? " checked" : ""}>
              <code>${esc(m.codigo)}</code> ${esc(m.nombre)}</label>`;
          }).join("")}
        </div>`).join("")
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

// ---------- Bloque: recomendadas + botón "armar" ----------
function bloqueRecomendadas(rec) {
  if (!rec.length)
    return `<p class="rel-vacio">Marcá lo que aprobaste para ver qué podés cursar el próximo semestre.</p>`;
  const codigos = rec.map((m) => m.codigo).join(",");
  return `
    <div class="chips">${rec.map(chipMateria).join("")}</div>
    <button id="av-armar" type="button" class="av-armar" data-codigos="${esc(codigos)}">
      Armar horario con estas ${rec.length} →</button>`;
}

// ---------- Bloque: desbloqueadas pero no ofertadas ----------
function bloqueNoOfertadas(noOf) {
  if (!noOf.length) return `<p class="rel-vacio">Ninguna por ahora.</p>`;
  return `<div class="chips">${noOf.map(chipMateria).join("")}</div>
    <p class="av-nota">Las podés cursar (tenés las previas), pero <strong>no se abren en 1/2026</strong>.</p>`;
}

// ---------- Bloque: progreso de egreso ----------
function barra(etq, aprob, total) {
  const pct = total ? Math.round((Math.min(aprob, total) / total) * 100) : 0;
  return `
    <div class="av-bar-row">
      <span class="av-bar-etq">${etq}</span>
      <span class="av-bar"><span class="av-bar-fill" style="width:${pct}%"></span></span>
      <span class="av-bar-num">${aprob}/${total}</span>
    </div>`;
}

function bloqueProgreso(prog) {
  return `
    <div class="av-pct">${prog.porcentaje}% hacia el egreso</div>
    ${barra("Obligatorias", prog.obligatorias.aprobadas, prog.obligatorias.total)}
    ${barra("Electivas", prog.electivas.aprobadas, prog.electivas.requeridas)}
    ${prog.egresable ? `<p class="av-egreso-ok">✓ Cumplís los requisitos de egreso.</p>` : ""}
    <p class="av-regla">Regla de egreso: todas las obligatorias + ${prog.electivas.requeridas} electivas
      (${prog.electivas.requeridas} de 12). <em>Regla 6/12 a confirmar contra reglamento.</em></p>`;
}

// ---------- Roadmap "después", agrupado por nivel ----------
function roadmapSeccion(ra, porCodigo) {
  if (!ra.despues.length)
    return `<p class="rel-vacio">No queda nada por delante con lo marcado. 🎓</p>`;
  const grupos = agruparPorNivel(ra.despues);
  return grupos.map(([nivel, ms]) => `
    <div class="av-rm-nivel">
      <h3 class="av-rm-titulo">${esc(NOMBRE_NIVEL[nivel])}</h3>
      <ul class="av-rm-lista">${ms.map((m) => {
        const f = ra.faltan.get(m.codigo) ?? [];
        const falta = f.length
          ? `<span class="av-falta">falta: ${esc(f.map((c) => porCodigo.get(c)?.nombre ?? c).join(", "))}</span>`
          : `<span class="av-listo">lista para cursar</span>`;
        return `<li><a href="#/materia/${esc(m.codigo)}"><code>${esc(m.codigo)}</code> ${esc(m.nombre)}</a> ${falta}</li>`;
      }).join("")}</ul>
    </div>`).join("");
}

// ---------- Vista ----------
export function renderAvance(dataset, avance, sesion) {
  const M = dataset.materias;
  const porCodigo = indexar(M);
  const ap = avance.aprobadas;
  const rec = recomendadas(M, ap);
  const noOf = habilitadasNoOfertadas(M, ap);
  const prog = progresoEgreso(M, ap, ELECTIVAS_PARA_EGRESO);
  const ra = roadmapAvance(M, ap);

  return `
  <header class="seccion-h">
    <h1>Mi avance</h1>
    <p class="sub">Marcá las materias que aprobaste y te muestro qué cursar, qué te falta y tu progreso a egreso.</p>
  </header>
  ${avisoSesion(sesion)}
  <div class="avance">
    <section class="av-col av-izq">
      <h2 class="ar-h">Aprobadas <span class="ar-n">${ap.size}</span>
        ${ap.size ? `<button id="av-limpiar" class="btn-link">limpiar</button>` : ""}</h2>
      ${avisoSesion(sesion)}
      ${avance.error ? `<p class="av-error">${esc(avance.error)}</p>` : ""}
      ${checklist(M, avance)}
    </section>
    <section class="av-col av-der">
      <div class="av-bloque">
        <h2>Recomendado para el próximo semestre</h2>
        ${bloqueRecomendadas(rec)}
      </div>
      <div class="av-bloque">
        <h2>Desbloqueadas, pero no se abren esta gestión</h2>
        ${bloqueNoOfertadas(noOf)}
      </div>
      <div class="av-bloque">
        <h2>Mi progreso a egreso</h2>
        ${bloqueProgreso(prog)}
      </div>
      <div class="av-bloque">
        <h2>Roadmap — lo que viene <span class="av-puede-cambiar">la oferta futura puede cambiar</span></h2>
        ${roadmapSeccion(ra, porCodigo)}
      </div>
    </section>
  </div>`;
}
