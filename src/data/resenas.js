// resenas.js — acceso a reseñas en Supabase.
// Ver es público (vistas resenas_publicas / resenas_resumen, anónimas).
// Calificar requiere cuenta (RLS exige correo institucional). docente_id = slug.

import { getSupabase } from "./supabase.js";

/** Resumen de TODAS las reseñas (para rankear por "mejor calificados"). */
export async function resumenTodos() {
  const sb = await getSupabase();
  const { data, error } = await sb
    .from("resenas_resumen")
    .select("docente_id, materia_codigo, promedio, cantidad");
  if (error) throw error;
  return data ?? [];
}

/** Resumen (promedio, cantidad) de todos los docentes de una materia. */
export async function resumenMateria(materiaCodigo) {
  const sb = await getSupabase();
  const { data, error } = await sb
    .from("resenas_resumen")
    .select("docente_id, promedio, cantidad")
    .eq("materia_codigo", materiaCodigo);
  if (error) throw error;
  return data ?? [];
}

/** Reseñas públicas (anónimas) de un (docente, materia), más recientes primero. */
export async function resenasDe(docenteId, materiaCodigo) {
  const sb = await getSupabase();
  const { data, error } = await sb
    .from("resenas_publicas")
    .select("id, calificacion, comentario, created_at")
    .eq("docente_id", docenteId)
    .eq("materia_codigo", materiaCodigo)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Mi reseña para ese par (o null). Requiere sesión. */
export async function miResena(docenteId, materiaCodigo) {
  const sb = await getSupabase();
  const { data, error } = await sb
    .from("resenas")
    .select("id, calificacion, comentario")
    .eq("docente_id", docenteId)
    .eq("materia_codigo", materiaCodigo)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** Crea o actualiza mi reseña (1 por usuario por par). */
export async function guardarResena(docenteId, materiaCodigo, calificacion, comentario) {
  const sb = await getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Necesitás iniciar sesión.");
  const fila = {
    user_id: user.id,
    docente_id: docenteId,
    materia_codigo: materiaCodigo,
    calificacion,
    comentario: comentario?.trim() ? comentario.trim() : null,
  };
  const { error } = await sb
    .from("resenas")
    .upsert(fila, { onConflict: "user_id,docente_id,materia_codigo" });
  if (error) throw error;
}
