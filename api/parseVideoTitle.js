import './loadEnv.js';
import { parseJsonBody } from './parseJsonBody.js';
import { parseVideoTitle } from '../src/lib/parseVideoTitle.js';

/** Log Haiku prompt/reply unless DEBUG_HAIKU_PROMPT=0 (opt-out). */
function shouldLogHaikuPrompt() {
  const v = process.env.DEBUG_HAIKU_PROMPT;
  return v !== '0' && v !== 'false' && String(v).toLowerCase() !== 'no';
}

function regexOnly(title, channel) {
  const fb = parseVideoTitle(title, channel);
  return { artist: fb.artist, song: fb.song, source: 'regex' };
}

/**
 * One Haiku call when user creates a lesson. Uses search query + video title + channel.
 */
async function parseWithHaiku(title, channel, searchQuery) {
  const apiKey =
    process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
  const t = String(title || '').slice(0, 220);
  const c = String(channel || '').slice(0, 100);
  const q = String(searchQuery || '').trim().slice(0, 200);

  if (!apiKey) {
    console.log('[api/parseVideoTitle] Haiku skipped (no ANTHROPIC_API_KEY), using regex');
    return regexOnly(t, c);
  }

  const userContent = `JSON only, no markdown. Keys: {a,s} (a=artist, s=song).
q = what the user typed in the search box before choosing this video (may be empty).
t = YouTube video title. c = channel name.
Use q, t, and c together to infer the real recording artist and song title. Prefer q when it clearly names the song or artist; use t/c to disambiguate. Strip lesson/tutorial/guitar/chords/cover/live noise from a and s.
${JSON.stringify({ q, t, c })}`;

  if (shouldLogHaikuPrompt()) {
    console.log('[api/parseVideoTitle] Haiku prompt:\n', userContent);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    const data = await response.json();
    if (!response.ok || data?.error) {
      console.warn('[api/parseVideoTitle] Haiku API error', {
        status: response.status,
        error: data?.error,
      });
      return regexOnly(t, c);
    }

    const text = data.content?.[0]?.text?.trim() ?? '';
    if (shouldLogHaikuPrompt()) {
      console.log('[api/parseVideoTitle] Haiku reply:', text.slice(0, 2000));
    }
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    const artist = String(parsed?.a ?? parsed?.artist ?? '').trim();
    const song = String(parsed?.s ?? parsed?.song ?? '').trim();
    console.log('[api/parseVideoTitle] parsed (haiku only, no regex merge)', {
      song,
      artist,
      titlePreview: t.slice(0, 48),
    });
    return { artist, song, source: 'haiku' };
  } catch (e) {
    console.warn('[api/parseVideoTitle] Haiku parse error', e?.message || e);
    return regexOnly(t, c);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, channel, searchQuery } = parseJsonBody(req.body);
  const rawTitle = String(title ?? '').trim();
  if (!rawTitle) {
    return res.status(400).json({ error: 'title required' });
  }

  const ch = String(channel ?? '').trim();
  const sq = String(searchQuery ?? '').trim();
  const { artist, song, source } = await parseWithHaiku(rawTitle, ch, sq);

  return res.status(200).json({
    artist: artist || '',
    song: song || '',
    source: source || 'regex',
  });
}
