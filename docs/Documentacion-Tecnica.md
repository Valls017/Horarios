# Documentación técnica — Semester Draft

Artefactos de diseño que la Especificación marcaba como *“evidencia a completar
durante el desarrollo”*: modelo entidad–relación y diagramas de arquitectura (C4).
Los diagramas usan **Mermaid** (se renderizan en GitHub y en VS Code con la
extensión de Markdown Preview Mermaid).

> **Dos planos de datos.** El **catálogo** (horario + pensum) vive como **JSON
> estático** versionado (no es base de datos); la **persistencia** (cuentas,
> reseñas, aprobadas, horarios guardados) vive en **Supabase (PostgreSQL)**.

---

## 1. Modelo Entidad–Relación (ERD)

```mermaid
erDiagram
    MATERIA  ||--o{ GRUPO          : "ofrece"
    GRUPO    ||--|{ BLOQUE         : "se dicta en"
    MATERIA  ||--o{ PRERREQUISITO  : "exige (AND)"
    MATERIA  ||--o{ PRERREQUISITO  : "es previa de"
    DOCENTE  ||--o{ GRUPO          : "dicta (o 'por designar')"

    USUARIO          ||--o{ RESENA            : "escribe"
    DOCENTE          ||--o{ RESENA            : "recibe"
    MATERIA          ||--o{ RESENA            : "sobre"
    USUARIO          ||--o{ APROBADA          : "marca"
    MATERIA          ||--o{ APROBADA          : "referida en"
    USUARIO          ||--o{ HORARIO_GUARDADO  : "guarda"

    MATERIA {
        string codigo PK "7 dígitos"
        string nombre
        string nivel "A..I"
        string tipo "regular | taller_titulacion"
        bool   es_electiva
        bool   ofertada
        string sigla
    }
    GRUPO {
        string id "ej. 10, B, B1"
        string rol "completo | teoria | laboratorio | practica"
        string vinculo "agrupa teoría+lab (ej. FIS-B)"
        string docente_id FK "slug o null = por designar"
    }
    BLOQUE {
        string dia "LU..SA"
        string inicio "HH:MM"
        string fin "HH:MM"
        string aula
        string tipo "opcional: TP"
    }
    PRERREQUISITO {
        string materia FK
        string previa FK
    }
    DOCENTE {
        string docente_id PK "slug estable del nombre"
        string nombre
    }
    USUARIO {
        uuid id PK "auth.users (Supabase)"
        string email "@est.umss.edu para reseñar"
    }
    RESENA {
        uuid   id PK
        uuid   user_id FK
        string docente_id
        string materia_codigo
        int    calificacion "1..5"
        string comentario
        timestamp created_at
    }
    APROBADA {
        uuid   user_id FK
        string materia_codigo
    }
    HORARIO_GUARDADO {
        uuid   id PK
        uuid   user_id FK
        string nombre
        json   datos "materias + grupos fijados"
    }
```

**Reglas clave del modelo**
- Una materia se **habilita** cuando *todas* sus previas (`PRERREQUISITO`) están aprobadas (AND).
- `vinculo` modela teoría + laboratorio como **paquete** (selección válida = 1 teoría + 1 lab del mismo vínculo, p. ej. Física General).
- `RESENA` es única por `(user_id, docente_id, materia_codigo)` y **anónima** hacia otros (se lee por vistas sin `user_id`).
- `docente_id` es un **slug** del nombre: estable ante correcciones de acento.

---

## 2. Arquitectura — C4

### Nivel 1 · Contexto

```mermaid
graph TD
    visitante["👤 Visitante<br/>(sin cuenta)"]
    estudiante["🎓 Estudiante UMSS<br/>(cuenta @est.umss.edu)"]
    admin["🛠️ Administrador<br/>(mantiene los datos)"]

    sd(["<b>Semester Draft</b><br/>Arma horarios, reseñas y<br/>recomendación de semestre"])

    supabase["☁️ Supabase<br/>(Auth + PostgreSQL + RLS)"]
    cdn["📦 esm.sh<br/>(CDN del cliente Supabase)"]
    fuentes["📄 CPD-FCyT / webSISS<br/>(horario + pensum)"]

    visitante -->|navega catálogo, ve reseñas| sd
    estudiante -->|arma, califica, guarda| sd
    admin -->|edita datos por gestión| sd
    sd -->|cuentas, reseñas, datos| supabase
    sd -->|importa cliente| cdn
    fuentes -.->|fuente de los datos| admin
```

### Nivel 2 · Contenedores

```mermaid
graph TD
    subgraph navegador["🌐 Navegador del estudiante"]
        spa["<b>SPA</b> — Vanilla JS + ES6<br/>(sin build)"]
        json["📁 Datos del catálogo<br/>horario-1-2026.json (estático)"]
    end

    pages["🚀 GitHub Pages<br/>(hosting estático)"]
    supabase["☁️ Supabase<br/>Auth · PostgreSQL · RLS"]
    cdn["📦 esm.sh (CDN)"]

    pages -->|sirve HTML/CSS/JS + JSON| spa
    spa -->|fetch| json
    spa -->|REST/Auth (HTTPS)| supabase
    spa -->|import dinámico| cdn
```

### Nivel 3 · Componentes (dentro de la SPA)

```mermaid
graph TD
    main["main.js<br/>(arranque + render loop)"]
    estado["state/estado.js<br/>(store observable)"]

    subgraph datos["data/ (capa de datos)"]
        dataset["dataset · tiempo · modelo"]
        prereq["prerequisitos · filtros"]
        valid["validacion · docentes"]
        sb["supabase · auth · resenas<br/>aprobadas · horarios"]
    end

    subgraph motor["motor/ (puro, sin DOM)"]
        slots["slots · unidades"]
        gen["generador · ranking · filtros · plan"]
    end

    subgraph render["render/ (estado → HTML)"]
        vistas["catalogo · materia · armador<br/>avance · docentes · resenas · auth"]
    end

    subgraph eventos["events/"]
        router["router (hash)"]
        ui["filtros · armador · avance · auth · resenas"]
    end

    main --> estado
    main --> render
    main --> eventos
    eventos --> estado
    estado --> motor
    estado --> sb
    render --> datos
    render --> motor
    motor --> datos
    sb --> cdn["esm.sh (CDN)"]
```

**Principios de la arquitectura**
- **Datos como configuración** (D1): horario y pensum se editan como datos, sin tocar lógica.
- **Motor puro sin DOM**: testeable en Node; la UI lo consume, nunca al revés.
- **Cliente Supabase perezoso**: se importa del CDN solo al usar auth/reseñas, así el catálogo y el armador funcionan aunque el CDN falle.
- **Sin dependencias ni build**: Vanilla JS + módulos ES6.
