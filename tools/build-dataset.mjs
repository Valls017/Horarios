// build-dataset.mjs
// Genera data/horario-1-2026.json (dataset canónico) a partir de dos fuentes
// transcritas de los PDFs oficiales:
//   - Pensum 134111 (webSISS)          -> tabla PENSUM (54 materias + prerrequisitos)
//   - Horario de Clases 1/2026 (CPD)    -> tabla HORARIO (oferta de grupos por materia)
//
// Decisión D1 (CLAUDE.md): los datos son configuración. El JSON resultante es lo
// que carga la app. Para actualizar por gestión se edita la tabla HORARIO (o el JSON)
// y se vuelve a correr `node tools/build-dataset.mjs`.
//
// Regla del PDF: TODO bloque dura 90 minutos. Por eso solo se transcribe la hora de
// inicio ("945", "645", "1115"...) y el fin se calcula (+90 min), evitando ~330
// horas de fin escritas a mano.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { slugDocente, construirRegistroDocentes } from "../src/data/docentes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// 1) PENSUM (plan 134111). [codigo, nombre, nivel, prerrequisitos[], opts]
//    opts: { e:true=electiva, t:"taller_titulacion", sigla:"..." }
// ---------------------------------------------------------------------------
const PENSUM = [
  // Nivel A
  ["1803001", "Inglés I", "A", []],
  ["2006063", "Física General", "A", []],
  ["2008019", "Álgebra I", "A", []],
  ["2008054", "Cálculo I", "A", []],
  ["2010010", "Introducción a la Programación", "A", []],
  // Nivel B
  ["1803002", "Inglés II", "B", ["1803001"]],
  ["2008022", "Álgebra II", "B", ["2008019"]],
  ["2008056", "Cálculo II", "B", ["2008054"]],
  ["2010003", "Elementos de Programación y Estructura de Datos", "B", ["2010010"]],
  ["2010013", "Arquitectura de Computadoras I", "B", ["2006063"]],
  ["2010200", "Programación", "B", ["2010010"]],
  // Nivel C
  ["2008060", "Cálculo Numérico", "C", ["2008056"]],
  ["2008140", "Lógica", "C", ["2008022"]],
  ["2010014", "Arquitectura de Computadoras II", "C", ["2010013"]],
  ["2010037", "Teoría de Grafos", "C", ["2010200"]],
  ["2010041", "Organización y Métodos", "C", ["1803002"]],
  ["2010206", "Métodos y Técnicas de Programación", "C", ["2010003"]],
  // Nivel D
  ["2008029", "Probabilidad y Estadística", "D", ["2008060"]],
  ["2010005", "Taller de Programación en Bajo Nivel", "D", ["2010014"]],
  ["2010015", "Base de Datos I", "D", ["2010041"]],
  ["2010018", "Sistemas de Información I", "D", ["2010206"]],
  ["2010038", "Programación Funcional", "D", ["2008140"]],
  ["2010197", "Algoritmos Avanzados", "D", ["2010037"]],
  // Nivel E
  ["2010016", "Base de Datos II", "E", ["2010015"]],
  ["2010017", "Taller de Sistemas Operativos", "E", ["2010005"]],
  ["2010022", "Sistemas de Información II", "E", ["2010018"]],
  ["2010040", "Teoría de Autómatas y Lenguajes Formales", "E", ["2010005"]],
  ["2010042", "Graficación por Computadora", "E", ["2010197"]],
  ["2010201", "Inteligencia Artificial I", "E", ["2008029", "2010038"]],
  // Nivel F
  ["2010020", "Ingeniería de Software", "F", ["2010022"]],
  ["2010047", "Redes de Computadoras", "F", ["2010017"]],
  ["2010049", "Estructura y Semántica de Lenguajes de Programación", "F", ["2010040"]],
  ["2010053", "Taller de Base de Datos", "F", ["2010016"]],
  ["2010202", "Inteligencia Artificial II", "F", ["2010201"]],
  ["2010203", "Programación Web", "F", ["2010042"]],
  // Nivel G
  ["2010019", "Simulación de Sistemas", "G", ["2010049"], { e: true }],
  ["2010024", "Taller de Ingeniería de Software", "G", ["2010020", "2010053"]],
  ["2010100", "Arquitectura de Software", "G", ["2010203"]],
  ["2010182", "Telefonía IP", "G", ["2010016"], { e: true }],
  ["2010204", "Interacción Humano Computador", "G", ["2010202"]],
  ["2010205", "Tecnología Redes Avanzadas", "G", ["2010047"]],
  // Nivel H
  ["2010033", "Generación de Software", "H", ["2010049"], { e: true }],
  ["2010035", "Aplicación de Sistemas Operativos", "H", ["2010205"], { e: true }],
  ["2010102", "Evaluación y Auditoría de Sistemas", "H", ["2010100"]],
  ["2010214", "Taller de Grado I", "H", ["2010024"]],
  // DP-07: prerrequisito inusual (Contabilidad Básica <- Taller de Ing. de Software).
  // Confirmado contra el pensum oficial 134111. No ofertada en 1/2026.
  ["2016046", "Contabilidad Básica", "H", ["2010024"], { e: true }],
  // Nivel I
  ["2010066", "Procesos Ágiles", "I", ["2010020"], { e: true }],
  ["2010079", "Web Semánticas", "I", ["2010020"], { e: true }],
  ["2010103", "Robótica", "I", ["2010201"], { e: true, sigla: "MAT472" }],
  ["2010174", "Programación Móvil", "I", ["2010047"], { e: true }],
  ["2010209", "Seguridad de Sistemas", "I", ["2010102"], { e: true }],
  // No ofertada en 1/2026.
  ["2010211", "Aplicaciones Interactivas para Televisión Digital", "I", ["2010017"], { e: true }],
  ["2010215", "Taller de Grado II", "I", ["2010102", "2010214"], { t: "taller_titulacion" }],
  ["2010217", "Business Intelligence y Big Data", "I", ["2010020"], { e: true, sigla: "BUSINESS INTELLIGENCE Y BIG DATA" }],
];

