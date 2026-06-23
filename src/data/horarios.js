// horarios.js — persistencia de horarios guardados (tabla `horarios_guardados`).
// `datos` = { materias:[codigos], fijados:{codigo:grupoId} } — basta para
// reconstruir el horario exacto fijando grupos al regenerar.

import { getSupabase } from "./supabase.js";

export async function listarHorarios() {
  const sb = await getSupabase();
  const { data, error } = await sb
    .from("horarios_guardados")
    .select("id, nombre, datos, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function guardarHorario(nombre, datos) {
  const sb = await getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Sin sesión");
  const { error } = await sb
    .from("horarios_guardados")
    .insert({ user_id: user.id, nombre, datos });
  if (error) throw error;
}

export async function borrarHorario(id) {
  const sb = await getSupabase();
  const { error } = await sb.from("horarios_guardados").delete().eq("id", id);
  if (error) throw error;
}
