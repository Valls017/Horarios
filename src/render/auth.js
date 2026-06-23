// auth.js (render) — widget de sesión en la barra superior.
// Muestra "Entrar" (con panel de login/registro) o el email + "Salir".

import { esc } from "./comunes.js";

function panel(sesion) {
  if (!sesion.panelAbierto) return "";
  const err = sesion.error ? `<p class="auth-err">${esc(sesion.error)}</p>` : "";
  const dis = sesion.cargando ? " disabled" : "";
  return `
    <form id="auth-form" class="auth-panel" autocomplete="on">
      <input type="email" id="auth-email" placeholder="correo" required${dis} autocomplete="username" value="${esc(sesion.emailDraft ?? "")}">
      <input type="password" id="auth-pass" placeholder="contraseña" required minlength="6"${dis} autocomplete="current-password">
      ${err}
      <div class="auth-acciones">
        <button type="submit" id="auth-entrar"${dis}>${sesion.cargando ? "…" : "Entrar"}</button>
        <button type="button" id="auth-registrar" class="btn-link"${dis}>Crear cuenta</button>
      </div>
      <p class="auth-nota">Navegar es libre; la cuenta sirve para guardar y reseñar.</p>
    </form>`;
}

/** HTML del widget de sesión. */
export function renderAuth(sesion) {
  if (sesion.usuario) {
    return `
      <div class="auth">
        <span class="auth-email" title="${esc(sesion.usuario.email)}">${esc(sesion.usuario.email)}</span>
        <button id="auth-salir" class="btn-auth">Salir</button>
      </div>`;
  }
  return `
    <div class="auth${sesion.panelAbierto ? " abierto" : ""}">
      <button id="auth-toggle" class="btn-auth">${sesion.panelAbierto ? "Cerrar" : "Entrar"}</button>
      ${panel(sesion)}
    </div>`;
}
