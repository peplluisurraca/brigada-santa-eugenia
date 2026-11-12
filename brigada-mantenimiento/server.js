import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ARREL = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? '127.0.0.1';

const TIPUS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

const servidor = createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end();
      return;
    }
    const pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname);
    let fitxer = normalize(join(ARREL, pathname));
    if (!fitxer.startsWith(ARREL)) {
      res.writeHead(403).end('Accés denegat');
      return;
    }
    const info = await stat(fitxer).catch(() => null);
    if (info?.isDirectory()) {
      fitxer = join(fitxer, 'index.html');
    }
    const cos = await readFile(fitxer);
    res.writeHead(200, {
      'Content-Type': TIPUS[extname(fitxer).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(req.method === 'HEAD' ? undefined : cos);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Fitxer no trobat (404)');
  }
});

servidor.listen(PORT, HOST, () => {
  console.log(`==========================================================`);
  console.log(` Servidor Web de la Brigada Municipal de Santa Eugènia`);
  console.log(` Disponible a: http://${HOST}:${PORT}/`);
  console.log(` Arrel de fitxers: ${ARREL}`);
  console.log(`==========================================================`);
});
