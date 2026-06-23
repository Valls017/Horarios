// auth.js — autenticación con Supabase (email + contraseña).
// D3: navegar = libre; calificar/guardar = cuenta. D7: reseñar requiere correo
// institucional (eso se exige en RLS y se previsualiza en la UI con esCorreoInstitucional).

import { getSupabase } from "./supabase.js";
import { DOMINIO_INSTITUCIONAL } from "./supabase-config.js";

/** ¿El email es del dominio institucional habilitado para reseñar? */
export function esCorreoInstitucional(email) {
  return typeof email === "string"
    && email.trim().toLowerCase().endsWith("@" + DOMINIO_INSTITUCIONAL.toLowerCase());
}

/** Crea una cuenta (cualquier email: guardar no exige institucional; reseñar sí). */
export async function registrar(email, password) {
  const sb = await getSupabase();
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function entrar(email, password) {
  const sb = await getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function salir() {
  const sb = await getSupabase();
  const { error } = await sb.auth.signOut();
  if (error) throw error;
}

/** Usuario de la sesión actual, o null. */
export async function sesionActual() {
  const sb = await getSupabase();
  const { data } = await sb.auth.getSession();
  return data.session?.user ?? null;
}

/** Suscribe a cambios de sesión; devuelve una función para darse de baja. */
export async function alCambiarSesion(cb) {
  const sb = await getSupabase();
  const { data } = sb.auth.onAuthStateChange((_evento, session) => cb(session?.user ?? null));
  return () => data.subscription.unsubscribe();
}
