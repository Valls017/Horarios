// auth.js (render) — tarjeta para ENTRAR o crear cuenta (vista Perfil, sin sesión).
// Con sesión, los controles de cuenta viven en el hero del Perfil ("Salir").

import { esc } from "./comunes.js";

/** Formulario de entrar/crear cuenta (solo tiene sentido sin sesión). */
export function renderCuenta(sesion) {
  if (sesion.usuario) return "";
  const err = sesion.error ? `<p class="auth-err">${esc(sesion.error)}</p>` : "";
  const dis = sesion.cargando ? " disabled" : "";
  return `
    <div class="cuenta-card">
      <h2 class="cuenta-t">Entrar o crear cuenta</h2>
      <form id="auth-form" class="cuenta-form" autocomplete="on">
        <input type="email" id="auth-email" placeholder="correo" aria-label="Correo" required${dis} autocomplete="username" value="${esc(sesion.emailDraft ?? "")}">
        <input type="password" id="auth-pass" placeholder="contraseña (mín. 6)" aria-label="Contraseña" required minlength="6"${dis} autocomplete="current-password">
        ${err}
        <div class="auth-acciones">
          <button type="submit" id="auth-entrar"${dis}>${sesion.cargando ? "…" : "Entrar"}</button>
          <button type="button" id="auth-registrar" class="btn-link"${dis}>Crear cuenta</button>
        </div>
      </form>
      <p class="auth-nota">Navegar es libre; la cuenta sirve para <strong>guardar horarios</strong> y
        <strong>reseñar docentes</strong> (reseñar pide correo <code>@est.umss.edu</code>).</p>
    </div>`;
}
