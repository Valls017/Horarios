# Criterios de aceptación — Semester Draft

Historias de usuario (HU) del alcance **v1** con sus criterios de aceptación en
formato **Dado / Cuando / Entonces**. Cada criterio es **verificable**: describe una
condición observable, no una intención. Se agrupan por las tres capacidades que el
producto integra (catálogo, armador, avance) más cuentas/persistencia.

> **Trazabilidad.** Cada HU referencia las decisiones de `CLAUDE.md` (D1–D7, DP-xx)
> y el módulo donde vive su lógica, para auditar que lo construido responde a lo acordado.

**Convención de estados:** ✅ implementado · 🔶 parcial (ver nota) · ⬜ fuera de v1.

---

## Catálogo (sin cuenta)

### HU-01 · Navegar el catálogo de materias
**Como** estudiante, **quiero** ver las materias de la carrera por nivel y buscarlas,
**para** ubicar rápido lo que me interesa sin tener que iniciar sesión. — D3
Estado: ✅ · `render/catalogo.js`, `data/filtros.js`

- **CA-01.1 — Listado por nivel.** *Dado* que abro el catálogo, *cuando* carga la
  página, *entonces* veo las materias agrupadas por nivel (A–I) sin necesidad de cuenta.
- **CA-01.2 — Búsqueda tolerante a acentos.** *Dado* el buscador, *cuando* escribo
  "fisica" (sin tilde), *entonces* aparece "Física General" entre los resultados.
- **CA-01.3 — Filtros.** *Dado* el catálogo, *cuando* aplico un filtro (nivel, tipo,
  turno o "solo ofertadas"), *entonces* la lista se reduce a las materias que cumplen
  y la cuenta mostrada se actualiza.
- **CA-01.4 — Datos desde JSON (D1).** *Dado* que el catálogo se sirve desde
  `horario-1-2026.json`, *cuando* se actualiza la oferta editando los datos y se
  regenera, *entonces* el catálogo refleja el cambio **sin tocar la lógica**.

### HU-02 · Ver el detalle de una materia
**Como** estudiante, **quiero** abrir una materia y ver sus grupos, horarios,
prerrequisitos y docentes, **para** decidir si me conviene y cuándo se dicta.
Estado: ✅ · `render/materia.js`

- **CA-02.1 — Grupos y horarios.** *Dado* el detalle de una materia, *cuando* lo abro,
  *entonces* veo cada grupo con sus bloques (día, hora inicio–fin, aula) y su docente.
- **CA-02.2 — "Por designar".** *Dado* un grupo sin docente asignado, *cuando* lo veo,
  *entonces* se muestra explícitamente como "por designar" (no en blanco). — D-modelo
- **CA-02.3 — Prerrequisitos navegables.** *Dado* el detalle, *cuando* miro los
  prerrequisitos y "habilita a", *entonces* puedo hacer clic y navegar a esas materias.
- **CA-02.4 — Vínculo Física.** *Dado* Física General (2006063), *cuando* veo sus grupos,
  *entonces* la teoría `B` y los laboratorios `B1..B6` aparecen como un paquete
  (teoría + un laboratorio del mismo vínculo), no como grupos sueltos. — CLAUDE.md

### HU-03 · Consultar docentes
**Como** estudiante, **quiero** un índice de docentes con las materias que dictan,
**para** ubicar a un profesor y llegar a sus reseñas.
Estado: ✅ · `render/docentes.js`, `data/dataset.js`

- **CA-03.1 — Índice de docentes.** *Dado* la vista de docentes, *cuando* la abro,
  *entonces* veo cada docente con las materias/grupos que dicta esta gestión.
- **CA-03.2 — Identidad estable.** *Dado* que un docente se ata por `docente_id` (slug),
  *cuando* se corrige un acento del nombre, *entonces* sus reseñas siguen vinculadas
  (el id no cambia). — modelado

---

## Armador de horarios (sin cuenta)

### HU-04 · Generar horarios sin choques
**Como** estudiante, **quiero** elegir materias y que se generen automáticamente las
combinaciones **sin cruces**, **para** no armarlo a mano. — diferenciador
Estado: ✅ · `motor/generador.js`, `motor/slots.js`

- **CA-04.1 — Solo combinaciones válidas.** *Dado* un conjunto de materias elegidas,
  *cuando* genero, *entonces* **ningún** horario propuesto tiene dos clases solapadas.
- **CA-04.2 — Selección válida con vínculo.** *Dado* que elijo Física, *cuando* se arma,
  *entonces* cada horario incluye su teoría **y** exactamente **un** laboratorio del
  mismo vínculo.
- **CA-04.3 — Correctitud verificada.** *Dado* el motor de backtracking, *cuando* corren
  los tests, *entonces* su resultado coincide con un **oráculo independiente**
  (producto cartesiano) para los casos de prueba.
- **CA-04.4 — Sin grupos disponibles.** *Dado* que un filtro deja una materia sin grupos,
  *cuando* genero, *entonces* veo un mensaje claro del por qué (no una lista vacía muda).

