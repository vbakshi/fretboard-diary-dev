/**
 * Shared lyrics parsing + LRCLIB / fallback fetch.
 * Used by api/lyrics.js (server) and the client (browser fetch when CORS allows).
 */

const LRCLIB_BASE = 'https://lrclib.net/api';
const UA = 'FretboardDiary/1.0 (https://github.com/)';

/**
 * Parse plain lyrics into sections.
 * - If [Verse], [Chorus], etc. tags exist → preserve those sections.
 * - Otherwise split by blank lines into Verse 1, Verse 2, …
 * - Single block with no blank lines → chunk every 4 lines into Verse 1, Verse 2, …
 */
export function parseLyricsToSections(rawLyrics, title, artist) {
  const raw = String(rawLyrics || '');
  const rawLines = raw.split(/\r?\n/);

  const hasSectionTags = rawLines.some((l) => /^\s*\[[^\]]+\]\s*$/.test(l));

  if (hasSectionTags) {
    const lines = rawLines.map((l) => l.trim()).filter((l) => l.length > 0);
    const sectionRegex = /^\[.*\]$/i;
    const sections = [];
    let currentSection = null;

    for (const line of lines) {
      if (sectionRegex.test(line)) {
        const label = line.replace(/^\[|\]$/g, '').trim();
        currentSection = {
          label: label || 'Lyrics',
          lines: [],
          practiceNote: '',
        };
        sections.push(currentSection);
      } else if (currentSection) {
        currentSection.lines.push({ text: line, chords: [] });
      } else {
        currentSection = {
          label: 'Lyrics',
          lines: [{ text: line, chords: [] }],
          practiceNote: '',
        };
        sections.push(currentSection);
      }
    }

    if (sections.length === 0 && lines.length > 0) {
      sections.push({
        label: 'Lyrics',
        lines: lines.map((text) => ({ text, chords: [] })),
        practiceNote: '',
      });
    }

    return {
      title: title || 'Unknown',
      artist: artist || 'Unknown',
      sections,
    };
  }

  // No [tags]: verse-style breakdown
  const lines = rawLines.map((l) => l.trimEnd());
  const paragraphs = [];
  let cur = [];
  for (const line of lines) {
    if (line.trim() === '') {
      if (cur.length) {
        paragraphs.push(cur);
        cur = [];
      }
    } else {
      cur.push(line.trim());
    }
  }
  if (cur.length) paragraphs.push(cur);

  const normLines = (arr) => arr.map((text) => ({ text, chords: [] }));

  if (paragraphs.length === 0) {
    return {
      title: title || 'Unknown',
      artist: artist || 'Unknown',
      sections: [],
    };
  }

  if (paragraphs.length === 1) {
    const flat = paragraphs[0];
    const CHUNK = 4;
    const sections = [];
    for (let i = 0; i < flat.length; i += CHUNK) {
      sections.push({
        label: `Verse ${sections.length + 1}`,
        lines: normLines(flat.slice(i, i + CHUNK)),
        practiceNote: '',
      });
    }
    return {
      title: title || 'Unknown',
      artist: artist || 'Unknown',
      sections,
    };
  }

  const sections = paragraphs.map((p, i) => ({
    label: `Verse ${i + 1}`,
    lines: normLines(p),
    practiceNote: '',
  }));

  return {
    title: title || 'Unknown',
    artist: artist || 'Unknown',
    sections,
  };
}

async function fetchJson(url) {
  const headers = { Accept: 'application/json' };
  // Browsers forbid setting User-Agent; Node/serverless can send it for LRCLIB.
  if (typeof window === 'undefined') {
    headers['User-Agent'] = UA;
  }
  const r = await fetch(url, { headers });
  if (!r.ok) return null;
  return r.json();
}

function pickLrclibRecord(results) {
  if (!Array.isArray(results) || results.length === 0) return null;
  for (const row of results) {
    const text = row.plainLyrics || row.plain_lyrics;
    if (text && String(text).trim() && !row.instrumental) return row;
  }
  return null;
}

async function tryLrclibSearch(params) {
  const q = new URLSearchParams(params).toString();
  const data = await fetchJson(`${LRCLIB_BASE}/search?${q}`);
  const picked = pickLrclibRecord(data);
  if (!picked) return null;
  const lyrics = picked.plainLyrics || picked.plain_lyrics;
  if (!lyrics?.trim()) return null;
  return parseLyricsToSections(
    lyrics,
    picked.trackName || params.track_name || '',
    picked.artistName || params.artist_name || ''
  );
}

async function tryLyricsOvh(artist, song) {
  const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.error || !data.lyrics) return null;
  return parseLyricsToSections(data.lyrics, song, artist);
}

export function hasLyricLines(result) {
  return result?.sections?.some((s) =>
    (s.lines || []).some((l) => String(l.text || '').trim().length > 0)
  );
}

/**
 * Try all lyric sources (same order as legacy API). Works in browser + Node 18+.
 */
export async function tryLyricsAttempts(cleanSong, cleanArtist) {
  const attempts = [];

  if (cleanArtist) {
    attempts.push(() =>
      tryLrclibSearch({ track_name: cleanSong, artist_name: cleanArtist })
    );
  }

  if (cleanArtist) {
    attempts.push(() => tryLrclibSearch({ q: `${cleanSong} ${cleanArtist}` }));
    attempts.push(() => tryLrclibSearch({ q: `${cleanArtist} ${cleanSong}` }));
  } else {
    attempts.push(() => tryLrclibSearch({ q: cleanSong }));
  }

  attempts.push(() => tryLrclibSearch({ track_name: cleanSong }));

  if (cleanArtist) {
    attempts.push(() => tryLyricsOvh(cleanArtist, cleanSong));
    attempts.push(() => tryLyricsOvh(cleanSong, cleanArtist));
  }

  for (const run of attempts) {
    try {
      const result = await run();
      if (hasLyricLines(result)) {
        return result;
      }
    } catch {
      // try next
    }
  }

  return null;
}

/**
 * Client-friendly: try local fetch first, then same-origin /api/lyrics (proxy in dev).
 */
export async function fetchLyricsForLesson(song, artist) {
  const cleanSong = String(song || '').trim();
  const cleanArtist = String(artist || '').trim();
  if (!cleanSong) {
    return {
      error: 'Song required',
      sections: [],
      title: '',
      artist: '',
    };
  }

  let result = await tryLyricsAttempts(cleanSong, cleanArtist);
  if (result && hasLyricLines(result)) {
    return result;
  }

  try {
    const res = await fetch('/api/lyrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ song: cleanSong, artist: cleanArtist }),
    });
    if (!res.ok) throw new Error('api');
    const data = await res.json();
    if (data?.sections?.length && !data.error) {
      return data;
    }
    return {
      error: data?.error || 'Lyrics not found',
      sections: [],
      title: cleanSong,
      artist: cleanArtist,
    };
  } catch {
    return {
      error: 'Lyrics not found',
      sections: [],
      title: cleanSong,
      artist: cleanArtist,
    };
  }
}
