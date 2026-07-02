-- ============================================================================
-- Siembra de reseñas recolectadas offline (fuente: data/resenas-recolectadas.json)
-- Estudiante de 5to semestre, recolectadas por el fundador (2026-07-01).
--
-- CÓMO CORRER (2 pasos):
--   1) Supabase → Authentication → Users → "Add user":
--        email = el correo del estudiante que dio las reseñas (ideal) o una
--        cuenta semilla; marcar "Auto Confirm User".
--   2) Reemplazar EMAIL_SEMILLA abajo y ejecutar en SQL Editor.
--
-- Notas:
--   - El SQL Editor corre como owner (salta RLS): siembra controlada, una vez.
--   - La calificación de la app es ENTERA (1–5): los medios puntos se
--     redondearon al entero más cercano; el valor original va en comentario.
--   - Idempotente: re-ejecutar actualiza en vez de duplicar (D2: 1 por par).
--   - Anonimato (D5): las vistas públicas nunca exponen quién reseñó.
-- ============================================================================

do $$
declare
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower('EMAIL_SEMILLA');
  if uid is null then
    raise exception 'No existe el usuario EMAIL_SEMILLA en auth.users. Crealo primero (paso 1).';
  end if;

  insert into public.resenas (user_id, docente_id, materia_codigo, calificacion, comentario) values
    -- Semestre 1
    (uid, 'carrasco-calvo-alvaro-hernando', '2008019', 4, null),
    (uid, 'costas-jauregui-vladimir-abel',  '2010010', 4, 'Sus exámenes no son de su materia tal cual, pero da harta tarea.'),
    (uid, 'cespedes-guizada-maria-benita',  '1803001', 4, null),
    -- Semestre 2
    (uid, 'terrazas-lobo-juan',             '2008056', 3, 'Sus clases son aburridas.'),
    (uid, 'omonte-ojalvo-jose-roberto',     '2008022', 3, 'Clases aburridas.'),                       -- original 2.5 · VERIFICAR: mencionó también a Medina
    (uid, 'blanco-coca-leticia',            '2010003', 4, 'Aburre, vas sin ganas; el aula es muy mala.'), -- original 3.5
    (uid, 'peeters-ilonaa-magda-lena',      '1803002', 4, 'Da material para estudiar.'),
    (uid, 'acha-perez-samuel',              '2010013', 4, null),
    -- Semestre 3
    (uid, 'juchani-bazualdo-demetrio',      '2008060', 3, 'Clases aburridas, pero aprobable.'),        -- original 2.5
    (uid, 'manzur-soria-carlos-b',          '2010206', 5, 'El horario es malísimo.'),                  -- original 4.5
    -- Semestre 4
    (uid, 'omonte-ojalvo-jose-roberto',     '2008029', 3, 'Aburrido, pero más fácil de entender.'),
    (uid, 'aparicio-yuja-tatiana',          '2010015', 4, 'Si estudiás, aprobás.'),
    (uid, 'salazar-serrudo-carla',          '2010018', 3, 'Hay que estudiarle de forma especial.'),
    -- Semestre 5
    (uid, 'aparicio-yuja-tatiana',          '2010016', 4, 'Estudiá y aprobás.'),
    (uid, 'jaldin-rosales-k-rolando',       '2010022', 4, 'Estudiás, hacés el proyecto y aprobás normal.'),
    (uid, 'calancha-navia-boris',           '2010053', 4, 'Te da oportunidades.')                      -- VERIFICAR: dijo "Boris-Tania" (g4)
  on conflict (user_id, docente_id, materia_codigo)
  do update set calificacion = excluded.calificacion,
                comentario   = excluded.comentario;

  raise notice 'Reseñas sembradas para %', uid;
end $$;

-- ----------------------------------------------------------------------------
-- NO sembradas (sin docente identificable o sin estrellas) — quedan en el JSON:
--   2008054 Cálculo I        · "Roxana" no está en la oferta 1/2026        · 4.5
--   2010200 Programación     · no nombró docente                           · 3
--   2008140 Lógica           · no nombró docente                           · 3
--   2010014 Arqui de Comp. II· no nombró docente ("pay to win")            · 5
--   2010037 Teoría de Grafos · no nombró docente                           · 4
--   2010038 Prog. Funcional  · no nombró docente                           · 4
--   2010005 Taller Bajo Nivel· era "por designar"                          · 2.5
--   2010040 Autómatas        · no nombró docente                           · 3.5
--   2010017 Taller de S.O.   · Montoya (gestión pasada) SIN estrellas      · —
-- ----------------------------------------------------------------------------
