#!/usr/bin/env node
/* Minimal static file server for previewing dist/ locally. */

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const dist = resolve(import.meta.dirname, "..", "dist");
const port = Number(process.env.PORT ?? 4630);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

async function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(
    /^(\.\.[/\\])+/,
    ""
  );
  const candidates = clean.endsWith("/")
    ? [join(dist, clean, "index.html")]
    : [join(dist, clean), join(dist, clean, "index.html")];

  for (const candidate of candidates) {
    if (!candidate.startsWith(dist)) continue;
    try {
      const info = await stat(candidate);
      if (info.isFile()) return candidate;
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

createServer(async (request, response) => {
  const file = await resolveFile(request.url ?? "/");
  if (!file) {
    response.writeHead(404, { "content-type": TYPES[".html"] });
    createReadStream(join(dist, "404.html")).pipe(response);
    return;
  }
  response.writeHead(200, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream"
  });
  createReadStream(file).pipe(response);
}).listen(port, () => {
  console.log(`Serving dist/ on http://localhost:${port}`);
});
