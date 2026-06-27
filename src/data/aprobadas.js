// aprobadas.js — persistencia de materias aprobadas (tabla `aprobadas`, RLS dueño).

import { getSupabase } from "./supabase.js";

/** Códigos de materias aprobadas del usuario actual. */
export async function cargarAprobadas() {
  const sb = await getSupabase();
  const { data, error } = await sb.from("aprobadas").select("materia_codigo");
  if (error) throw error;
  return (data ?? []).map((r) => r.materia_codigo);
}

export async function marcarAprobada(codigo) {
  const sb = await getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Sin sesión");
  const { error } = await sb.from("aprobadas").upsert({ user_id: user.id, materia_codigo: codigo });
  if (error) throw error;
}

export async function desmarcarAprobada(codigo) {
  const sb = await getSupabase();
  const { error } = await sb.from("aprobadas").delete().eq("materia_codigo", codigo);
  if (error) throw error;
}

/** Borra TODAS las aprobadas del usuario (para "limpiar"). */
export async function limpiarAprobadasDB() {
  const sb = await getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  const { error } = await sb.from("aprobadas").delete().eq("user_id", user.id);
  if (error) throw error;
}
