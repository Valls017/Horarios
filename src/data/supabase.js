// supabase.js — cliente Supabase cargado PEREZOSAMENTE por CDN ESM (sin build).
// La importación del CDN ocurre solo cuando se usa auth/reseñas, así el catálogo
// y el armador siguen funcionando aunque el CDN no esté disponible.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const CDN = "https://esm.sh/@supabase/supabase-js@2";

let _clientePromise = null;

/** Devuelve el cliente Supabase (importa el SDK del CDN la primera vez). */
export function getSupabase() {
  if (!_clientePromise) {
    _clientePromise = import(/* @vite-ignore */ CDN).then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    );
  }
  return _clientePromise;
}
