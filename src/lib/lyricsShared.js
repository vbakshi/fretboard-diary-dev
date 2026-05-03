/**
 * Shared lyrics fetch + parse — browser + Vercel serverless (`api/lyrics.js` imports this file).
 *
 * Debug: in the browser console run:
 *   localStorage.setItem('DEBUG_LYRICS', '1')
 * Then reload and create a lesson — you'll see [lyrics] logs.
 * Turn off: localStorage.removeItem('DEBUG_LYRICS')
 */

const LRCLIB_BASE = 'https://lrclib.net/api';
const UA = 'FretboardDiary/1.0 (https://github.com/)';

/** Verbose logs (each attempt). Off unless DEBUG_LYRICS=1 or Vite dev. */
function lyricsVerbose(...args) {
  let verbose = false;
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) verbose = true;
  } catch {
    /* no import.meta */
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage?.getItem('DEBUG_LYRICS') === '1') {
      verbose = true;
    }
  } catch {
    /* no localStorage */
  }
  if (verbose) console.log('[lyrics]', ...args);
}

/** Always log failures so you can see them without flipping a flag. */
function lyricsFail(reason, detail = {}) {
  console.warn('[lyrics] FAILED:', reason, detail);
}

function formatSectionLabel(raw) {
  const lower = raw.toLowerCase();
  if (lower.includes('verse')) return raw;
  if (lower.includes('chorus')) return 'Chorus';
  if (lower.includes('bridge')) return 'Bridge';
  if (lower.includes('outro')) return 'Outro';
  if (lower.includes('intro')) return 'Intro';
  if (lower.includes('pre')) return 'Pre-Chorus';
  return raw;
}

export function parseLyrics(raw) {
  const lines = String(raw || '').split(/\r?\n/);
  const sections = [];
  let current = { label: 'Verse 1', lines: [] };
  const headerRegex = /^\[([^\]]+)\]\s*$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(headerRegex);
    if (match) {
      if (current.lines.filter((l) => l.length > 0).length > 0) {
        sections.push(current);
      }
      current = { label: formatSectionLabel(match[1].trim()), lines: [] };
    } else if (trimmed.length === 0) {
      if (current.lines.filter((l) => l.length > 0).length > 0) {
        sections.push(current);
        const nextNum =
          sections.filter((s) => s.label.startsWith('Verse')).length + 1;
        current = { label: `Verse ${nextNum}`, lines: [] };
      }
    } else {
      // Omit lone "+" lines (scraper/UI noise) that add blank-looking rows
      if (/^\++$/.test(trimmed)) continue;
      current.lines.push(trimmed);
    }
  }
  if (current.lines.filter((l) => l.length > 0).length > 0) {
    sections.push(current);
  }
  return sections;
}

export function hasContent(sections) {
  return sections.some((s) =>
    (s.lines || []).some((line) => String(line || '').trim().length > 0)
  );
}

/** LRCLIB often has syncedLyrics (LRC) but empty plainLyrics — convert to plain lines. */
export function lrcToPlain(lrc) {
  if (!lrc || !String(lrc).trim()) return '';
  return String(lrc)
    .split(/\r?\n/)
    .map((line) => {
      let s = line.trim();
      while (/^\[[^\]]+\]/.test(s)) {
        s = s.replace(/^\[[^\]]+\]\s*/, '');
      }
      return s.trim();
    })
    .filter((l) => l.length > 0)
    .join('\n');
}

