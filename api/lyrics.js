/**
 * POST /api/lyrics — body: { song, artist }
 *
 * `fetchLyricsFromSong` (lyricsShared.js) applies this chain for lyrics.ovh:
 *   1) GET /v1/{artist}/{song}
 *   2) swap artist ↔ song
 *   3) GET /suggest/{song}, then /v1/{suggestedArtist}/{title} (up to 3 hits)
 * Then LRCLIB strategies if still no text. Responses stay JSON 200 with `error` when not found (client expects this).
 */
import { fetchLyricsFromSong } from '../src/lib/lyricsShared.js';
import { parseJsonBody, isNodeBuffer } from './parseJsonBody.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseJsonBody(req.body);

  const { song, artist } = body || {};
  if (!song?.trim()) {
    console.warn('[api/lyrics] 400 missing song', {
      bodyType: req.body == null ? 'null' : typeof req.body,
      isBuffer: isNodeBuffer(req.body),
      parsedKeys: Object.keys(body || {}),
    });
    return res.status(400).json({ error: 'Song required' });
  }

  const cleanSong = song.trim();
  const cleanArtist = (artist || '').trim();

  console.log('[api/lyrics] request', { cleanSong, cleanArtist });

  const timeoutMs = 22000;
  try {
    const result = await Promise.race([
      fetchLyricsFromSong(cleanSong, cleanArtist),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('lyrics_upstream_timeout')), timeoutMs)
      ),
    ]);
    if (result.error) {
      console.warn('[api/lyrics] no lyrics', { cleanSong, cleanArtist, error: result.error });
    } else {
      console.log('[api/lyrics] ok', {
        cleanSong,
        cleanArtist,
        source: result.source,
        sections: result.sections?.length,
        title: result.title,
        artist: result.artist,
      });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error('[api/lyrics] exception', e?.message || e, e?.stack);
    return res.status(200).json({
      error: 'Lyrics not found',
      sections: [],
      title: cleanSong,
      artist: cleanArtist,
    });
  }
}
