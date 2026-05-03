import { access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Minimal res.status(n).json() adapter matching Vercel /api handlers in this repo.
 * @param {import('node:http').ServerResponse} res
 */
function createResAdapter(res) {
  return {
    status(code) {
      res.statusCode = code;
      return {
        json(payload) {
          if (res.writableEnded) return;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(payload));
        },
      };
    },
  };
}

/** @param {import('node:http').IncomingMessage} req */
async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const buf = Buffer.concat(chunks);
  if (buf.length === 0) return undefined;
  const ct = req.headers['content-type'] || '';
  if (ct.includes('application/json')) {
    try {
      return JSON.parse(buf.toString('utf8'));
    } catch {
      return buf;
    }
  }
  return buf;
}

/**
 * Runs `api/*.js` default handlers inside `vite` so `/api/youtube` etc. work without `vercel dev`.
 * @param {{ root: string }} opts
 */
export function localApiPlugin({ root }) {
  const apiRoot = path.join(root, 'api');
  const seen = new WeakMap();

  return {
    name: 'local-api',
    apply: 'serve',
    configureServer(server) {
      if (seen.has(server)) return;
      seen.set(server, true);

      server.middlewares.use(async (req, res, next) => {
        const pathname = (req.url || '').split('?')[0] || '';
        if (!pathname.startsWith('/api/')) {
          next();
          return;
        }

        const name = pathname.slice('/api/'.length).replace(/\/+$/, '');
        if (!name || !/^[a-zA-Z0-9_-]+$/.test(name)) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Not found' }));
          return;
        }

        const apiPath = path.join(apiRoot, `${name}.js`);
        try {
          await access(apiPath, fsConstants.R_OK);
        } catch {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: `Unknown API route: ${name}` }));
          return;
        }

        let body;
        if (req.method && !['GET', 'HEAD'].includes(req.method)) {
          body = await readRequestBody(req);
        }

        const url = new URL(req.url || '/', 'http://vite.local');
        const query = Object.fromEntries(url.searchParams.entries());
        const wrappedReq = Object.assign(req, { query, body });
        const adapter = createResAdapter(res);

        try {
          const mod = await import(pathToFileURL(apiPath).href);
          const handler = mod.default;
          if (typeof handler !== 'function') {
            throw new Error(`api/${name}.js has no default handler`);
          }
          await Promise.resolve(handler(wrappedReq, adapter));
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'Handler did not send a response' }));
          }
        } catch (err) {
          console.error('[local-api]', req.method, pathname, err);
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: String(err?.message || err) }));
          }
        }
      });
    },
  };
}