/** lyrics.ovh: direct /v1, swap order, then /suggest fallback */
async function tryLyricsOvh(artist, song) {
  const s = String(song || '').trim();
  if (!s) return null;
  const a = String(artist || '').trim();

  const fetchOvhPair = async (art, trk) => {
    if (!art || !trk) return null;
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(art)}/${encodeURIComponent(trk)}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        lyricsVerbose('lyrics.ovh HTTP', { url, status: response.status });
        return null;
      }
      const data = await response.json();
      if (data.error || !data.lyrics || !String(data.lyrics).trim()) {
        lyricsVerbose('lyrics.ovh empty/error', { error: data.error });
        return null;
      }
      return { text: String(data.lyrics), source: 'lyrics.ovh' };
    } catch (e) {
      lyricsVerbose('lyrics.ovh exception', e?.message || e);
      return null;
    }
  };

  if (a) {
    let r = await fetchOvhPair(a, s);
    if (r) return r;
    r = await fetchOvhPair(s, a);
    if (r) return r;
  }

  try {
    const sugRes = await fetch(
      `https://api.lyrics.ovh/suggest/${encodeURIComponent(s)}`
    );
    if (!sugRes.ok) {
      lyricsVerbose('lyrics.ovh suggest HTTP', { status: sugRes.status });
      return null;
    }
    const sugData = await sugRes.json();
    const list = sugData?.data || [];
    for (let i = 0; i < Math.min(3, list.length); i++) {
      const item = list[i];
      const artName = item?.artist?.name;
      const title = item?.title;
      if (!artName || !title) continue;
      const r = await fetchOvhPair(artName, title);
      if (r) {
        lyricsVerbose('lyrics.ovh suggest match', { i, artName, title });
        return r;
      }
    }
  } catch (e) {
    lyricsVerbose('lyrics.ovh suggest exception', e?.message || e);
  }

  return null;
}

function normalizeLrclibSearchResults(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

function pickLrclibRow(data) {
  const arr = normalizeLrclibSearchResults(data);
  for (const row of arr) {
    if (row.instrumental) continue;
    let plain = row.plainLyrics || row.plain_lyrics;
    if (!plain?.trim()) {
      const synced = row.syncedLyrics || row.synced_lyrics;
      if (synced?.trim()) {
        plain = lrcToPlain(synced);
        lyricsVerbose('lrclib: using syncedLyrics → plain', {
          track: row.trackName || row.name,
          preview: String(plain).slice(0, 80),
        });
      }
    }
    if (plain && String(plain).trim()) {
      return String(plain);
    }
  }
  return null;
}

async function tryLrclibSearch(params) {
  const q = new URLSearchParams(params).toString();
  const headers = { Accept: 'application/json' };
  if (typeof window === 'undefined') {
    headers['User-Agent'] = UA;
  }
  const url = `${LRCLIB_BASE}/search?${q}`;
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      lyricsVerbose('lrclib HTTP', { url, status: response.status });
      return null;
    }
    const data = await response.json();
    const text = pickLrclibRow(data);
    if (!text) {
      lyricsVerbose('lrclib: no plain/synced lyrics in results', {
        params: Object.fromEntries(new URLSearchParams(q)),
        resultCount: normalizeLrclibSearchResults(data).length,
      });
      return null;
    }
    return { text, source: 'lrclib' };
  } catch (e) {
    lyricsVerbose('lrclib exception', e?.message || e);
    return null;
  }
}

function buildSuccess(cleanSong, cleanArtist, result) {
  const parsed = parseLyrics(result.text);
  if (!hasContent(parsed)) {
    lyricsVerbose('parseLyrics produced no content', {
      source: result.source,
      textPreview: String(result.text).slice(0, 200),
    });
    return null;
  }
  const sections = parsed.map((s) => ({
    label: s.label,
    lines: s.lines,
    practiceNote: '',
  }));
  return {
    title: cleanSong,
    artist: cleanArtist,
    source: result.source,
    sections,
  };
}

/**
 * Direct fetch from the browser (or Node). LRCLIB may block browsers via CORS.
 */
