# Informe de Seguimiento — Semester Draft

**Proyecto:** Semester Draft — Plataforma de horarios, reseñas y recomendación de semestre
(Lic. en Ingeniería Informática, FCyT-UMSS, plan 134111).
**Fecha:** 2026-06-26 · **Estado general:** ✅ **Alcance v1 completo** (falta publicar/deploy).
**Repositorio:** https://github.com/Valls017/Horarios (rama `main`, sincronizada).
**Eslogan:** *“Draftea tu semestre, sin choques.”*

---

## 1. Resumen ejecutivo
Semester Draft está **funcionalmente completo para la v1**: arma horarios sin choques,
integra reseñas de docentes y recomienda el próximo semestre, con cuentas y persistencia
en la nube. Todo el código está versionado y testeado (`npm run check` en verde). El
producto **todavía no está publicado** (corre en entorno local); ese es el principal paso
para que estudiantes reales empiecen a usarlo.

Diferenciador frente a SCESI (competidor): la **integración** de armador + reseñas +
recomendación, que nadie junta hoy.

---

## 2. Funcionalidades entregadas (v1)

### 2.1 Capa de datos (sin cuenta)
- **Dataset canónico** generado desde el pensum 134111 y el horario 1/2026:
  **54 materias** (52 ofertadas), **60 docentes**, **103 grupos**, **263 bloques**.
- Builder **determinista y reproducible** (`tools/build-dataset.mjs`): se actualiza por
  gestión editando datos, sin tocar lógica (decisión D1). El fin de cada bloque se calcula
  (bloques de 90 min) para evitar errores de transcripción.
- **Validación** automática del esquema + **cross-check** del grafo de prerrequisitos
  contra la fuente oficial.
- **`docente_id` estable** (slug del nombre): las reseñas se atan al id, no al texto, así
  corregir un acento no rompe vínculos.

### 2.2 Catálogo navegable (sin cuenta)
- Materias por nivel (A–I), **búsqueda tolerante a acentos**, filtros (nivel, tipo,
  turno, solo ofertadas).
- **Detalle de materia**: grupos, horarios (día/hora/aula), prerrequisitos y “habilita a”
  (navegables), docentes.
- Índice de **docentes** con las materias que dictan.

### 2.3 Armador de horarios (sin cuenta)
- **Motor sin choques** (slots discretos / bitmask), con backtracking y un oráculo de
  verificación independiente (tests de equivalencia).
- **“Armar igual” permisivo**: si no hay combinación limpia, muestra los horarios con el
  **mínimo de cruces**, marcados en rojo en la grilla (sin esconder el problema).
- **Filtros**: turno, evitar 06:45, excluir “por designar”.
- **Ranking**: compacidad (menos huecos) + **“Mejor calificados”** (ordena por promedio
  de reseñas de los docentes).
- **Fijar grupo** desde la grilla (clic o teclado) y **Imprimir / Guardar PDF**.

### 2.4 Mi avance — recomendador + roadmap (sin cuenta para ver)
- Checklist de materias aprobadas; al marcar, recalcula todo.
- **Recomendación realista del próximo semestre**: hasta **6 materias** (tope a confirmar
  con reglamento), **sin choques**, priorizando los niveles más bajos; muestra aparte las
  que chocan y “otras que también podés tomar”.
- **Progreso a egreso** (42 obligatorias + 6 electivas) y **roadmap** por niveles con lo
  que falta para cada materia.
- Botón **“Armar horario con las recomendadas”**.

### 2.5 Cuentas y backend (Supabase)
- **Auth** email + contraseña.
- **Reseñas de docentes**: ver es público; **calificar** requiere cuenta con correo
  institucional `@est.umss.edu`. Calificación = **una estrella global (1–5) + comentario**,
  1 por usuario por par (docente, materia), **anónimas** hacia otros (vía vistas sin autor).
- **Guardar horario** y **persistir “aprobadas”** en la nube.
- Esquema + **RLS** versionado en `supabase/schema.sql`.

---

