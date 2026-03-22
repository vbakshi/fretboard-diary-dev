import { tryLyricsAttempts, hasLyricLines } from '../lib/lyricsShared.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { song, artist } = req.body || {};
  if (!song?.trim()) {
    return res.status(400).json({ error: 'Song required' });
  }

  const cleanSong = song.trim();
  const cleanArtist = (artist || '').trim();

  try {
    const result = await tryLyricsAttempts(cleanSong, cleanArtist);
    if (hasLyricLines(result)) {
      return res.status(200).json(result);
    }
    return res.status(200).json({ error: 'Lyrics not found' });
  } catch {
    return res.status(200).json({ error: 'Lyrics not found' });
  }
}
