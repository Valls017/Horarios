# Registro de sprints — Semester Draft

Bitácora del desarrollo por incrementos. Cada sprint lista **qué se construyó**, las
**HU cubiertas** (ver `Criterios-Aceptacion.md`), la **evidencia en código** (commits
reales del repo) y un espacio para **capturas** que se completan desde el sitio publicado.

> **Método de trabajo.** Incrementos chicos, un commit por entregable, *audit-first* en
> las partes con riesgo (motor y recomendador empezaron por una **Fase 0** de auditoría
> de datos antes de codificar). Tests en cada capa, corridos con Node sin framework
> (`npm run check` = build + validación + tests).

Repositorio: https://github.com/Valls017/Horarios · rama `main`.

---

## Sprint 1 · Capa de datos y catálogo
**Fechas:** 2026-06-14 · **HU:** HU-01, HU-02, HU-03

**Objetivo.** Tener el dataset canónico (sin inventar datos) y un catálogo navegable
sin cuenta, sobre módulos ES6 limpios.

**Entregado.**
- Parseo del pensum 134111 + horario 1/2026 → `horario-1-2026.json` (54 materias).
- Builder determinista (`tools/build-dataset.mjs`) + validación de esquema y grafo de prereqs.
- `docente_id` estable (slug del nombre) + auditoría de docentes casi-duplicados.
- Catálogo navegable: listado por nivel, búsqueda tolerante a acentos, filtros, detalle
  de materia (grupos/horarios/prereqs/docentes) e índice de docentes.

**Evidencia (commits).**
| Commit | Descripción |
|--------|-------------|
| `24dc941` | Capa de datos: dataset canónico 1/2026 + módulos y validación |
| `11a4c1c` | Catálogo navegable (sin cuenta) + UI Vanilla ES6 |
| `8a49b13` | CLAUDE.md: registrar frontend confirmado + verificación de prereqs |
| `169c8ee` | docente_id estable (slug) + registro de docentes + audit de duplicados |

**Evidencia visual.** _(pegar capturas)_
- [ ] Catálogo por niveles
- [ ] Detalle de materia (con vínculo de Física)
- [ ] Índice de docentes

---

## Sprint 2 · Motor de horarios sin choques + armador
**Fechas:** 2026-06-16 a 2026-06-18 · **HU:** HU-04, HU-05, HU-06, HU-07

**Objetivo.** Autogenerar combinaciones sin cruces (no armado manual) y exponerlo en una
UI usable, con un modo permisivo honesto cuando no hay solución limpia.

**Entregado.**
- Motor con slots discretos (bitmask) + backtracking, validado contra un **oráculo**
  independiente (producto cartesiano) en los tests.
