# Contexto para Claude — Semester Draft

> **Para qué es este archivo.** Pegá o subí esto al inicio de una conversación con
> Claude (web, app o Projects) y tendrá todo el contexto del proyecto sin explicar nada.
> Si trabajás en **Claude Code** dentro de la carpeta del repo, no hace falta: lee
> `CLAUDE.md` automáticamente. La **fuente de verdad** completa es `CLAUDE.md`; esto es
> un resumen de arranque.

---

## 1. Qué es
**Semester Draft** — app web para estudiantes de **Ingeniería Informática de la UMSS**
(plan 134111). Eslogan: *"Draftea tu semestre, sin choques."* Integra tres cosas que
hoy nadie junta:
1. **Armador de horarios** sin choques (autogenera combinaciones, no es armado manual).
2. **Reseñas de docentes** por materia.
3. **Recomendación del próximo semestre** + roadmap hasta titulación, según prerrequisitos.

**Diferenciador frente a SCESI** (competidor): la integración de reseñas + recomendación.

## 2. Estado actual (al 2026-07-02)
- ✅ **Alcance v1 funcionalmente completo**, testeado (`npm run check` en verde).
- ✅ **Publicado:** https://valls017.github.io/Horarios/ — ⚠ la versión en vivo es
  ANTERIOR al rediseño: hay un lote grande **sin commitear** (regla: no se commitea
  hasta que el fundador diga "hacerlo oficial").
- 🎨 **Rediseño local (sin publicar):** tema oscuro "Draft Night" (negro + azul
  eléctrico), tabbar móvil (Docentes·Materias·Horario·Perfil), avatar+campana de
  avisos, semestres plegables, Perfil estilo menú, toasts, PWA instalable,
  selector de docente al armar, compartir horario por link, franjas de turno.
- 📝 **Reseñas reales recolectadas** (estudiante 5to sem): `data/resenas-recolectadas.json`
  + script de siembra `supabase/seed-resenas.sql` (pendiente correrlo en Supabase).
- ⏳ **Falta verificar en vivo** el backend (reseñas/guardado contra Supabase) y el layout
  en celular real — eso requiere un navegador/teléfono de verdad (lo hace el fundador).

## 3. Stack (cerrado, no rediscutir sin motivo)
- **Frontend:** Vanilla JS + módulos ES6. **Sin dependencias, sin build.** Capas:
  `data / state / motor / render / events`.
- **Catálogo** (horario + pensum): **JSON estático** versionado, no base de datos.
- **Backend** (cuentas/reseñas/persistencia): **Supabase** (PostgreSQL + Auth + RLS),
  cliente cargado por **CDN ESM** con import perezoso.
- **Hosting:** GitHub Pages (estático).

## 4. Decisiones cerradas
| # | Decisión |
|---|---|
| D1 | Datos como configuración: horario/pensum en JSON, **nunca hardcodeados**. Actualizar gestión = editar datos. |
| D2 | Reseña atada a `(docente, materia)`, persistente entre gestiones; 1 por usuario por par. |
| D3 | Navegar = libre; **calificar/guardar = cuenta obligatoria**. |
| D4 | **Sin datos falsos** en producción (las reseñas valen recién cuando son reales). |
| D5 | Reseñas anónimas; calificación = **una estrella global (1–5) + comentario**. |
| D6 | Competimos con SCESI. |
| D7 | Backend Supabase; auth **email + contraseña**; reseñar restringido a correo **`@est.umss.edu`** (sin `.bo`). |
| DP-05 | Nombre del producto = **Semester Draft**. |

## 5. Modelo de datos (claves)
- **Materia**: `codigo, nombre, nivel(A–I), tipo(regular|taller_titulacion), es_electiva,
  prerrequisitos[](AND), grupos[]`.
- **Grupo**: `id, rol(completo|teoria|laboratorio|practica), vinculo, docente(null="por
  designar"), bloques[]`.
- **Bloque**: `dia(LU..SA), inicio/fin "HH:MM", aula`. Bloques de 90 min.
- **Vínculo (Física General 2006063):** teoría `B` + **un** laboratorio `B1..B6` del mismo
  vínculo `FIS-B`. Selección válida = teoría + 1 lab.
- **Prerrequisitos (AND):** una materia se habilita cuando *todas* sus previas están aprobadas.
- **Egreso:** todas las obligatorias **+ 6 electivas** (a confirmar contra reglamento).
- **`docente_id`** = slug estable del nombre (las reseñas sobreviven a correcciones de acento).

## 6. Funcionalidades entregadas (v1)
- **Catálogo** navegable sin cuenta: materias por nivel, búsqueda tolerante a acentos,
  filtros, detalle (grupos/horarios/prereqs/docentes), índice de docentes.
- **Armador**: motor sin choques (bitmask + backtracking, validado contra oráculo);
  modo **permisivo** "armar igual" (mínimo de cruces, marcados); filtros (evitar 06:45,
  sin "por designar"); ranking por compacidad y "mejor calificados"; fijar grupo;
  imprimir/PDF.
- **Mi avance**: checklist de aprobadas → recomendación realista del próximo semestre
  (**hasta 6**, sin choques, niveles bajos primero) + "otras que también podés tomar" +
  progreso de egreso + roadmap por niveles.
- **Cuentas/Supabase**: auth email+contraseña; reseñas (ver público, calificar con
  `@est.umss.edu`, anónimas vía vistas); guardar horario; persistir aprobadas; RLS.

## 7. Qué falta (roadmap)
**Alta (antes de difundir):**
1. Verificar **en vivo** el round-trip de Supabase (registro + confirmación de mail +
   reseña + guardar + persistir aprobadas) en el sitio publicado.
2. **QA en celular real** (layout, grilla, barra).
3. **Términos + privacidad** mínimos (las reseñas son datos de usuarios).
4. Decidir si se **restringe el registro** al dominio institucional (hoy solo *reseñar* lo está).

**Cuando haya datos/uso:**
5. Sembrar **reseñas reales** (es el diferenciador; sin inventar, D4).
6. **Cierre de semestre** tomando el horario guardado (DP-01).
7. Confirmar contra **reglamento**: 6 electivas y 6 materias/semestre (hoy constantes visibles).
8. **Moderación** de reseñas al haber volumen.

**v2 / dependen de datos:** recomendación que priorice buenos docentes; planificador
multi-semestre; indicador de estabilidad de horarios (con 2–3 gestiones cargadas).
**Fuera de v1:** export Calendar/.ics, mapa de aulas, app nativa.

## 8. Documentación del repo (dónde mirar)
- `CLAUDE.md` — **fuente de verdad** de producto (leer antes de cualquier tarea).
- `Informe-Seguimiento.md` — informe de avance completo.
- `docs/Documentacion-Tecnica.md` — ERD + diagramas C4.
- `docs/Criterios-Aceptacion.md` — HU-01..HU-11 en Dado/Cuando/Entonces.
- `docs/Registro-Sprints.md` — bitácora de los 6 sprints con evidencia de commits.
- `data/horario-1-2026.json` — dataset canónico (catálogo).
- `supabase/schema.sql` — tablas + RLS.

## 9. Cómo correr local
Requiere solo **Node.js** (servidor estático de dev; el sitio es HTML/CSS/JS sin build).
```bash
npm run dev      # http://localhost:5173
npm run check    # build:data + validate + test (todo junto)
```

---
*Última actualización: 2026-06-28. Si una decisión cambia, se actualiza primero en `CLAUDE.md`.*