### HU-05 · "Armar igual" cuando no hay solución limpia
**Como** estudiante, **quiero** que si **no existe** combinación sin choques igual me
muestre opciones con el **mínimo de cruces**, **para** ver mi mejor alternativa real.
Estado: ✅ · `motor/generador.js` (modo permisivo)

- **CA-05.1 — Mínimo de cruces.** *Dado* que no hay combinación limpia, *cuando* genero,
  *entonces* se muestran horarios ordenados por **menor cantidad de cruces**.
- **CA-05.2 — Cruces visibles, no escondidos.** *Dado* un horario permisivo, *cuando* lo
  veo, *entonces* los cruces se marcan (aviso + resaltado en la grilla) indicando qué
  materias se pisan, qué día y a qué hora.

### HU-06 · Filtrar y ordenar las opciones
**Como** estudiante, **quiero** filtrar por preferencias y ordenar las opciones,
**para** que el primer resultado sea el más conveniente para mí.
Estado: ✅ (🔶 "mejor calificados" depende de que haya reseñas) · `motor/ranking.js`, `motor/filtros.js`

- **CA-06.1 — Evitar 06:45.** *Dado* el filtro "evitar 06:45", *cuando* lo activo,
  *entonces* ningún horario propuesto usa la primera banda.
- **CA-06.2 — Sin "por designar".** *Dado* el filtro "sin por designar", *cuando* lo
  activo, *entonces* se excluyen los grupos sin docente.
- **CA-06.3 — Orden por compacidad.** *Dado* el ranking por defecto, *cuando* veo las
  opciones, *entonces* las de **menos huecos** aparecen primero ("mejor armado").
- **CA-06.4 — Mejor calificados.** *Dado* el filtro "mejor calificados", *cuando* lo
  activo y **hay reseñas**, *entonces* las opciones se ordenan por promedio de
  calificación de sus docentes. *(Sin reseñas cargadas, queda sin efecto — D4.)*

### HU-07 · Fijar grupos e imprimir
**Como** estudiante, **quiero** fijar un grupo y exportar/imprimir el horario,
**para** anclar una clase concreta y quedarme con una copia.
Estado: ✅ · `render/horario-grid.js`, `events/armador-ui.js`

- **CA-07.1 — Fijar desde la grilla.** *Dado* una opción mostrada, *cuando* hago clic
  (o uso el teclado) sobre una clase, *entonces* ese grupo queda **fijado** y las demás
  opciones respetan esa elección; puedo soltarlo.
- **CA-07.2 — Imprimir / PDF.** *Dado* un horario, *cuando* uso "Imprimir / PDF",
  *entonces* se abre el diálogo del navegador con una vista limpia (encabezado de
  gestión + leyenda + grilla) lista para "Guardar como PDF".
- **CA-07.3 — Tope por semestre.** *Dado* que elijo más de 6 materias, *cuando* lo hago,
  *entonces* aparece un aviso de que lo normal es hasta 6 por semestre.

---

## Mi avance — recomendación y roadmap (sin cuenta para ver)

### HU-08 · Recomendación realista del próximo semestre
**Como** estudiante, **quiero** marcar lo aprobado y que me recomiende qué cursar el
próximo semestre **sin choques** y en cantidad realista, **para** planificar bien.
Estado: ✅ · `data/prerequisitos.js`, `motor/plan.js`, `render/avance.js`

- **CA-08.1 — Solo materias habilitadas.** *Dado* mi conjunto de aprobadas, *cuando* veo
  la recomendación, *entonces* solo incluye materias cuyas previas estén **todas**
  aprobadas (AND). — prerrequisitos
- **CA-08.2 — Tope realista.** *Dado* que hay muchas habilitadas, *cuando* se recomienda,
  *entonces* se sugieren **hasta 6** (no 13), priorizando los niveles más bajos.
  *(Tope a confirmar contra reglamento.)*
- **CA-08.3 — Recomendación sin choques.** *Dado* el conjunto sugerido, *cuando* lo veo,
  *entonces* **existe** al menos una combinación de horarios sin cruces para esas materias.
- **CA-08.4 — Alternativas visibles.** *Dado* que algunas habilitadas no entran (tope o
  choque), *cuando* veo la sección, *entonces* se listan aparte como "otras que también
  podés tomar", sin ocultarlas.
- **CA-08.5 — Puente al armador.** *Dado* la recomendación, *cuando* uso "armar horario
  con las recomendadas", *entonces* paso al armador con esas materias ya elegidas.

### HU-09 · Progreso a egreso y roadmap
**Como** estudiante, **quiero** ver cuánto me falta para egresar y el camino de materias,
**para** dimensionar lo que resta hasta titularme.
Estado: ✅ · `data/prerequisitos.js`, `render/avance.js`

- **CA-09.1 — Progreso de egreso.** *Dado* mis aprobadas, *cuando* veo "Mi avance",
  *entonces* se muestra el avance hacia el egreso (obligatorias + 6 electivas).
  *(Regla de 6 electivas a confirmar contra reglamento.)*
