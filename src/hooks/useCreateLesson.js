import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLessons } from './useLessons';
import { migrateLine, createEmptySlots } from '../utils/slots';
import { fetchLyricsPreferApiFirst } from '../lib/lyricsShared.js';
import { parseVideoTitle } from '../lib/parseVideoTitle.js';
import { uuid } from '../utils/uuid';

/** Ensures lyrics lookup cannot block lesson creation indefinitely (slow /api/lyrics or LRCLIB). */
const LYRICS_TOTAL_MS = 34000;

async function fetchLyricsCapped(song, artist) {
  return Promise.race([
    fetchLyricsPreferApiFirst(song, artist),
    new Promise((resolve) =>
      setTimeout(
        () =>
          resolve({
            error: 'Lyrics lookup timed out — you can add lyrics manually.',
            sections: [],
            title: String(song || '').trim(),
            artist: String(artist || '').trim(),
          }),
        LYRICS_TOTAL_MS
      )
    ),
  ]);
}

/**
 * Shared “Create lesson from YouTube video” flow (parse title → lyrics → save → editor).
 * @param {string} [defaultSearchQuery] — Used for /api/parseVideoTitle when `searchQuery` is not passed per call.
 */
export function useCreateLesson(defaultSearchQuery = '') {
  const navigate = useNavigate();
  const { createLesson, registerGuestLesson } = useLessons();
  const [creating, setCreating] = useState(false);

  const createLessonFromVideo = useCallback(
    async (video, options = {}) => {
      const searchQuery =
        typeof options.searchQuery === 'string'
          ? options.searchQuery
          : defaultSearchQuery;
      const additionalChordsUsed = options.additionalChordsUsed || [];
      const guestMode = Boolean(options.guestMode);

      setCreating(true);
      try {
        let song = '';
        let artist = '';
        let parseSource = 'regex';
        try {
          const parseRes = await fetch('/api/parseVideoTitle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: video.title,
              channel: video.channel || '',
              searchQuery: typeof searchQuery === 'string' ? searchQuery : '',
            }),
          });
          if (parseRes.ok) {
            const p = await parseRes.json();
            song = p.song ?? '';
            artist = p.artist ?? '';
            parseSource = p.source === 'haiku' ? 'haiku' : 'regex';
          }
        } catch {
          /* fall through */
        }
        if (parseSource !== 'haiku') {
          if (!String(song || '').trim() && !String(artist || '').trim()) {
            const fb = parseVideoTitle(video.title, video.channel || '');
            song = fb.song;
            artist = fb.artist;
          }
          if (!String(song || '').trim()) {
            const fb = parseVideoTitle(video.title, video.channel || '');
            if (!String(song || '').trim()) song = fb.song;
            if (!String(artist || '').trim()) artist = fb.artist;
          } else {
            const fb = parseVideoTitle(video.title, video.channel || '');
            const sl = String(song).toLowerCase();
            const fbl = fb.song.toLowerCase();
            if (fb.song.length > song.length && fbl.includes(sl)) {
              song = fb.song;
              if (!String(artist || '').trim()) artist = fb.artist;
            }
          }
          if (!String(artist || '').trim()) {
            const fb = parseVideoTitle(video.title, video.channel || '');
            if (!String(artist || '').trim()) artist = fb.artist;
          }
        }

        const placeholderSection = {
          label: 'Verse 1',
          lines: [
            {
              text: 'Add your lyrics here...',
              slots: createEmptySlots(),
            },
          ],
          practiceNote: '',
        };

        let songTitle = song;
        let artistOut = artist;
        let sections = [placeholderSection];
        let lyricsNotFound = true;

        try {
          const data = await fetchLyricsCapped(song, artist);
          const hasLyrics =
            !data.error &&
            Array.isArray(data.sections) &&
            data.sections.some((sec) =>
              (sec.lines || []).some((l) => {
                const t = typeof l === 'string' ? l : l?.text || '';
                return String(t).trim().length > 0;
              })
            );

          if (hasLyrics) {
            lyricsNotFound = false;
            if (data.title) songTitle = data.title;
            if (data.artist) artistOut = data.artist;
            sections = data.sections.map((sec) => ({
              label: sec.label,
              lines: (sec.lines || []).map((l) =>
                migrateLine({
                  text: typeof l === 'string' ? l : l.text || '',
                  chords: Array.isArray(l?.chords) ? l.chords : [],
                  slots: l.slots,
                })
              ),
              practiceNote: sec.practiceNote || '',
            }));
          }
        } catch (err) {
          console.error('[lyrics] Create lesson fetch failed', err);
          lyricsNotFound = true;
          sections = [placeholderSection];
        }

        const chordPalette = [
          ...new Set([
            ...(video.chordsUsed || []),
            ...additionalChordsUsed,
          ]),
        ].filter(Boolean);

        const referenceVideo = {
          videoId: video.videoId,
          title: video.title,
          channel: video.channel,
          thumbnail: video.thumbnail,
          watchUrl: video.watchUrl,
        };

        if (guestMode) {
          const now = new Date().toISOString();
          const lessonLocal = registerGuestLesson({
            id: uuid(),
            userId: '',
            songTitle,
            artist: artistOut,
            sequences: [],
            referenceVideo,
            chordPalette,
            progression: chordPalette.slice(0, 4),
            sections,
            visibility: 'private',
            status: 'building',
            createdAt: now,
            updatedAt: now,
          });
          navigate(`/editor/${lessonLocal.id}`, {
            state: lyricsNotFound ? { lyricsNotFound: true } : undefined,
          });
          return;
        }

        const lesson = await createLesson({
          songTitle: songTitle,
          artist: artistOut,
          sequences: [],
          referenceVideo,
          chordPalette,
          progression: chordPalette.slice(0, 4),
          sections,
        });

        navigate(`/editor/${lesson.id}`, {
          state: lyricsNotFound ? { lyricsNotFound: true } : undefined,
        });
      } catch (err) {
        console.error('[createLesson]', err);
      } finally {
        setCreating(false);
      }
    },
    [createLesson, registerGuestLesson, defaultSearchQuery, navigate]
  );

  return { createLessonFromVideo, creating };
}
