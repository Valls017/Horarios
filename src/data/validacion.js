// validacion.js — valida un dataset contra el esquema canónico y reglas de negocio.
// Devuelve una lista de errores (strings). Lista vacía = dataset válido.
// Sin dependencias del DOM ni de Node: corre en cualquier entorno.

import { DIAS } from "./tiempo.js";
import { seleccionesDe } from "./modelo.js";

const ROLES = new Set(["completo", "teoria", "laboratorio", "practica"]);
const TIPOS = new Set(["regular", "taller_titulacion"]);
const NIVELES = new Set(["A", "B", "C", "D", "E", "F", "G", "H", "I"]);
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * @param {object} dataset  { materias: [...] }
 * @returns {string[]} errores
 */
export function validarDataset(dataset) {
  const err = [];
  const materias = dataset?.materias;
  if (!Array.isArray(materias)) return ["dataset.materias no es un arreglo"];

  const codigos = new Set();
  for (const m of materias) {
    const ref = `materia ${m.codigo ?? "?"}`;

    if (!/^\d{7}$/.test(m.codigo ?? "")) err.push(`${ref}: código debe ser 7 dígitos`);
    if (codigos.has(m.codigo)) err.push(`${ref}: código duplicado`);
    codigos.add(m.codigo);

    if (!m.nombre) err.push(`${ref}: nombre vacío`);
    if (!NIVELES.has(m.nivel)) err.push(`${ref}: nivel inválido "${m.nivel}"`);
    if (!TIPOS.has(m.tipo)) err.push(`${ref}: tipo inválido "${m.tipo}"`);
    if (typeof m.es_electiva !== "boolean") err.push(`${ref}: es_electiva debe ser boolean`);
    if (!Array.isArray(m.prerrequisitos)) err.push(`${ref}: prerrequisitos debe ser arreglo`);
    if (!Array.isArray(m.grupos)) err.push(`${ref}: grupos debe ser arreglo`);

    validarGrupos(m, err, ref);
  }

  // Prerrequisitos deben apuntar a códigos existentes y no a sí mismos.
  for (const m of materias) {
    for (const p of m.prerrequisitos ?? []) {
      if (p === m.codigo) err.push(`materia ${m.codigo}: prerrequisito apunta a sí misma`);
      if (!codigos.has(p)) err.push(`materia ${m.codigo}: prerrequisito inexistente "${p}"`);
    }
  }

  return err;
}

function validarGrupos(m, err, ref) {
  if (!Array.isArray(m.grupos)) return;
  const idsVistos = new Set();
  let hayVinculo = false;

  for (const g of m.grupos) {
    const gref = `${ref} grupo ${g.id ?? "?"}`;
    if (!g.id) err.push(`${gref}: id vacío`);
    if (idsVistos.has(g.id)) err.push(`${gref}: id de grupo duplicado`);
    idsVistos.add(g.id);
    if (!ROLES.has(g.rol)) err.push(`${gref}: rol inválido "${g.rol}"`);
    if (g.vinculo) hayVinculo = true;
    if (g.docente !== null && typeof g.docente !== "string") {
      err.push(`${gref}: docente debe ser string o null`);
    }
    if (!Array.isArray(g.bloques) || g.bloques.length === 0) {
      err.push(`${gref}: sin bloques`);
      continue;
    }
    for (const b of g.bloques) {
      const bref = `${gref} bloque ${b.dia ?? "?"} ${b.inicio ?? "?"}`;
      if (!DIAS.includes(b.dia)) err.push(`${bref}: día inválido "${b.dia}"`);
      if (!HHMM.test(b.inicio ?? "")) err.push(`${bref}: inicio inválido "${b.inicio}"`);
      if (!HHMM.test(b.fin ?? "")) err.push(`${bref}: fin inválido "${b.fin}"`);
      if (HHMM.test(b.inicio ?? "") && HHMM.test(b.fin ?? "") && b.inicio >= b.fin) {
        err.push(`${bref}: inicio no es anterior a fin`);
      }
      if (!b.aula) err.push(`${bref}: aula vacía`);
    }
  }

  // Reglas de vínculo (p. ej. Física): debe haber teoría y laboratorio/práctica,
  // y toda selección válida debe poder formarse.
  if (hayVinculo) {
    const vinculos = [...new Set(m.grupos.map((g) => g.vinculo).filter(Boolean))];
    for (const v of vinculos) {
      const delV = m.grupos.filter((g) => g.vinculo === v);
      const teoria = delV.some((g) => g.rol === "teoria");
      const lab = delV.some((g) => g.rol === "laboratorio" || g.rol === "practica");
      if (!teoria) err.push(`${ref}: vínculo "${v}" sin grupo rol=teoria`);
      if (!lab) err.push(`${ref}: vínculo "${v}" sin grupo rol=laboratorio/practica`);
    }
  }

  // Si la materia está ofertada, debe producir al menos una selección válida.
  if (m.grupos.length > 0 && seleccionesDe(m).length === 0) {
    err.push(`${ref}: ofertada pero sin selección válida (revisar roles/vínculos)`);
  }
}
