/**
 * Proxies YouTube search suggestions (Google suggestqueries) — avoids browser CORS.
 * Response shape: ["query", ["suggestion1", ...], ...]
 */
import { parseJsonBody } from './parseJsonBody.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let raw;
  if (req.method === 'GET') {
    raw = req.query?.q ?? req.query?.query;
  } else {
    const body = parseJsonBody(req.body);
    raw = body?.query ?? body?.q;
  }
  const q = typeof raw === 'string' ? raw.trim() : '';

  if (q.length < 2) {
    return res.status(200).json({ suggestions: [] });
  }

  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    const text = await r.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      const cleaned = text.replace(/^\)\]\}'\s*\n?/, '').trim();
      data = JSON.parse(cleaned);
    }

    const list = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
    const suggestions = [...new Set(list.map((s) => String(s).trim()))].filter(Boolean).slice(0, 10);

    return res.status(200).json({ suggestions });
  } catch {
    return res.status(200).json({ suggestions: [] });
  }
}
