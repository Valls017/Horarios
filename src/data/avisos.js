// avisos.js — avisos del producto (la campana 🔔). Datos como configuración (D1):
// se editan a mano acá (el más nuevo primero, id creciente). Sin datos falsos (D4):
// solo avisos reales del producto/gestión.

export const AVISOS = [
  {
    id: 3,
    fecha: "2026-06-28",
    titulo: "¡Semester Draft está en línea!",
    texto: "Ya podés armar tu horario, leer reseñas y planificar tu semestre desde cualquier dispositivo.",
  },
  {
    id: 2,
    fecha: "2026-06-23",
    titulo: "Reseñas de docentes",
    texto: "Ver reseñas es libre. Para calificar necesitás tu correo institucional @est.umss.edu.",
  },
  {
    id: 1,
    fecha: "2026-06-14",
    titulo: "Oferta 1/2026 cargada",
    texto: "Horario y pensum oficiales (CPD-FCyT / webSISS). Los horarios pueden cambiar.",
  },
];

/** Id del aviso más nuevo (para el puntito de "hay algo sin leer"). */
export const ULTIMO_AVISO = AVISOS.reduce((max, a) => Math.max(max, a.id), 0);
