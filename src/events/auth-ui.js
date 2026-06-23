// auth-ui.js — conecta el widget de sesión con auth.js y el estado.
// Lee los campos ANTES de re-renderizar para no perder lo tipeado al enviar.

import { entrar, registrar, salir } from "../data/auth.js";
import { setSesionUsuario, setSesionEstado, togglePanelAuth } from "../state/estado.js";

let conectado = false;

const usuarioDe = (data) => {
  const u = data?.user;
  return u ? { id: u.id, email: u.email } : null;
};

export function conectarAuth(raiz) {
  if (conectado) return;
  conectado = true;

  raiz.addEventListener("click", async (e) => {
    if (e.target.id === "auth-toggle") { togglePanelAuth(); return; }

    if (e.target.id === "auth-salir") {
      try { await salir(); } catch { /* ignora; igual limpiamos sesión */ }
      setSesionUsuario(null);
      return;
    }

    if (e.target.id === "auth-registrar") {
      e.preventDefault();
      const { email, pass, btn } = leerForm(raiz, "auth-registrar");
      if (!email || !pass) return;
      ocupar(btn);
      try {
        const data = await registrar(email, pass);
        if (data?.session) setSesionUsuario(usuarioDe(data));
        else setSesionEstado({ cargando: false, emailDraft: email,
          error: "Cuenta creada. Revisá tu correo para confirmar y luego entrá." });
      } catch (err) {
        setSesionEstado({ cargando: false, error: mensajeError(err), emailDraft: email });
      }
    }
  });

  raiz.addEventListener("submit", async (e) => {
    if (e.target.id !== "auth-form") return;
    e.preventDefault();
    const { email, pass, btn } = leerForm(raiz, "auth-entrar");
    if (!email || !pass) return;
    ocupar(btn);
    try {
      const data = await entrar(email, pass);
      setSesionUsuario(usuarioDe(data));
    } catch (err) {
      setSesionEstado({ cargando: false, error: mensajeError(err), emailDraft: email });
    }
  });
}

function leerForm(raiz, btnId) {
  return {
    email: raiz.querySelector("#auth-email")?.value.trim(),
    pass: raiz.querySelector("#auth-pass")?.value,
    btn: raiz.querySelector("#" + btnId),
  };
}

// Deshabilita el botón sin re-renderizar (no borra lo tipeado durante el envío).
function ocupar(btn) {
  if (btn) { btn.disabled = true; btn.textContent = "…"; }
}

function mensajeError(err) {
  const m = err?.message ?? "Error de autenticación.";
  if (/Invalid login credentials/i.test(m)) return "Correo o contraseña incorrectos.";
  if (/Email not confirmed/i.test(m)) return "Falta confirmar tu correo (revisá tu bandeja).";
  if (/already registered/i.test(m)) return "Ese correo ya tiene cuenta. Entrá en vez de crear.";
  return m;
}