## 3. Decisiones cerradas
| # | Decisión |
|---|---|
| D1 | Datos como configuración (JSON, nunca hardcodeados). |
| D2 | Reseña atada a (docente, materia), persistente; 1 por usuario por par. |
| D3 | Navegar libre; calificar/guardar requiere cuenta. |
| D4 | Sin datos falsos en producción. |
| D5 | Reseñas anónimas; **1 estrella global (1–5) + comentario** (DP-04). |
| D6 | Competimos con SCESI. |
| D7 | Backend **Supabase**; auth email+contraseña; reseñar solo con `@est.umss.edu`. |
| DP-01 | Aprobadas: checklist + cierre de semestre (checklist hecho). |
| DP-03 | Reseñar = correo institucional `est.umss.edu`. ✅ |
| DP-04 | Una estrella global + comentario. ✅ |
| DP-05 | Nombre del producto = **Semester Draft**. ✅ |
| DP-06 | Stack: Vanilla JS + ES6 (front) + Supabase (back). ✅ |
| DP-07 | Prereq de Contabilidad Básica verificado contra el pensum. ✅ |

---

## 4. Arquitectura y stack
- **Frontend:** Vanilla JS + módulos ES6. **Sin dependencias, sin build.** Capas separadas:
  datos / estado / motor / render / eventos.
- **Backend:** Supabase (PostgreSQL + Auth + RLS), cliente cargado por **CDN ESM** (sin
  npm install); carga perezosa → si el CDN falla, catálogo y armador siguen andando.
- **Git + GitHub.** Servidor estático de desarrollo propio (`npm run dev`).

---

## 5. Calidad
- **Tests** (sin framework, corren con Node): capa de datos, motor (equivalencia, Física,
  choques, permisivo, ranking, plan sin choques), recomendador y render. `npm run check`
  (build + validación + tests) **en verde**.
- **QA — 3 rondas**, 5 bugs reales corregidos: loop de reintentos en reseñas, “limpiar”
  aprobadas que no persistía, breadcrumb del catálogo, guardado silencioso, cargar guardado
  con filtro activo. Más pulido **móvil** (barra/grilla) y **accesibilidad** (teclado, foco,
  aria-labels).
- **Pendiente:** QA en navegador/celular real (el round-trip en vivo contra Supabase y lo
  visual no se pudieron verificar en el entorno de desarrollo).

---

## 6. Lo que falta (roadmap)

### Para salir a producción (prioridad alta)
1. **Publicar (deploy)** el sitio estático (GitHub Pages / Netlify / Vercel — gratis).
2. **QA en navegador y celular real** (reseñas, guardar, persistir; layout móvil).
3. **Config de auth de producción** + decidir si se **restringe el registro** al dominio
   institucional (hoy solo *reseñar* está restringido).
4. **Términos + privacidad** mínimos (las reseñas son datos de usuarios).

### Cuando empiece a usarse / haya datos
5. **Sembrar reseñas reales** (sin inventar; es el diferenciador).
6. **Cierre de semestre** tomando el horario guardado (DP-01).
7. **Cargar la oferta de la próxima gestión** cuando se publique.
8. **Moderación** de reseñas al haber volumen.

### v2 / más adelante (dependen de datos)
9. Recomendación que **priorice buenos docentes** (necesita reseñas).
10. **Planificador multi-semestre** (necesita oferta de gestiones futuras).
11. **Indicador de estabilidad** de horarios (con 2–3 gestiones cargadas).

### Fuera de v1 (del CLAUDE.md)
12. Export Calendar/.ics, mapa de aulas, app nativa.

---

## 7. Riesgos y notas
- **Reglas “a confirmar contra reglamento”**: 6 electivas para egreso y 6 materias por
  semestre están como constantes visibles; conviene confirmarlas oficialmente.
- **Sin datos falsos (D4):** el valor de reseñas/“mejor calificados” aparece recién cuando
  hay reseñas reales cargadas.
- **El producto aún no está publicado:** hasta el deploy, nadie externo puede usarlo.
