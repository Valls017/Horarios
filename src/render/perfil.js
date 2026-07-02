// perfil.js — pestaña Perfil: hero con avatar (y "Salir" discreto), tarjeta
// "Tu carrera" (anillo de progreso + números + acceso a Mi avance), horarios
// guardados plegables y el form de cuenta solo cuando NO hay sesión.

import { esc, plegable, anilloProgreso } from "./comunes.js";
import { renderCuenta } from "./auth.js";
import { listaGuardados } from "./armador.js";
import { progresoEgreso, ELECTIVAS_PARA_EGRESO } from "../data/prerequisitos.js";

const ICONO_USUARIO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

const ICONO_GUARDADOS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;

function hero(sesion) {
  if (sesion.usuario) {
    const email = sesion.usuario.email;
    return `
      <div class="perfil-hero">
        <span class="perfil-hero-avatar">${esc(email[0].toUpperCase())}</span>
        <div class="perfil-hero-txt">
          <h1>¡Hola! 👋</h1>
          <p class="perfil-hero-email" title="${esc(email)}">${esc(email)}</p>
        </div>
        <button id="auth-salir" class="btn-auth perfil-salir">Salir</button>
      </div>`;
  }
  return `
    <div class="perfil-hero">
      <span class="perfil-hero-avatar anon">${ICONO_USUARIO}</span>
      <div class="perfil-hero-txt">
        <h1>Tu perfil</h1>
        <p class="perfil-hero-email">Entrá para guardar tu draft entre dispositivos.</p>
      </div>
    </div>`;
}

/** Tarjeta "Tu carrera": anillo de egreso + números clave + botón a Mi avance. */
function carrera(dataset, avance, armador, sesion) {
  const ap = avance?.aprobadas ?? new Set();
  const prog = progresoEgreso(dataset.materias, ap, ELECTIVAS_PARA_EGRESO);
  const guardados = sesion.usuario ? (armador?.guardados?.length ?? 0) : "—";
  const pie = ap.size
    ? `Obligatorias ${prog.obligatorias.aprobadas}/${prog.obligatorias.total} · electivas ${prog.electivas.aprobadas}/${prog.electivas.requeridas}.`
    : `Todavía no marcaste materias aprobadas.`;
  return `
    <section class="perfil-carrera">
      <div class="pc-ring">
        ${anilloProgreso(prog.porcentaje)}
        <span class="pc-ring-t">hacia el egreso</span>
      </div>
      <div class="pc-datos">
        <div class="perfil-stats">
          <div class="stat"><span class="stat-n">${ap.size}</span><span class="stat-t">aprobadas</span></div>
          <div class="stat"><span class="stat-n">${prog.electivas.aprobadas}/${prog.electivas.requeridas}</span><span class="stat-t">electivas</span></div>
          <div class="stat"><span class="stat-n">${guardados}</span><span class="stat-t">guardados</span></div>
        </div>
        <p class="pc-nota">${pie}</p>
        <a class="pc-btn" href="#/avance">Mi avance — qué cursar y roadmap →</a>
      </div>
    </section>`;
}

/** Horarios guardados como fila plegable (solo con sesión). */
function filaGuardados(armador, ui) {
  const n = armador?.guardados?.length ?? 0;
  return plegable({
    clave: "pf:guardados", ui, clase: "pm-plegable",
    resumen: `<span class="pm-icono">${ICONO_GUARDADOS}</span>
      <span class="pm-txt"><strong>Mis horarios guardados</strong>
      <span class="pm-sub">${n ? `${n} guardado${n === 1 ? "" : "s"}` : "todavía ninguno"}</span></span>`,
    contenido: `<div class="pm-contenido">${listaGuardados(armador)}</div>`,
  });
}

/** Vista Perfil (#/perfil). */
export function renderPerfil(dataset, sesion, armador, avance, ui) {
  return `
  <div class="perfil">
    ${hero(sesion)}
    ${carrera(dataset, avance, armador, sesion)}
    ${sesion.usuario ? filaGuardados(armador, ui) : renderCuenta(sesion)}
    <div class="perfil-pie">
      <p>Gestión 1/2026 · plan 134111 · datos de fuentes oficiales (CPD-FCyT / webSISS).</p>
      <p>Los horarios pueden cambiar. Semester Draft no es un canal oficial de la UMSS.</p>
    </div>
  </div>`;
}
