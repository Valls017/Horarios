# CLAUDE.md — Plataforma de Horarios y Reseñas (Ingeniería Informática, UMSS)

> Contexto del proyecto para Claude Code. **Léelo antes de cualquier tarea.**
> Fuente única de verdad de producto: el `.docx` de especificación + este archivo.
> Si una decisión cambia, se actualiza aquí primero.

## Qué es
App web (responsive) **solo** para estudiantes de Ing. Informática de la UMSS. Integra tres cosas que nadie junta hoy:
1. **Armador de horarios** sin choques — autogenera combinaciones, no es armado manual.
2. **Reseñas de docentes** por materia.
3. **Recomendación del siguiente semestre** + roadmap de carrera según prerrequisitos.

Diferenciador frente a SCESI (competidor): la integración de reseñas + recomendación. El armador solo no nos distingue.

## Alcance v1 (construir)
- Catálogo navegable (materias/grupos/docentes/horarios) **sin cuenta**.
- Autogenerador de horarios sin choques + filtros (turno, evitar 06:45, sin "por designar", mejor calificados).
- Reseñas de docentes (ver es público; calificar requiere cuenta).
- Recomendación del siguiente semestre + roadmap de materias hasta titulación.
- Guardar horario (requiere cuenta).
- Cierre de semestre: marcar materias aprobadas.

## Fuera de v1
- Horarios reales más allá del siguiente semestre (solo roadmap de materias).
- Integración con app de materiales de terceros; export Calendar/.ics; mapa de aulas; app nativa.

## Decisiones cerradas (no rediscutir sin motivo)
- **D1** Datos como configuración: horario y pensum se cargan desde JSON, NUNCA hardcodeados. Actualizar por gestión = editar datos, sin tocar lógica.
- **D2** Reseña atada a `(docente, materia)`, persistente entre gestiones (historial). 1 reseña por usuario por par.
- **D3** Auth: navegar = libre; calificar/guardar = cuenta obligatoria.
- **D4** Sin datos falsos en producción. Datos de muestra solo en dev y marcados como tales.
- **D5** Reseñas anónimas hacia otros usuarios; **calificación = una sola estrella global (1–5) + comentario** ✅ (DP-04 resuelto 2026-06-18; reemplaza los 4 ejes propuestos antes).
- **D6** Competimos con SCESI.
- **D7** Backend **Supabase** confirmado (2026-06-18). Auth: **email + contraseña**. Reseñar restringido a **correo institucional UMSS = `est.umss.edu`** (confirmado, sin `.bo`). Cliente Supabase cargado por **CDN ESM** (sin build).

## Stack (frontend y backend CONFIRMADOS)
- Frontend web: **Vanilla JS + módulos ES6** ✅ confirmado por el fundador (2026-06-14). Sin dependencias, sin build. NO MVC clásico.
- Catálogo: **JSON estático** servido al frontend (sin backend para horario/pensum).
- Backend (reseñas/cuentas): **Supabase** (PostgreSQL, Auth, RLS).
- Git + GitHub.
- Puedes empezar YA con la **capa de datos** (parsing + modelo), independiente del framework de UI. Confirma el framework antes de construir UI.

## Modelo de datos
Ver `modelo-datos-canonico.json` (esquema + 2 materias reales de ejemplo). Reglas clave:
- **Materia**: `codigo, nombre, nivel(A–I), tipo(regular|taller_titulacion), es_electiva, prerrequisitos[](AND), grupos[]`.
- **Grupo**: `id, rol(completo|teoria|laboratorio|practica), vinculo(agrupa teoria con sus laboratorios), docente(null="por designar"), bloques[]`.
- **Bloque**: `dia(LU..SA), inicio/fin "HH:MM", aula`. Un bloque tipo `"TP"` con el mismo `id` de grupo = parte del mismo grupo (no es elección aparte).
- **Selección válida**: materia sin `vinculo` → un grupo `rol=completo`. Materia con `vinculo` (ej. Física) → un `rol=teoria` + un `rol=laboratorio` del mismo `vinculo`.
- Formato de hora del PDF: `"945"`=09:45, `"645"`=06:45 (bloques de 90 min).

### Física General (2006063) — confirmado por el fundador
`B` = teoría. `B1..B6` = **laboratorio** (no práctica auxiliar). El estudiante toma teoría B + **un** laboratorio. Modelado con `rol="laboratorio"`, `vinculo="FIS-B"`.

