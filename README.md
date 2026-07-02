# Semester Draft · Ing. Informática UMSS

> *Draftea tu semestre, sin choques.*

Plataforma web para estudiantes de Ingeniería Informática (UMSS, plan **134111**):
armado de horarios sin choques, reseñas de docentes y recomendación de semestre.
Ver `CLAUDE.md` para el contexto de producto (fuente de verdad) y `docs/` para la
documentación técnica (ERD, C4, criterios de aceptación, sprints).

> **Estado:** v1 en producción — https://valls017.github.io/Horarios/
> Catálogo, armador (sin choques + "armar igual" + imprimir), recomendador/roadmap,
> reseñas, cuentas y persistencia. UI oscura ("Draft Night"), navegación móvil con
> tabbar inferior e instalable como app (PWA manifest).
> Stack: **Vanilla JS + módulos ES6** (front, sin build) + **Supabase** (auth/reseñas/datos).

## Cómo correr

Requiere solo **Node.js** (para el servidor estático de desarrollo; el sitio en sí
es HTML/CSS/JS sin build).

```bash
npm run dev        # http://localhost:5173
```

Scripts:

```bash
npm run build:data # regenera data/horario-1-2026.json desde las fuentes
npm run validate   # valida el dataset (esquema + grafo de prerrequisitos)
npm test           # pruebas: datos, motor, recomendador y render
npm run check      # build:data + validate + test (todo junto)
```

## Estructura

```
index.html                      Shell: topbar (campana + avatar), tabbar móvil, #vista
manifest.webmanifest            PWA: instalable en el celular ("agregar a inicio")
public/styles/app.css           Tema "Draft Night" (responsive, sin dependencias)
public/icons/                   Íconos SVG de la app (normal + maskable)

src/
  data/                         Capa de datos (independiente de la UI)
    dataset.js                  Carga del JSON + índice de docentes
    tiempo.js  modelo.js        Horas, solapamientos y selecciones válidas (vínculo Física)
    prerequisitos.js            Habilitación, recomendación, roadmap y egreso
    filtros.js  validacion.js   Filtrado del catálogo y validación del esquema
    avisos.js                   Avisos del producto (campana 🔔, editados como datos)
    supabase.js  supabase-config.js   Cliente por CDN ESM (carga perezosa)
    auth.js  resenas.js  aprobadas.js  horarios.js   Acceso a Supabase
  motor/                        Motor puro (sin DOM, testeable en Node)
    slots.js  unidades.js       Bitmask de 60 slots + unidades agendables
    generador.js                Backtracking sin choques + modo permisivo (mín. cruces)
    ranking.js  filtros.js      Compacidad, "mejor calificados", filtros duros
    plan.js                     Recomendación de semestre sin choques (tope 6)
  state/
    estado.js                   Store observable: dataset, armador, avance, sesión,
                                reseñas, avisos, plegables, toasts
  render/                       Vistas (funciones puras estado/datos -> HTML)
    comunes.js                  esc, semestres, plegables, anillo de progreso
    catalogo.js  materia.js  docentes.js  armador.js  horario-grid.js
    avance.js  perfil.js  auth.js  resenas.js  avisos.js
  events/                       Listeners delegados -> acciones del estado
    router.js                   Hash router (#/, #/materias, #/materia/:c, #/docentes,
                                #/avance, #/perfil)
    filtros-ui.js  armador-ui.js  avance-ui.js  auth-ui.js  resenas-ui.js
    avisos-ui.js  plegables-ui.js
  main.js                       Arranque: carga, suscripción, render, títulos

data/
  horario-1-2026.json           Dataset canónico (generado)
  modelo-datos-canonico.json    Esquema + ejemplos de referencia
  sources/                      PDFs oficiales (horario CPD, pensum webSISS)

supabase/
  schema.sql                    Tablas + RLS (reseñas anónimas por vistas, owner-only)

tools/
  build-dataset.mjs             Genera el dataset desde el pensum + horario
  validate-dataset.mjs          Validación + cross-check del grafo de prereqs
  test-data.mjs  test-motor.mjs  test-recomendador.mjs  test-render.mjs
  serve.mjs                     Servidor estático de desarrollo

docs/                           ERD + C4, criterios de aceptación (HU-01..11),
                                registro de sprints, contexto para Claude
```

## Datos como configuración (decisión D1)

El horario y el pensum **no** están hardcodeados en la lógica. Viven en tablas
dentro de `tools/build-dataset.mjs` y se emiten a `data/horario-1-2026.json`,
que es lo que carga la app.

**Actualizar por gestión:** editar la tabla `HORARIO` (y, si cambia el pensum, la
tabla `PENSUM`) en `tools/build-dataset.mjs`, luego `npm run check`. Cada bloque
dura 90 min, así que solo se transcribe la hora de inicio; el fin se calcula.

## Dataset actual (1/2026)

54 materias del pensum (52 ofertadas esta gestión) · 12 electivas · 103 grupos ·
263 bloques. Las materias no ofertadas (Contabilidad Básica, Aplic. Interactivas
para TV Digital) se incluyen para el pensum/roadmap con `grupos: []`.

## Notas de modelado

- **Física General (2006063):** teoría `B` + un laboratorio `B1..B6` del mismo
  vínculo `FIS-B` (decisión del fundador). Una selección válida = teoría + 1 lab.
- **`docente: null`** = "POR DESIGNAR DOCENTE".
- Sesiones **`TP`** comparten el `id` del grupo (no son una elección aparte); pueden
  tener un docente distinto (`docente_tp`).
- Aulas especiales se conservan tal cual: `INFLAB`, `INFDEP`, `690MAT`, `684L6`.
- **`docente_id`** = slug estable del nombre: las reseñas sobreviven a correcciones
  de tildes/mayúsculas.

## Backend (Supabase)

- Auth **email + contraseña**; reseñar exige correo institucional `@est.umss.edu`
  (reforzado por RLS, no solo en la UI).
- Reseñas **anónimas** hacia otros usuarios: se leen por vistas sin `user_id`.
- Cliente cargado por **CDN ESM con import perezoso**: si el CDN falla, el catálogo
  y el armador siguen funcionando.
