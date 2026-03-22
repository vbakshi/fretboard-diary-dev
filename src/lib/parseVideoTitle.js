/**
 * Strip YouTube guitar-lesson noise and split artist / song for lyrics lookup.
 * Used by /api/youtube (regex cleanedSong/cleanedArtist), /api/parseVideoTitle (regex merge), and client fallback.
 */

function cleanBrackets(str) {
  return String(str || '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} rawTitle
 * @param {string} [channelTitle] — YouTube channel name; helps "Artist - Song" vs "Song - Artist" when both sides are one word.
 * @returns {{ song: string, artist: string }}
 */
export function parseVideoTitle(rawTitle, channelTitle = '') {
  let title = String(rawTitle || '');
  const channel = String(channelTitle || '');

  // "Song by Artist" (before separator / noise stripping)
  const byMatch = title.match(
    /^(?:how\s+to\s+play\s+)?(.+?)\s+by\s+(.+?)$/i
  );
  if (byMatch) {
    return {
      song: cleanBrackets(byMatch[1]),
      artist: cleanBrackets(byMatch[2]),
    };
  }

  /* eslint-disable no-useless-escape -- bracket classes match literal () [] {} in titles */
  const noisePatterns = [
    /\s*[\(\[\{][^\)\]\}]*(guitar|lesson|tutorial|chords?|tabs?|cover|acoustic|beginner|easy|how to|full|version|official|lyrics?|live|feat|ft\.)[^\)\]\}]*[\)\]\}].*/gi,
    /\s*[\|\/\\–—-]+\s*(guitar|lesson|tutorial|chords?|tabs?|cover|acoustic|beginner|easy|how to|full|official|feat|ft\.).*/gi,
    /\s*(guitar|lesson|tutorial|chords?|tabs?|cover|acoustic|beginner|easy|how to play).*/gi,
  ];
  /* eslint-enable no-useless-escape */

  for (const pattern of noisePatterns) {
    title = title.replace(pattern, '').trim();
  }

  const separators = [' - ', ' | ', ' — ', ' – ', ' _ ', ' // '];
  let artist = null;
  let song = null;

  for (const sep of separators) {
    if (title.includes(sep)) {
      const parts = title.split(sep).map((p) => p.trim());
      if (parts.length >= 2) {
        const first = parts[0];
        const rest = parts.slice(1).join(sep).trim();
        const wFirst = first.split(/\s+/).filter(Boolean).length;
        const wRest = rest.split(/\s+/).filter(Boolean).length;

        // "Wonderwall - Oasis" vs "Oasis - Wonderwall": use channel when possible
        if (wFirst === 1 && wRest === 1) {
          const f = first.toLowerCase();
          const r = rest.toLowerCase();
          const ch = channel.toLowerCase();
          const rInCh = r.length > 1 && ch.includes(r);
          const fInCh = f.length > 1 && ch.includes(f);
          if (fInCh && !rInCh) {
            artist = first;
            song = rest;
          } else if (rInCh && !fInCh) {
            artist = rest;
            song = first;
          } else {
            // Guitar lessons often use "Song - Artist"; lyrics.ovh swap covers the other order
            song = first;
            artist = rest;
          }
        } else if (wRest === 1 && wFirst >= 2) {
          // "The Beatles - Help" → band first; "Let It Be - Beatles" → song first
          if (/^the\s+/i.test(first)) {
            artist = first;
            song = rest;
          } else {
            song = first;
            artist = rest;
          }
        } else if (wFirst >= 2 && wRest >= 1 && wRest <= 2 && wFirst > wRest) {
          // "Shape of You - Ed Sheeran" → long song title, short artist
          song = first;
          artist = rest;
        } else {
          // Default: Artist - Song (rest of title)
          artist = first;
          song = rest;
        }
      }
      break;
    }
  }

  if (!artist && song == null) {
    song = title.trim();
    artist = '';
  } else if (artist == null) {
    artist = '';
    song = (song || title).trim();
  }

  return {
    song: cleanBrackets(song || ''),
    artist: cleanBrackets(artist || ''),
  };
}

export const parseSongTitle = (raw, channel) => parseVideoTitle(raw, channel).song;
export const parseArtistName = (raw, channel) => parseVideoTitle(raw, channel).artist;
