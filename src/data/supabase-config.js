// supabase-config.js — configuración del backend.
//
// La anon key es PÚBLICA por diseño: va en el frontend y la protege RLS.
// (La service_role secreta NUNCA va acá ni a git.)

export const SUPABASE_URL = "https://vrsxphssqbavdnpcrkyp.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyc3hwaHNzcWJhdmRucGNya3lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNzkyMzgsImV4cCI6MjA5Nzc1NTIzOH0.2zvSvqCCpOBVbJbSsRJ8_N5TeiI3tvt1HL8OL53DPtU";

// Dominio del correo institucional habilitado para RESEÑAR (D7). Confirmado: SIN .bo.
// Debe coincidir con supabase/schema.sql (policy resenas_insert_institucional).
export const DOMINIO_INSTITUCIONAL = "est.umss.edu";