## Prerrequisitos y egreso
- Una materia se habilita cuando **todas** sus previas están aprobadas (AND).
- Egreso: todas las obligatorias **+ 6 electivas**. (Sin reglas de área conocidas; verificar.)

### Grafo de prerrequisitos (plan 134111) — `codigo: [previas]`  (E = electiva)
```
1803001: []        2006063: []        2008019: []        2008054: []        2010010: []
1803002: [1803001]                    2008022: [2008019]                    2008056: [2008054]
2010003: [2010010]                    2010013: [2006063]                    2010200: [2010010]
2008060: [2008056]                    2008140: [2008022]                    2010014: [2010013]
2010037: [2010200]                    2010041: [1803002]                    2010206: [2010003]
2008029: [2008060]                    2010005: [2010014]                    2010015: [2010041]
2010018: [2010206]                    2010038: [2008140]                    2010197: [2010037]
2010016: [2010015]                    2010017: [2010005]                    2010022: [2010018]
2010040: [2010005]                    2010042: [2010197]                    2010201: [2008029, 2010038]
2010020: [2010022]                    2010047: [2010017]                    2010049: [2010040]
2010053: [2010016]                    2010202: [2010201]                    2010203: [2010042]
2010019: [2010049] (E)                2010024: [2010020, 2010053]           2010100: [2010203]
2010182: [2010016] (E)                2010204: [2010202]                    2010205: [2010047]
2010033: [2010049] (E)                2010035: [2010205] (E)                2010102: [2010100]
2010214: [2010024]                    2016046: [2010024] (E, verificar)
2010066: [2010020] (E)                2010079: [2010020] (E)                2010103: [2010201] (E)
2010174: [2010047] (E)                2010209: [2010102] (E)                2010211: [2010017] (E)
2010215: [2010102, 2010214] (titulacion)                                    2010217: [2010020] (E)
```

## Política de horarios futuros
- **Roadmap de materias**: hasta titulación (depende solo de prerrequisitos). Real.
- **Horario con grupos/horas**: solo gestión actual y **siguiente** (oferta publicada). Más allá no existe → no inventar.
- Para el siguiente semestre se puede mostrar horario **referencial** basado en la oferta actual, SIEMPRE rotulado "los horarios pueden cambiar".
- **No** hardcodear "materia X nunca cambia". Cuando haya 2–3 gestiones cargadas, calcular un indicador de estabilidad (mantuvo horario vs cambió) a partir de los datos.

## Fuentes de datos
- `Horario 1/2026` (PDF, CPD-FCyT) y `Pensum 134111` (PDF, webSISS). Colocarlos en `/data/sources/`.
- Tarea: parsearlos al JSON canónico según el esquema. **Cuidado**: la tabla del horario es irregular (nombres largos parten líneas; `POR DESIGNAR DOCENTE` = `docente:null`; aulas especiales `INFLAB/INFDEP/690MAT`; teoría+laboratorio de Física como `vinculo`).

## Tarea inmediata (Sprint 1)
1. Estructura del repo: módulos ES6 limpios (capa datos / estado / render / eventos).
2. Parsear las fuentes → dataset canónico completo (~54 materias), validando contra el esquema.
3. Catálogo navegable (sin cuenta) leyendo ese JSON.
4. Git + commits por incremento.

## Decisiones pendientes (preguntar al fundador, no asumir)
- **DP-01** Materias aprobadas: checklist inicial en onboarding + cierre de semestre tomando el horario guardado. (Enfoque ya confirmado; implementar así.)
- **DP-03** ✅ Resuelto (2026-06-18): reseñar requiere **correo institucional UMSS `est.umss.edu`** (sin `.bo`).
- **DP-04** ✅ Resuelto (2026-06-18): **una sola estrella global (1–5) + comentario** (ver D5).
- **DP-05** Nombre del producto. (pendiente)
- **DP-06** ✅ Resuelto. Frontend Vanilla JS + ES6 (2026-06-14); Backend **Supabase** confirmado (2026-06-18). Ver D7.
- **DP-07** Verificar prereqs inusuales. Contabilidad Básica (2016046) → prereq Taller de Ing. de Software (2010024): confirmado contra el pensum oficial 134111; no ofertada en 1/2026. Falta criterio de área para electivas (egreso = 6 electivas, sin reglas de área conocidas).

## Convenciones
- Simplicidad ante todo (menos es más). Sin dependencias innecesarias.
- Sin `localStorage` para datos críticos sin acordarlo.
- Código legible, modular, comentarios donde aporten.
