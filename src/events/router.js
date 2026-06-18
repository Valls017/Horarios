// router.js — router por hash (#/...). Traduce la URL a una ruta de estado.
// Sin cuenta ni backend: navegación 100% en el cliente.

import { setRuta } from "../state/estado.js";

/** Parsea el hash actual a { vista, codigo }. */
export function parsearHash() {
  const hash = location.hash.replace(/^#/, "");
  const partes = hash.split("/").filter(Boolean); // "/materia/2008019" -> ["materia","2008019"]

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
  // Portada (#/) y cualquier otra ruta -> armador.
  return { vista: "armar", codigo: null };
}

/** Inicia el router: aplica la ruta actual y escucha cambios de hash. */
export function iniciarRouter() {
  const aplicar = () => {
    setRuta(parsearHash());
    window.scrollTo(0, 0);
  };
  window.addEventListener("hashchange", aplicar);
  aplicar();
}