// ---------------------------------------------------------------------------
// 2) HORARIO 1/2026. codigo -> [ grupo, ... ]
//    grupo: { id, doc:<string|null>, b:[ bloque, ... ], rol?, vinculo? }
//    bloque: "DIA INICIO AULA"  (p.ej. "MA 945 693B")  -> 90 min
//            { t:"DIA INICIO AULA", tp:"<docente_tp|null>" }  -> sesión [TP] del mismo grupo
//    doc:null = "POR DESIGNAR DOCENTE".
// ---------------------------------------------------------------------------
const POR_DESIGNAR = null;

const HORARIO = {
  // ===== Nivel A =====
  "2008019": [ // Álgebra I
    { id: "10", doc: "Rodríguez Sejas Juan Antonio", b: ["MA 945 693B", "MI 815 692E", "VI 945 692F"] },
    { id: "15", doc: "Carrasco Calvo Alvaro Hernando", b: ["LU 1715 642", "MA 1545 617", "MI 1415 607"] },
    { id: "8", doc: "León Romero Gualberto", b: ["MI 1115 692F", "VI 645 692F", { t: "JU 645 625D", tp: "Aranibar Zambrana Ammy Shalem" }] },
  ],
  "2008054": [ // Cálculo I
    { id: "10", doc: POR_DESIGNAR, b: ["MI 2015 693B", "VI 1845 607", "SA 945 617C"] },
    { id: "11", doc: "Rojas Zurita Ramiro", b: ["LU 645 622", "MA 815 692B", "JU 815 692E"] },
  ],
  "2006063": [ // Física General (teoría B + un laboratorio B1..B6, vinculo FIS-B)
    { id: "B", rol: "teoria", vinculo: "FIS-B", doc: "Valenzuela Miranda Roberto", b: ["MA 1115 612", "MI 1415 692C"] },
    { id: "B1", rol: "laboratorio", vinculo: "FIS-B", doc: POR_DESIGNAR, b: ["JU 645 621"] },
    { id: "B2", rol: "laboratorio", vinculo: "FIS-B", doc: "Ruiz Ucumari Ivan", b: ["LU 945 620"] },
    { id: "B3", rol: "laboratorio", vinculo: "FIS-B", doc: "Ordoñez Salvatierra Miguel Angel", b: ["MA 945 684L6"] },
    { id: "B4", rol: "laboratorio", vinculo: "FIS-B", doc: "Ruiz Ucumari Ivan", b: ["MA 945 621"] },
    { id: "B5", rol: "laboratorio", vinculo: "FIS-B", doc: "Terrazas Vargas Juan Carlos", b: ["MI 1115 618"] },
    { id: "B6", rol: "laboratorio", vinculo: "FIS-B", doc: "Flores Flores Freddy", b: ["MA 1715 620"] },
  ],
  "1803001": [ // Inglés I
    { id: "1", doc: "Céspedes Guizada María Benita", b: ["MA 815 693B", "VI 815 691D"] },
    { id: "2", doc: "Céspedes Guizada María Benita", b: ["MA 1115 692F", "VI 945 693A"] },
    { id: "3", doc: "Peeters Ilonaa Magda Lena", b: ["LU 645 691B", "MI 645 692H"] },
    { id: "4", doc: "Grilo Salvatierra María Estela", b: ["MA 1545 692G", "JU 1415 625D"] },
    { id: "5", doc: "Céspedes Guizada María Benita", b: ["JU 945 692F", "VI 1115 691B"] },
  ],
  "2010010": [ // Introducción a la Programación
    { id: "1", doc: "Salazar Serrudo Carla", b: ["JU 1115 691A", "VI 1115 691E", { t: "VI 1715 623", tp: "Antezana Serrano Dilan Alejandro" }] },
    { id: "10", doc: "Costas Jáuregui Vladimir Abel", b: ["MI 1415 624", "JU 945 691A", { t: "JU 1415 691B", tp: "Ortiz Flores Andy Daniel" }] },
    { id: "2", doc: "Blanco Coca Leticia", b: ["MA 1715 617", "JU 1545 624", { t: "MI 1715 691B", tp: "Zeballos Aldunate Leonel" }] },
    { id: "3", doc: "Ustáriz Vargas Hernán", b: ["LU 1245 607", "MI 1245 612", { t: "VI 1245 624", tp: "Ramos Crespo Mauricio" }] },
    { id: "4", doc: "Villarroel Tapia Henry Frank", b: ["MA 1545 623", "MI 1545 693C", { t: "VI 1715 691E", tp: "Salazar Choque Jorge" }] },
    { id: "5", doc: "Montaño Quiroga Víctor Hugo", b: ["MI 945 690B", "JU 945 623", { t: "SA 945 691C", tp: "Sanabria Ugarte Anahí" }] },
    { id: "6", doc: "Salazar Serrudo Carla", b: ["MI 1715 692D", "JU 1715 691E", { t: "SA 815 617", tp: "Antezana Serrano Dilan Alejandro" }] },
    { id: "7", doc: POR_DESIGNAR, b: ["LU 1845 612", "VI 1845 691E", { t: "MA 1245 690C", tp: POR_DESIGNAR }] },
  ],

  // ===== Nivel B =====
  "2008022": [ // Álgebra II
    { id: "5A", doc: "Salinas Pericón Walter Oscar Gonzalo", b: ["LU 1715 691C", "MA 1715 692A", "JU 1845 690MAT"] },
    { id: "6", doc: "Medina Gamboa Julio", b: ["JU 1115 691B", "VI 1245 691A", { t: "SA 815 692A", tp: "Cruz Achaya María Claudia" }] },
    { id: "8", doc: "Omonte Ojalvo José Roberto", b: ["LU 1115 624", "JU 1415 692B", { t: "MA 1415 692D", tp: "Cruz Achaya María Claudia" }] },
  ],
  "2010013": [ // Arquitectura de Computadoras I
    { id: "1", doc: "Acha Pérez Samuel", b: ["LU 1545 692C", "MA 1715 691D"] },
    { id: "2", doc: "Blanco Coca Leticia", b: ["LU 1415 691B", "JU 1415 624"] },
  ],
  "2008056": [ // Cálculo II
    { id: "12", doc: "Martínez Maida Amílcar Saúl", b: ["MA 645 693D", "SA 815 692D", { t: "VI 1245 617C", tp: "Flores Encinas Jonathan Milton" }] },
    { id: "6", doc: "Terrazas Lobo Juan", b: ["MI 945 691D", "JU 1115 693D", { t: "MI 1415 625C", tp: "Sosa Marze David Saúl" }] },
  ],
  "2010003": [ // Elementos de Programación y Estructura de Datos
    { id: "1", doc: "Torrico Bascopé Rosemary", b: ["MA 815 617", "VI 815 690C", { t: "MI 1115 691F", tp: "Cuenca Vargas Fernando" }] },
    { id: "2", doc: "Blanco Coca Leticia", b: ["LU 1245 623", "JU 1245 624", { t: "MI 1545 623", tp: "Ortiz Flores Andy Daniel" }] },
    { id: "3", doc: "Blanco Coca Leticia", b: ["MA 1845 622", "MI 645 691C", { t: "JU 1245 690C", tp: "Sanabria Ugarte Anahí" }] },
    { id: "5", doc: POR_DESIGNAR, b: ["MA 1245 690E", "VI 645 692C", { t: "VI 1415 617", tp: POR_DESIGNAR }] },
  ],
  "1803002": [ // Inglés II
    { id: "1", doc: "Peeters Ilonaa Magda Lena", b: ["MA 945 691B", "JU 645 661"] },
    { id: "2", doc: "Peeters Ilonaa Magda Lena", b: ["JU 945 691B", "VI 945 691C"] },
    { id: "3", doc: "Peeters Ilonaa Magda Lena", b: ["MA 645 692G", "VI 645 692H"] },
  ],
  "2010200": [ // Programación
    { id: "1", doc: "Torrico Bascopé Rosemary", b: ["LU 1115 691F", "MI 645 691B", "VI 1115 691A"] },
  ],

  // ===== Nivel C =====
  "2010014": [ // Arquitectura de Computadoras II
    { id: "1", doc: "Agreda Corrales Luis Roberto", b: ["MA 1545 691F", "JU 1715 692C"] },
  ],
  "2008060": [ // Cálculo Numérico
    { id: "2", doc: "Juchani Bazualdo Demetrio", b: ["LU 1415 622", "MA 1115 693A", "JU 645 693D"] },
    { id: "3", doc: "Zabalaga Montaño Oscar A.", b: ["LU 815 617", "MA 1545 692H", "MI 1545 690D"] },
  ],
  "2008140": [ // Lógica
    { id: "1", doc: "Hoepfner Reynolds Mauricio", b: ["LU 645 617C", "MA 645 607", { t: "JU 1415 690B", tp: "Álvarez Rojas Alexander James" }] },
  ],
  "2010206": [ // Métodos y Técnicas de Programación
    { id: "1", doc: "Flores Villarroel Corina", b: ["LU 1115 652", "MA 815 625D", "MI 815 652"] },
    { id: "2", doc: "Manzur Soria Carlos B.", b: ["LU 645 625C", "VI 645 651", "SA 645 607"] },
    { id: "5", doc: "Montoya Burgos Yony Richard", b: ["LU 1245 690E", "MI 1245 INFLAB", "JU 1845 INFLAB"] },
  ],
  "2010041": [ // Organización y Métodos
    { id: "1", doc: "Camacho del Castillo Indira", b: ["MA 815 690E", "JU 815 660"] },
  ],
  "2010037": [ // Teoría de Grafos
    { id: "1", doc: "Montoya Burgos Yony Richard", b: ["LU 645 690E", "JU 645 690E", { t: "JU 1245 690B", tp: "Brun de la Fuente Denis Giovani" }] },
  ],

  // ===== Nivel D =====
  "2010197": [ // Algoritmos Avanzados
    { id: "1", doc: "Blanco Coca Leticia", b: ["MA 645 691C", "JU 645 690D", "VI 645 693D"] },
  ],
  "2010015": [ // Base de Datos I
    { id: "1", doc: "Aparicio Yuja Tatiana", b: ["MA 1245 691B", "MI 1245 691B", "JU 1245 693D"] },
    { id: "2", doc: POR_DESIGNAR, b: ["LU 645 692H", "MA 645 693B", "VI 645 692D"] },
  ],
  "2008029": [ // Probabilidad y Estadística
    { id: "3", doc: "Delgadillo Cossío David Alfredo", b: ["LU 2015 623", "MA 2015 612", "MI 1715 693A"] },
    { id: "4", doc: "Omonte Ojalvo José Roberto", b: ["LU 945 612", "MA 1245 624", "VI 945 642"] },
  ],
  "2010038": [ // Programación Funcional
    { id: "1", doc: "Aparicio Yuja Tatiana", b: ["LU 815 625D", "MA 1415 690D", "MI 645 612"] },
  ],
  "2010018": [ // Sistemas de Información I
    { id: "1", doc: "Salazar Serrudo Carla", b: ["MI 1545 692B", "JU 945 607", "VI 945 691E"] },
    { id: "2", doc: "Salazar Serrudo Carla", b: ["LU 1715 691B", "MA 1715 693D", "MI 1845 617"] },
  ],
  "2010005": [ // Taller de Programación en Bajo Nivel
    { id: "1", doc: POR_DESIGNAR, b: ["MA 1545 691B", "JU 1545 691E", "VI 1545 691F"] },
  ],

  // ===== Nivel E =====
  "2010016": [ // Base de Datos II
    { id: "1", doc: "Aparicio Yuja Tatiana", b: ["LU 645 617B", "MA 645 691F", "MI 815 617B"] },
    { id: "2", doc: "Aparicio Yuja Tatiana", b: ["LU 1245 692B", "MA 815 INFLAB", "MI 945 612"] },
  ],
  "2010042": [ // Graficación por Computadora
    { id: "1", doc: POR_DESIGNAR, b: ["LU 645 INFLAB", "MI 2015 691D", "VI 2015 INFLAB"] },
  ],
  "2010201": [ // Inteligencia Artificial I
    { id: "1", doc: "García Pérez Carmen Rosa", b: ["MA 1115 692D", "MI 945 692A", "JU 1115 692D"] },
    { id: "2", doc: "Rodríguez Bilbao Erika Patricia", b: ["LU 1245 691C", "MA 1245 690B", "MI 1245 692C"] },
  ],
  "2010022": [ // Sistemas de Información II
    { id: "1", doc: "Flores Solíz Juan Marcelo", b: ["MA 645 690E", "MI 645 690D", "VI 645 691C"] },
    { id: "2", doc: "Jaldín Rosales K. Rolando", b: ["MI 815 690E", "JU 945 690E", "VI 945 690E"] },
  ],
  "2010017": [ // Taller de Sistemas Operativos
    { id: "1", doc: "Orellana Aráoz Jorge Walter", b: ["MI 815 INFLAB", "JU 815 691F", "VI 1415 691C"] },
    { id: "2", doc: "Orellana Aráoz Jorge Walter", b: ["LU 815 623", "MI 1415 691A", "VI 815 624"] },
    { id: "3", doc: "Cussi Nicolás Grover Humberto", b: ["LU 1845 INFLAB", "MA 1845 691E", "JU 2015 691A"] },
  ],
  "2010040": [ // Teoría de Autómatas y Lenguajes Formales
    { id: "1", doc: "Montaño Quiroga Víctor Hugo", b: ["LU 945 692H", "MA 945 617C", "JU 1115 691D"] },
  ],

  // ===== Nivel F =====
  "2010049": [ // Estructura y Semántica de Lenguajes de Programación
    { id: "1", doc: "Romero Rodríguez Patricia", b: ["LU 1115 617B", "MI 1115 617B", "JU 1115 692H"] },
  ],
  "2010020": [ // Ingeniería de Software
    { id: "1", doc: "Camacho del Castillo Indira", b: ["MA 645 651", "MI 645 652", "JU 645 692D"] },
    { id: "2", doc: "Torrico Bascopé Rosemary", b: ["MA 1115 690B", "MI 945 INFLAB", "VI 945 691D"] },
  ],
  "2010202": [ // Inteligencia Artificial II
    { id: "2", doc: "García Pérez Carmen Rosa", b: ["MA 1245 691C", "MI 1115 690B", "JU 1245 691A"] },
  ],
  "2010203": [ // Programación Web
    { id: "1", doc: "Costas Jáuregui Vladimir Abel", b: ["MA 815 691B", "MI 815 692G", "JU 815 692G"] },
  ],
  "2010047": [ // Redes de Computadoras
    { id: "1", doc: "Orellana Aráoz Jorge Walter", b: ["LU 1415 692B", "MI 945 693A", "VI 945 692C"] },
    { id: "2", doc: "Orellana Aráoz Jorge Walter", b: ["LU 945 691B", "MA 945 693A", "JU 945 691C"] },
  ],
  "2010053": [ // Taller de Base de Datos
    { id: "1", doc: POR_DESIGNAR, b: ["MI 1715 690D", "JU 1715 693C"] },
    { id: "2", doc: POR_DESIGNAR, b: ["MI 1845 692C", "JU 1845 693B"] },
    { id: "3", doc: "Flores Solíz Juan Marcelo", b: ["LU 645 690B", "JU 645 690B"] },
    { id: "4", doc: "Calancha Navia Boris", b: ["MI 1245 INFLAB", "JU 1245 INFLAB"] },
  ],

  // ===== Nivel G =====
  "2010100": [ // Arquitectura de Software
    { id: "1", doc: "Antezana Camacho Marcelo", b: ["LU 1245 INFLAB", "MA 1245 INFLAB", "MI 815 INFLAB"] },
  ],
  "2010204": [ // Interacción Humano Computador
    { id: "1", doc: "Flores Villarroel Corina", b: ["MA 645 690D", "JU 1845 690E"] },
  ],
  "2010019": [ // Simulación de Sistemas (electiva)
    { id: "1", doc: "Villarroel Tapia Henry Frank", b: ["LU 1415 692G", "MI 645 651"] },
  ],
  "2010024": [ // Taller de Ingeniería de Software
    { id: "1", doc: "Flores Villarroel Corina", b: ["LU 945 690D", "MA 945 690E"] },
    { id: "2", doc: "Blanco Coca Leticia", b: ["MA 815 651", "MI 815 INFLAB"] },
  ],
  "2010205": [ // Tecnología Redes Avanzadas
    { id: "1", doc: POR_DESIGNAR, b: ["MA 1415 691D", "MI 1415 661", "JU 1415 691E"] },
  ],
  "2010182": [ // Telefonía IP (electiva)
    { id: "1", doc: "Montoya Burgos Yony Richard", b: ["LU 2015 693B", "MA 2015 INFLAB"] },
  ],

  // ===== Nivel H =====
  "2010035": [ // Aplicación de Sistemas Operativos (electiva)
    { id: "1", doc: "Cussi Nicolás Grover Humberto", b: ["LU 2015 691E", "VI 1845 693D"] },
    { id: "2", doc: "Cussi Nicolás Grover Humberto", b: ["LU 1245 693B", "JU 1845 690B"] },
  ],
  "2010102": [ // Evaluación y Auditoría de Sistemas
    { id: "1", doc: "Romero Rodríguez Patricia", b: ["MA 1115 691F", "MI 815 690B", "JU 815 690C"] },
    { id: "2", doc: "Villarroel Novillo Jimmy", b: ["LU 1545 692F", "MA 815 691D", "MI 945 661"] },
  ],
  "2010033": [ // Generación de Software (electiva)
    { id: "1", doc: "Costas Jáuregui Vladimir Abel", b: ["MA 1415 607", "MI 945 692C"] },
  ],
  "2010214": [ // Taller de Grado I
    { id: "6", doc: "Flores Villarroel Corina", b: ["LU 1715 690E", "MI 1115 690E", "JU 1715 690E"] },
    { id: "7", doc: "Romero Rodríguez Patricia", b: ["LU 945 617C", "MA 815 690C", "JU 945 690C"] },
  ],

  // ===== Nivel I =====
  "2010217": [ // Business Intelligence y Big Data (electiva)
    { id: "1", doc: "Escalera Fernández David", b: ["MI 645 INFLAB", "VI 645 691F"] },
  ],
  "2010066": [ // Procesos Ágiles (electiva)
    { id: "1", doc: "Cussi Nicolás Grover Humberto", b: ["MA 2015 692E", "VI 2015 691B"] },
  ],
  "2010174": [ // Programación Móvil (electiva)
    { id: "1", doc: "Fiorilo Lozada Américo", b: ["MA 2015 691C", "VI 2015 691E"] },
  ],
  "2010103": [ // Robótica (electiva)
    { id: "1", doc: "García Pérez Carmen Rosa", b: ["MA 945 692F", "JU 945 692G"] },
  ],
  "2010209": [ // Seguridad de Sistemas (electiva)
    { id: "1", doc: "Antezana Camacho Marcelo", b: ["LU 1115 INFLAB", "MA 1115 INFLAB"] },
  ],
  "2010215": [ // Taller de Grado II (titulación)
    { id: "2", doc: "Montaño Quiroga Víctor Hugo", b: ["MA 1115 INFLAB", "JU 815 INFDEP"] },
    { id: "3", doc: "García Pérez Carmen Rosa", b: ["MI 1245 690E", "JU 815 690E"] },
    { id: "4", doc: "Romero Rodríguez Patricia", b: ["LU 1245 692G", "MA 945 625C"] },
  ],
  "2010079": [ // Web Semánticas (electiva)
    { id: "1", doc: "Rodríguez Bilbao Erika Patricia", b: ["LU 1115 691C", "MI 1415 692D"] },
  ],
};

