import type { RequestHandler } from 'express';
import { UI_BUNDLE } from './generated/ui-bundle.js';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
  '.txt':  'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map':  'application/json',
};

function ext(p: string): string {
  const i = p.lastIndexOf('.');
  return i >= 0 ? p.slice(i) : '';
}

const decoded = new Map<string, Buffer>();
function bytes(path: string): Buffer | null {
  const cached = decoded.get(path);
  if (cached) return cached;
  const b64 = UI_BUNDLE[path];
  if (!b64) return null;
  const b = Buffer.from(b64, 'base64');
  decoded.set(path, b);
  return b;
}

export function hasBundle(): boolean {
  return Object.keys(UI_BUNDLE).length > 0;
}

/** Serve embedded UI files. Falls through to /api when no bundle is present. */
export function staticHandler(): RequestHandler {
  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api/')) return next();

    let p = req.path;
    if (p === '/' || p === '') p = '/index.html';

    let b = bytes(p);
    if (!b) {
      // SPA fallback: route under /something with no extension → index.html
      const hasExt = ext(p).length > 0;
      if (!hasExt) b = bytes('/index.html');
    }
    if (!b) return next();

    res.setHeader('Content-Type', MIME[ext(p) || '.html'] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.send(b);
  };
}
