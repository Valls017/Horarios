-- ============================================================================
-- Esquema + RLS — Plataforma de Horarios y Reseñas (Ing. Informática UMSS)
-- Backend: Supabase (PostgreSQL + Auth + Row Level Security).
--
-- CÓMO CORRER: Supabase → SQL Editor → pegar y ejecutar.
-- Dominio institucional para reseñar: est.umss.edu (confirmado, SIN .bo).
--
-- Decisiones aplicadas (ver CLAUDE.md):
--   D2  reseña atada a (docente_id, materia_codigo); 1 por usuario por par.
--   D3  navegar = libre; calificar/guardar = cuenta.
--   D5  reseña anónima hacia otros; UNA estrella global (1–5) + comentario.
--   D7  reseñar solo con correo institucional UMSS (se exige en RLS).
-- docente_id = slug estable del nombre (ver src/data/docentes.js), NO el texto.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

-- Reseñas: una calificación global por (usuario, docente, materia).
create table if not exists public.resenas (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  docente_id     text not null,                                   -- slug (ej. "aparicio-yuja-tatiana")
  materia_codigo text not null check (materia_codigo ~ '^[0-9]{7}$'),
  calificacion   smallint not null check (calificacion between 1 and 5),
  comentario     text check (char_length(comentario) <= 2000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, docente_id, materia_codigo)                    -- D2: 1 por usuario por par
);

-- Horarios guardados por el usuario (la forma de `datos` la define el frontend).
create table if not exists public.horarios_guardados (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  nombre     text not null default 'Mi horario',
  datos      jsonb not null,
  created_at timestamptz not null default now()
);

-- Materias aprobadas por el usuario (reemplaza el modo "en sesión").
create table if not exists public.aprobadas (
  user_id        uuid not null references auth.users(id) on delete cascade,
  materia_codigo text not null check (materia_codigo ~ '^[0-9]{7}$'),
  created_at     timestamptz not null default now(),
  primary key (user_id, materia_codigo)
);

-- ---------------------------------------------------------------------------
-- updated_at automático en resenas
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_resenas_updated on public.resenas;
create trigger trg_resenas_updated before update on public.resenas
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Vistas públicas (ANONIMATO D5: nunca exponen user_id).
-- Corren con permisos del owner (bypassean RLS de la tabla base), pero solo
-- seleccionan columnas no-identificatorias. La tabla base queda owner-only.
-- ---------------------------------------------------------------------------
create or replace view public.resenas_publicas as
  select id, docente_id, materia_codigo, calificacion, comentario, created_at
  from public.resenas;

create or replace view public.resenas_resumen as
  select docente_id, materia_codigo,
         round(avg(calificacion)::numeric, 2) as promedio,
         count(*)::int as cantidad
  from public.resenas
  group by docente_id, materia_codigo;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.resenas             enable row level security;
alter table public.horarios_guardados  enable row level security;
alter table public.aprobadas           enable row level security;

-- resenas: por la tabla base solo ves/editás las TUYAS (las ajenas se leen por
-- la vista pública, sin autor). Insertar exige correo institucional (D7).
drop policy if exists "resenas_select_propias" on public.resenas;
create policy "resenas_select_propias" on public.resenas
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "resenas_insert_institucional" on public.resenas;
create policy "resenas_insert_institucional" on public.resenas
  for insert to authenticated
  with check (
    user_id = auth.uid()
    -- Dominio institucional confirmado: est.umss.edu (sin .bo).
    and lower(auth.jwt() ->> 'email') like '%@est.umss.edu'
  );

drop policy if exists "resenas_update_propias" on public.resenas;
create policy "resenas_update_propias" on public.resenas
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "resenas_delete_propias" on public.resenas;
create policy "resenas_delete_propias" on public.resenas
  for delete to authenticated using (user_id = auth.uid());

-- horarios guardados y aprobadas: solo el dueño, en todas las operaciones.
drop policy if exists "horarios_dueno" on public.horarios_guardados;
create policy "horarios_dueno" on public.horarios_guardados
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "aprobadas_dueno" on public.aprobadas;
create policy "aprobadas_dueno" on public.aprobadas
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Permisos de lectura pública de las vistas (ver reseñas SIN cuenta = D3).
-- ---------------------------------------------------------------------------
grant select on public.resenas_publicas to anon, authenticated;
grant select on public.resenas_resumen  to anon, authenticated;

-- ============================================================================
-- NOTAS
-- - Restringir el REGISTRO al dominio institucional (no solo el insert de
--   reseñas) se hace aparte con un Auth Hook / función; la garantía dura de
--   "solo institucional puede reseñar" ya está en la policy de arriba.
-- - Confirmaciones de email, plantillas y proveedor se configuran en
--   Supabase → Authentication (no en este SQL).
-- ============================================================================