// ---------------------------------------------------------------------------
// 3) Transformación a esquema canónico
// ---------------------------------------------------------------------------
const DIAS = new Set(["LU", "MA", "MI", "JU", "VI", "SA"]);

/** "945" -> 585 (minutos desde 00:00). Acepta 3 o 4 dígitos. */
function startToMinutes(token) {
  if (!/^\d{3,4}$/.test(token)) throw new Error(`Hora inválida: "${token}"`);
  const mm = Number(token.slice(-2));
  const hh = Number(token.slice(0, -2));
  if (hh > 23 || mm > 59) throw new Error(`Hora fuera de rango: "${token}"`);
  return hh * 60 + mm;
}

/** 585 -> "09:45" */
function minutesToHHMM(min) {
  const hh = String(Math.floor(min / 60)).padStart(2, "0");
  const mm = String(min % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

const BLOQUE_MINUTOS = 90;

/** Convierte "MA 945 693B" (o el campo .t de un TP) en {dia, inicio, fin, aula}. */
function parseBloque(spec) {
  const [dia, inicio, ...aulaParts] = spec.trim().split(/\s+/);
  const aula = aulaParts.join(" ");
  if (!DIAS.has(dia)) throw new Error(`Día inválido en "${spec}"`);
  if (!aula) throw new Error(`Aula faltante en "${spec}"`);
  const startMin = startToMinutes(inicio);
  return {
    dia,
    inicio: minutesToHHMM(startMin),
    fin: minutesToHHMM(startMin + BLOQUE_MINUTOS),
    aula,
  };
}

function buildGrupo(g) {
  const bloques = g.b.map((entry) => {
    if (typeof entry === "string") return parseBloque(entry);
    // Sesión [TP] del mismo grupo
    const bloque = parseBloque(entry.t);
    bloque.tipo = "TP";
    if (entry.tp !== undefined && entry.tp !== g.doc) {
      bloque.docente_tp = entry.tp;
      bloque.docente_tp_id = entry.tp ? slugDocente(entry.tp) : null;
    }
    return bloque;
  });
  return {
    id: g.id,
    rol: g.rol ?? "completo",
    vinculo: g.vinculo ?? null,
    docente: g.doc ?? null,
    docente_id: g.doc ? slugDocente(g.doc) : null, // id estable; null = por designar
    bloques,
  };
}

function buildMateria([codigo, nombre, nivel, prerrequisitos, opts = {}]) {
  const grupos = (HORARIO[codigo] ?? []).map(buildGrupo);
  return {
    codigo,
    nombre,
    nivel,
    tipo: opts.t ?? "regular",
    es_electiva: opts.e ?? false,
    sigla: opts.sigla ?? null,
    prerrequisitos,
    ofertada: grupos.length > 0, // false = no ofertada en esta gestión
    grupos,
  };
}

const materias = PENSUM.map(buildMateria);
const { registro: docentes } = construirRegistroDocentes(materias);

const dataset = {
  _meta: {
    descripcion:
      "Dataset canónico: pensum 134111 (54 materias + prerrequisitos) enriquecido con la oferta de grupos/horarios de la gestión 1/2026. Generado por tools/build-dataset.mjs.",
    plan: "134111",
    carrera: "Lic. en Ingeniería Informática - FCyT UMSS",
    gestion: "1/2026",
    fuentes: [
      "Horario de Clases 1/2026 - Procesado CPD, FCyT UMSS (data/sources/horario-1-2026.pdf)",
      "Pensum de Materias plan 134111 - webSISS UMSS (data/sources/pensum-134111.pdf)",
    ],
    generado: new Date().toISOString().slice(0, 10),
    notas: [
      "Cada bloque dura 90 min; la hora de fin se calcula a partir del inicio.",
      "docente:null = 'POR DESIGNAR DOCENTE'.",
      "docente_id = slug del nombre (sin acentos/caso); las reseñas se atan a (docente_id, materia), no al texto. Ver dataset.docentes.",
      "Materias con ofertada:false no tienen grupos en 1/2026 (2016046, 2010211); se incluyen para el pensum/roadmap.",
      "Física General (2006063): teoría 'B' + un laboratorio 'B1'..'B6' del mismo vínculo 'FIS-B'.",
    ],
  },
  docentes,
  materias,
};

const outPath = resolve(ROOT, "data", "horario-1-2026.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(dataset, null, 2) + "\n", "utf8");

console.log(`OK  ${materias.length} materias -> ${outPath}`);
console.log(`    docentes:  ${docentes.length}`);
console.log(`    ofertadas: ${materias.filter((m) => m.ofertada).length}`);
console.log(`    grupos:    ${materias.reduce((n, m) => n + m.grupos.length, 0)}`);
console.log(`    bloques:   ${materias.reduce((n, m) => n + m.grupos.reduce((k, g) => k + g.bloques.length, 0), 0)}`);
