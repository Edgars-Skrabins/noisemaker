import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

export const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
});

export function portFromEnv(value, fallback = 5173) {
  return Number(value) || fallback;
}

export function contentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

function isInside(base, filePath) {
  return filePath.startsWith(base + path.sep);
}

export function resolvePath(root, requestUrl) {
  const base = path.resolve(root);
  let pathname;
  try {
    pathname = decodeURIComponent(String(requestUrl).split(/[?#]/)[0]);
  } catch {
    return null;
  }
  if (!pathname.startsWith('/') || pathname.includes('\0') || pathname.includes('\\')) return null;
  if (pathname.split('/').some((segment) => segment.startsWith('.'))) return null;
  if (pathname.endsWith('/')) pathname += 'index.html';
  const resolved = path.resolve(base, '.' + pathname);
  if (!isInside(base, resolved)) return null;
  return resolved;
}

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}

export function createStaticServer(root) {
  const base = path.resolve(root);
  const realBase = fs.realpathSync(base);
  return http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method not allowed');
      return;
    }
    const filePath = resolvePath(base, req.url);
    if (!filePath) return notFound(res);
    fs.realpath(filePath, (err, realPath) => {
      if (err || !isInside(realBase, realPath)) return notFound(res);
      fs.stat(realPath, (statErr, stats) => {
        if (statErr) return notFound(res);
        if (stats.isDirectory() && !req.url.split(/[?#]/)[0].endsWith('/')) {
          const [rawPath, ...query] = req.url.split('?');
          res.writeHead(301, { Location: rawPath.replace(/^\/+/, '/') + '/' + (query.length ? '?' + query.join('?') : '') });
          res.end();
          return;
        }
        if (!stats.isFile()) return notFound(res);
        res.writeHead(200, {
          'Content-Type': contentType(filePath),
          'Content-Length': stats.size,
          'Cache-Control': 'no-store',
        });
        if (req.method === 'HEAD') return res.end();
        fs.createReadStream(realPath).on('error', () => res.destroy()).pipe(res);
      });
    });
  });
}
