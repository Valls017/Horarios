# Horarios y Reseñas · Ing. Informática UMSS

Plataforma web para estudiantes de Ingeniería Informática (UMSS, plan **134111**):
armado de horarios sin choques, reseñas de docentes y recomendación de semestre.
Ver `CLAUDE.md` para el contexto de producto (fuente de verdad).

> **Estado:** Sprint 1 — capa de datos + catálogo navegable (sin cuenta).
> Stack confirmado: **Vanilla JS + módulos ES6**, sin dependencias, sin build.

## Cómo correr

Requiere solo **Node.js** (para el servidor estático de desarrollo; el sitio en sí
es HTML/CSS/JS sin build).

```bash
npm run dev        # http://localhost:5173  (abre el catálogo)
```

Scripts:

```bash
npm run build:data # regenera data/horario-1-2026.json desde las fuentes
npm run validate   # valida el dataset (esquema + grafo de prerrequisitos)
npm test           # pruebas de humo de las capas de datos y render
npm run check      # build:data + validate + test (todo junto)
```

## Estructura

```
index.html                      Punto de entrada (carga src/main.js como módulo)
public/styles/app.css           Estilos (responsive, sin dependencias)

src/
  data/                         Capa de datos (independiente de la UI)
    dataset.js                  Carga del JSON + índice de docentes
    tiempo.js                   Horas y solapamiento de bloques
    modelo.js                   Selecciones válidas (incl. vínculo Física) y choques
    prerequisitos.js            Habilitación, roadmap y progreso de egreso
    filtros.js                  Filtrado del catálogo
    validacion.js               Validación contra el esquema canónico
  state/
    estado.js                   Store observable mínimo
  render/                       Vistas (funciones puras estado/datos -> HTML)
    comunes.js  catalogo.js  materia.js  docentes.js
  events/
    router.js                   Router por hash (#/, #/materia/:codigo, #/docentes)
    filtros-ui.js               Controles de filtro -> estado
  main.js                       Arranque: carga, suscripción y render

data/
  horario-1-2026.json           Dataset canónico (generado)
  modelo-datos-canonico.json    Esquema + ejemplos de referencia
  sources/                      PDFs oficiales (horario CPD, pensum webSISS)

tools/
  build-dataset.mjs             Genera el dataset desde el pensum + horario
  validate-dataset.mjs          Validación + cross-check del grafo de prereqs
  test-data.mjs  test-render.mjs  Pruebas de humo
  serve.mjs                     Servidor estático de desarrollo
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