- **CA-09.2 — Roadmap por niveles.** *Dado* el roadmap, *cuando* lo recorro, *entonces*
  veo, por nivel, qué falta para habilitar cada materia hasta la titulación.
- **CA-09.3 — Persistencia opcional.** *Dado* que veo el avance sin cuenta, *cuando* tengo
  sesión iniciada, *entonces* mis aprobadas se **guardan** y vuelven al recargar (ver HU-11).

---

## Cuentas, reseñas y persistencia (Supabase)

### HU-10 · Reseñas de docentes
**Como** estudiante, **quiero** leer reseñas de docentes (público) y calificar con mi
correo institucional, **para** aportar y aprovechar la experiencia de otros. — D2, D5, DP-03
Estado: ✅ · `data/resenas.js`, `render/resenas.js`, `supabase/schema.sql`

- **CA-10.1 — Lectura pública.** *Dado* cualquier visitante, *cuando* abre una materia,
  *entonces* puede **ver** las reseñas de sus docentes sin iniciar sesión.
- **CA-10.2 — Calificar requiere cuenta institucional.** *Dado* que quiero calificar,
  *cuando* no tengo sesión con correo `@est.umss.edu`, *entonces* no puedo enviar reseña
  (restricción reforzada por RLS en el servidor, no solo en la UI). — DP-03
- **CA-10.3 — Una estrella + comentario.** *Dado* el formulario, *cuando* reseño,
  *entonces* registro **una** calificación global (1–5) y un comentario. — D5/DP-04
- **CA-10.4 — Una por par.** *Dado* que ya reseñé a un (docente, materia), *cuando* vuelvo,
  *entonces* edito mi reseña en vez de crear otra (1 por usuario por par). — D2
- **CA-10.5 — Anonimato.** *Dado* que otros leen mi reseña, *cuando* la ven, *entonces*
  **no** se expone mi identidad (se sirve por vistas sin `user_id`). — D5
- **CA-10.6 — Resiliencia ante fallo.** *Dado* que el backend o el CDN fallan, *cuando*
  cargo reseñas, *entonces* veo un mensaje de error claro (sin loop de reintentos) y el
  resto del sitio sigue funcionando.

### HU-11 · Cuenta, guardar horario y persistir aprobadas
**Como** estudiante, **quiero** crear cuenta, guardar horarios y conservar mis aprobadas,
**para** retomar mi planificación en cualquier momento. — D3, D7
Estado: ✅ · `data/auth.js`, `data/horarios.js`, `data/aprobadas.js`

- **CA-11.1 — Registro / inicio.** *Dado* la pantalla de cuenta, *cuando* me registro o
  inicio con email + contraseña, *entonces* obtengo sesión y veo las funciones que la
  requieren. — D7
- **CA-11.2 — Guardar horario.** *Dado* un horario armado y sesión activa, *cuando* uso
  "Guardar", *entonces* queda en mi cuenta y aparece en "Mis horarios guardados".
- **CA-11.3 — Cargar guardado.** *Dado* un horario guardado, *cuando* lo cargo, *entonces*
  se reconstruye correctamente (reseteando filtros que pudieran romper la reconstrucción).
- **CA-11.4 — Aprobadas persistentes.** *Dado* que marco materias aprobadas con sesión,
  *cuando* recargo, *entonces* siguen marcadas; al "limpiar", se borran también del servidor.
- **CA-11.5 — Aislamiento por usuario.** *Dado* RLS en Supabase, *cuando* otro usuario
  consulta, *entonces* solo accede a **sus** horarios y aprobadas (no a los míos).

---

## Resumen de cobertura

| HU | Capacidad | Estado | Lógica |
|----|-----------|--------|--------|
| HU-01 | Catálogo navegable | ✅ | `render/catalogo.js` |
| HU-02 | Detalle de materia | ✅ | `render/materia.js` |
| HU-03 | Docentes | ✅ | `render/docentes.js` |
| HU-04 | Horarios sin choques | ✅ | `motor/generador.js` |
| HU-05 | "Armar igual" permisivo | ✅ | `motor/generador.js` |
| HU-06 | Filtros y ranking | 🔶 (calificados) | `motor/ranking.js` |
| HU-07 | Fijar + imprimir | ✅ | `render/horario-grid.js` |
| HU-08 | Recomendación semestre | ✅ | `motor/plan.js` |
| HU-09 | Progreso + roadmap | ✅ | `data/prerequisitos.js` |
| HU-10 | Reseñas | ✅ | `data/resenas.js` |
| HU-11 | Cuenta + persistencia | ✅ | `data/auth.js` |

> 🔶 **HU-06** queda parcial **por diseño** (D4): "mejor calificados" tiene efecto solo
> cuando haya reseñas reales cargadas; la lógica está implementada y testeada.
>
> **Pendiente de verificación en vivo:** los criterios contra Supabase (HU-10/HU-11) y
> lo visual/móvil se validaron por lógica y render en desarrollo; falta la prueba en
> navegador y celular real con el deploy publicado.
