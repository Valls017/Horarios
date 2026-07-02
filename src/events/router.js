// router.js — router por hash (#/...). Traduce la URL a una ruta de estado.
// Sin cuenta ni backend: navegación 100% en el cliente.
// La portada acepta horarios compartidos por link: #/?m=cod,cod&f=cod:grupo,...

import { setRuta, cargarHorarioGuardado, mostrarToast } from "../state/estado.js";

/** Parsea el hash actual a { vista, codigo, compartido? }. */
export function parsearHash() {
  const hash = location.hash.replace(/^#/, "");
  const [camino, query = ""] = hash.split("?");
  const partes = camino.split("/").filter(Boolean); // "/materia/2008019" -> ["materia","2008019"]

  if (partes[0] === "materia" && partes[1]) {
    return { vista: "materia", codigo: decodeURIComponent(partes[1]) };
  }
  if (partes[0] === "docentes") {
    return { vista: "docentes", codigo: null };
  }
  if (partes[0] === "materias") {
    return { vista: "catalogo", codigo: null };
  }
  if (partes[0] === "avance") {
    return { vista: "avance", codigo: null };
  }
  if (partes[0] === "perfil") {
    return { vista: "perfil", codigo: null };
  }
  // Portada con horario compartido (#/?m=...&f=...): validar y reconstruir.
  if (!partes.length && query) {
    const q = new URLSearchParams(query);
    const materias = (q.get("m") ?? "").split(",").filter((c) => /^\d{7}$/.test(c));
    const fijados = {};
    for (const par of (q.get("f") ?? "").split(",")) {
      const [c, g] = par.split(":");
      if (/^\d{7}$/.test(c ?? "") && g) fijados[c] = g;
    }
    if (materias.length) return { vista: "armar", codigo: null, compartido: { materias, fijados } };
  }
  // Portada (#/) y cualquier otra ruta -> armador.
  return { vista: "armar", codigo: null };
}

/** Inicia el router: aplica la ruta actual y escucha cambios de hash. */
export function iniciarRouter() {
  const aplicar = () => {
    const ruta = parsearHash();
    if (ruta.compartido) {
      // Un link compartido se reconstruye igual que un horario guardado.
      cargarHorarioGuardado(ruta.compartido);
      history.replaceState(null, "", location.pathname + location.search + "#/");
      setRuta({ vista: "armar", codigo: null });
      mostrarToast("Te compartieron un horario — acá está 📬");
    } else {
      setRuta(ruta);
    }
    window.scrollTo(0, 0);
  };
  window.addEventListener("hashchange", aplicar);
  aplicar();
}