- UI del armador: grilla semanal, selección de materias, filtros (evitar 06:45, sin "por
  designar"), fijar grupo desde la grilla, imprimir/PDF.
- Ranking por compacidad (menos huecos) + opción "mejor calificados".
- Modo **permisivo** "armar igual": mínimo de cruces, marcados en rojo (no escondidos).
- Builder idempotente (se quitó el timestamp `generado` del dataset).

**Evidencia (commits).**
| Commit | Descripción |
|--------|-------------|
| `8d4df44` | Motor de horarios sin choques (Sprint 2): slots + backtracking + ranking |
| `716a210` | Armador de horarios: UI (vista, grilla semanal, filtros, fijar grupo) |
| `6322891` | Builder determinista: quitar el timestamp 'generado' del dataset |
| `e07d222` | Motor "armar igual": modo permisivo con mínimo de cruces |

**Evidencia visual.** _(pegar capturas)_
- [ ] Horarios generados (grilla + opciones)
- [ ] Modo permisivo con cruces resaltados
- [ ] Grupo fijado + vista de impresión

---

## Sprint 3 · Recomendador de semestre y roadmap ("Mi avance")
**Fechas:** 2026-06-18 · **HU:** HU-08, HU-09

**Objetivo.** Cerrar el diferenciador: recomendar el próximo semestre según prerrequisitos
y mostrar el camino a egreso. (Arrancó con Fase 0 de auditoría del grafo de prereqs.)

**Entregado.**
- Lógica de prerrequisitos: habilitadas (AND), recomendadas, roadmap por niveles,
  progreso de egreso (obligatorias + 6 electivas).
- Vista "Mi avance": checklist de aprobadas, recomendación, roadmap, puente al armador.
- Rediseño del armador como portada del producto.

**Evidencia (commits).**
| Commit | Descripción |
|--------|-------------|
| `c8ffd93` | Recomendador de semestre + roadmap (lógica + tests) |
| `9dec1f6` | UI: rediseño del armador (portada) + vista "Mi avance" |

**Evidencia visual.** _(pegar capturas)_
- [ ] Mi avance: checklist + recomendación
- [ ] Roadmap por niveles / progreso de egreso

---

## Sprint 4 · Backend Supabase (cuentas, reseñas, persistencia)
**Fechas:** 2026-06-23 · **HU:** HU-10, HU-11

**Objetivo.** Sumar lo que requiere cuenta: reseñas de docentes, guardar horario y
persistir aprobadas, con seguridad a nivel de fila.

**Entregado.**
- Auth email + contraseña; cliente Supabase por CDN ESM con carga **perezosa**
  (catálogo/armador siguen si el CDN falla).
- Reseñas: ver público; calificar requiere `@est.umss.edu`; una estrella + comentario;
  1 por par (docente, materia); anónimas vía vistas sin `user_id`.
- "Mejor calificados" conectado al ranking del armador.
- Guardar/cargar horarios + persistir aprobadas. Esquema + **RLS** en `supabase/schema.sql`.

**Evidencia (commits).**
| Commit | Descripción |
|--------|-------------|
| `0c2addb` | Backend Supabase: auth + reseñas + mejor calificados + guardar/persistir |

**Evidencia visual.** _(pegar capturas)_
- [ ] Registro / inicio de sesión
- [ ] Reseña de un docente (form + listado)
- [ ] Horario guardado en la cuenta

---

## Sprint 5 · QA, realismo del recomendador y producto
**Fechas:** 2026-06-26 · **HU:** afina HU-08; transversal

**Objetivo.** Pulir contra bugs reales encontrados en uso y cerrar la identidad de producto.

**Entregado.**
- **Recomendación realista**: tope de 6 materias (antes mostraba hasta 13) y garantía de
  que la sugerencia **no tiene choques** (`motor/plan.js`); el resto se lista aparte.
- 5 bugs corregidos: loop de reintentos en reseñas, "limpiar" aprobadas que no persistía,
  breadcrumb del catálogo, guardado silencioso, cargar guardado con filtro activo.
- Pulido móvil (barra/grilla) y accesibilidad (teclado, foco, aria-labels).
- Nombre de producto **Semester Draft** + eslogan (DP-05).

**Evidencia (commits).**
| Commit | Descripción |
|--------|-------------|
| `a2ff40d` | QA: recomendación realista (tope 6 + sin choques) + bugs y pulido |
| `633d3a9` | Producto: nombre "Semester Draft" + eslogan (DP-05) |

**Evidencia visual.** _(pegar capturas)_
- [ ] Recomendación con tope 6 + "otras que también podés tomar"
- [ ] Vista en celular (responsive)

---

## Sprint 6 · Deploy y documentación
**Fechas:** 2026-06-28 · **HU:** transversal (entrega)

**Objetivo.** Dejar el producto publicable y producir los artefactos académicos
(evidencia de diseño que la Especificación marcaba "a completar durante el desarrollo").

**Entregado.**
- Preparación de deploy: `.nojekyll`, rutas relativas verificadas (sirven bajo `/Horarios/`).
- Informe de seguimiento actualizado.
- Documentación técnica: **ERD + diagramas C4** (`docs/Documentacion-Tecnica.md`).
- **Criterios de aceptación** por HU (`docs/Criterios-Aceptacion.md`).
- **Registro de sprints** (este documento).

**Evidencia (commits).**
| Commit | Descripción |
|--------|-------------|
| `119286a` | Deploy: .nojekyll para GitHub Pages + informe de seguimiento |
| _(este lote)_ | Documentación: ERD/C4 + criterios de aceptación + registro de sprints |

**Pendiente del sprint (acción del fundador / verificación en vivo).**
- [ ] Activar GitHub Pages (Settings → Pages → `main` / root).
- [ ] Site URL en Supabase = `https://valls017.github.io/Horarios/`.
- [ ] QA en navegador y celular real (reseñas, guardar, persistir; layout móvil).
- [ ] Capturas finales para este registro.

---

## Resumen

| Sprint | Foco | HU | Fechas |
|--------|------|----|--------|
| 1 | Datos + catálogo | HU-01..03 | 14/06 |
| 2 | Motor sin choques + armador | HU-04..07 | 16–18/06 |
| 3 | Recomendador + roadmap | HU-08, 09 | 18/06 |
| 4 | Backend Supabase | HU-10, 11 | 23/06 |
| 5 | QA + producto | (afina 08) | 26/06 |
| 6 | Deploy + documentación | entrega | 28/06 |

**Estado:** alcance v1 funcionalmente completo y versionado; resta la publicación
(deploy) y la verificación en vivo contra Supabase y en celular real.
