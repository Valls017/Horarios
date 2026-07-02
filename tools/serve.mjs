// serve.mjs — servidor estático mínimo para desarrollo (sin dependencias).
// `npm run dev` -> http://localhost:5173
// Necesario porque el navegador bloquea fetch() de JSON sobre file://.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 5173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

const servidor = createServer(async (req, res) => {
  try {
    let rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (rel === "/") rel = "/index.html";
    // Evita salir de ROOT (path traversal).
    const ruta = normalize(resolve(ROOT, "." + rel));
    if (!ruta.startsWith(ROOT)) { res.writeHead(403); return res.end("403"); }

    const cuerpo = await readFile(ruta);
    res.writeHead(200, { "content-type": MIME[extname(ruta)] || "application/octet-stream" });
    res.end(cuerpo);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("404 No encontrado");
  }
});

servidor.listen(PORT, () => {
  console.log(`Sirviendo en http://localhost:${PORT}  (Ctrl+C para salir)`);
});