export async function fetchLyricsFromSong(song, artist) {
  const cleanSong = String(song || '').trim();
  const cleanArtist = String(artist || '').trim();

  lyricsVerbose('fetchLyricsFromSong start', { cleanSong, cleanArtist });

  if (!cleanSong) {
    lyricsFail('empty song after trim', { artist: cleanArtist });
    return {
      error: 'Lyrics not found',
      sections: [],
      title: '',
      artist: cleanArtist,
    };
  }

  const runners = [];
  const attemptLabels = [];

  if (cleanArtist) {
    runners.push(() => tryLyricsOvh(cleanArtist, cleanSong));
    attemptLabels.push('lyrics.ovh (direct + swap + suggest)');
  } else {
    runners.push(() => tryLyricsOvh('', cleanSong));
    attemptLabels.push('lyrics.ovh (suggest)');
  }

  if (cleanArtist) {
    runners.push(() =>
      tryLrclibSearch({ track_name: cleanSong, artist_name: cleanArtist })
    );
    attemptLabels.push('lrclib track+artist');
    runners.push(() => tryLrclibSearch({ q: `${cleanSong} ${cleanArtist}` }));
    attemptLabels.push('lrclib q song+artist');
    runners.push(() => tryLrclibSearch({ q: `${cleanArtist} ${cleanSong}` }));
    attemptLabels.push('lrclib q artist+song');
  } else {
    runners.push(() => tryLrclibSearch({ q: cleanSong }));
    attemptLabels.push('lrclib q song (no artist)');
  }

  runners.push(() => tryLrclibSearch({ track_name: cleanSong }));
  attemptLabels.push('lrclib track_name only');

  for (let i = 0; i < runners.length; i++) {
    const label = attemptLabels[i] || `attempt-${i}`;
    try {
      const result = await runners[i]();
      if (!result?.text) {
        lyricsVerbose('skip: no text', { attempt: label });
        continue;
      }
      const ok = buildSuccess(cleanSong, cleanArtist, result);
      if (ok) {
        lyricsVerbose('SUCCESS', {
          attempt: label,
          source: ok.source,
          sections: ok.sections.length,
        });
        return ok;
      }
      lyricsVerbose('skip: buildSuccess null', {
        attempt: label,
        source: result.source,
      });
    } catch (e) {
      lyricsVerbose('attempt threw', {
        attempt: label,
        error: e?.message || String(e),
      });
    }
  }

  lyricsFail('all strategies exhausted', { cleanSong, cleanArtist });
  return {
    error: 'Lyrics not found',
    sections: [],
    title: cleanSong,
    artist: cleanArtist,
  };
}

/**
 * Prefer same-origin POST /api/lyrics (Vercel serverless = Node fetch, no CORS to LRCLIB).
 * Falls back to direct browser fetch for local `npm run dev` when /api is unavailable.
 */
export async function fetchLyricsPreferApiFirst(song, artist) {
  const cleanSong = String(song || '').trim();
  const cleanArtist = String(artist || '').trim();

  lyricsVerbose('fetchLyricsPreferApiFirst: trying POST /api/lyrics first', {
    cleanSong,
    cleanArtist,
  });

  const apiLyricsTimeoutMs = 16000;
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const tid =
    ctrl &&
    setTimeout(() => {
      try {
        ctrl.abort();
      } catch {
        /* ignore */
      }
    }, apiLyricsTimeoutMs);

  try {
    const res = await fetch('/api/lyrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ song: cleanSong, artist: cleanArtist }),
      signal: ctrl?.signal,
    });
    const ct = res.headers.get('content-type') || '';
    const textPreview = !ct.includes('application/json') ? await res.clone().text().then((t) => t.slice(0, 120)) : '';

    if (!res.ok) {
      let jsonErr = null;
      try {
        if (ct.includes('application/json')) {
          jsonErr = await res.clone().json();
        }
      } catch {
        /* ignore */
      }
      lyricsFail('POST /api/lyrics non-OK', {
        status: res.status,
        statusText: res.statusText,
        contentType: ct,
        bodyPreview: textPreview,
        json: jsonErr,
      });
    } else if (!ct.includes('application/json')) {
      lyricsFail('POST /api/lyrics not JSON', { contentType: ct, bodyPreview: textPreview });
    } else {
      const data = await res.json();
      const hasLyrics =
        !data.error &&
        Array.isArray(data.sections) &&
        data.sections.some((s) =>
          (s.lines || []).some((l) => {
            const t = typeof l === 'string' ? l : l?.text || '';
            return String(t).trim().length > 0;
          })
        );
      if (hasLyrics) {
        lyricsVerbose('POST /api/lyrics SUCCESS', { source: data.source, sections: data.sections?.length });
        return data;
      }
      lyricsFail('POST /api/lyrics returned no usable sections', {
        error: data.error,
        sectionCount: data.sections?.length,
        keys: data ? Object.keys(data) : [],
      });
    }
  } catch (e) {
    lyricsFail('POST /api/lyrics fetch threw (e.g. dev server has no /api)', {
      message: e?.message || String(e),
    });
  } finally {
    if (tid) clearTimeout(tid);
  }

  lyricsVerbose('falling back to fetchLyricsFromSong (browser direct)');
  return fetchLyricsFromSong(cleanSong, cleanArtist);
}
