import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLessons } from '../hooks/useLessons';
import { getAICache, setAICache } from '../hooks/useSearch';
import { migrateLine, createEmptySlots } from '../utils/slots';
import { fetchLyricsPreferApiFirst } from '../lib/lyricsShared.js';
import { parseVideoTitle } from '../lib/parseVideoTitle.js';

const DIFFICULTY_STYLES = {
  Beginner: 'bg-green-600/30 text-green-400 border-green-500/50',
  Intermediate: 'bg-yellow-600/30 text-yellow-400 border-yellow-500/50',
  Advanced: 'bg-red-600/30 text-red-400 border-red-500/50',
};

export default function LessonCard({
  video,
  /** User’s search string for this result list; sent to Haiku with the video title. */
  searchQuery = '',
  onFetchSummarize,
}) {
  const navigate = useNavigate();
  const { createLesson } = useLessons();
  const [loading, setLoading] = useState(false);
  const [aiData, setAIData] = useState(() => getAICache(video.videoId));

  const chordsToShow = aiData?.chordsUsed?.length
    ? aiData.chordsUsed
    : video.chordsUsed || [];
  const chordsSource = aiData?.chordsUsed?.length ? '✨' : '📋';

  const needsAI = Boolean(
    !video.chordsFromDescription &&
    video.transcript &&
    !aiData &&
    onFetchSummarize
  );

  useEffect(() => {
    if (!needsAI || !onFetchSummarize) return;
    onFetchSummarize(video).then((result) => {
      if (result) {
        setAIData(result);
        setAICache(video.videoId, result);
      }
    });
  }, [needsAI, video.videoId, video.transcript, video.title, onFetchSummarize]);

  const handleCreateLesson = async () => {
    setLoading(true);
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
        // fall through to regex
      }
      // Only apply regex heuristics when Haiku did not run; trust Haiku output for lyrics lookup
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
        // POST /api/lyrics — Haiku strings used as-is when source was haiku (no client regex merge).
        const data = await fetchLyricsPreferApiFirst(song, artist);
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
          lyricsNotFound = false;
          if (data.title) songTitle = data.title;
          if (data.artist) artistOut = data.artist;
          sections = data.sections.map((s) => ({
            label: s.label,
            lines: (s.lines || []).map((l) =>
              migrateLine({
                text: typeof l === 'string' ? l : l.text || '',
                chords: Array.isArray(l?.chords) ? l.chords : [],
                slots: l.slots,
              })
            ),
            practiceNote: s.practiceNote || '',
          }));
        }
      } catch (err) {
        console.error('[lyrics] Create lesson fetch failed', err);
        lyricsNotFound = true;
        sections = [placeholderSection];
      }

      const chordPalette = [
        ...new Set([...(video.chordsUsed || []), ...(aiData?.chordsUsed || [])]),
      ].filter(Boolean);

      const lesson = createLesson({
        songTitle: songTitle,
        artist: artistOut,
        sequences: [],
        referenceVideo: {
          videoId: video.videoId,
          title: video.title,
          channel: video.channel,
          thumbnail: video.thumbnail,
          watchUrl: video.watchUrl,
        },
        chordPalette,
        progression: chordPalette.slice(0, 4),
        sections,
      });

      navigate(`/editor/${lesson.id}`, {
        state: lyricsNotFound ? { lyricsNotFound: true } : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const diffStyle = DIFFICULTY_STYLES[video.difficultyLabel] || DIFFICULTY_STYLES.Intermediate;

  return (
    <div className="flex gap-3 rounded-lg border border-brand-border bg-brand-surface p-3">
      <a
        href={video.watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0"
      >
        <img
          src={video.thumbnail}
          alt=""
          className="h-14 w-20 rounded object-cover"
        />
      </a>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-sm font-medium text-white">{video.title}</h3>
        <p className="mt-0.5 text-xs text-brand-muted">{video.channel}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className={`rounded border px-2 py-0.5 text-xs ${diffStyle}`}>
            {video.difficultyLabel}
          </span>
          <span className="text-xs text-brand-muted">
            {video.views} views · {video.likes} likes
          </span>
        </div>
        {chordsToShow.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {chordsToShow.slice(0, 6).map((c) => (
              <span
                key={c}
                className="rounded bg-brand-amber/20 px-1.5 py-0.5 text-xs text-brand-amber"
              >
                {c}
              </span>
            ))}
            <span className="ml-0.5 text-xs text-brand-muted">{chordsSource}</span>
          </div>
        )}
        {video.tags?.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1 text-xs text-brand-muted">
            {video.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        )}
        <div className="mt-2 flex gap-2">
          <a
            href={video.watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-brand-border px-3 py-1.5 text-sm text-brand-amber hover:border-brand-amber"
          >
            ▶ Watch
          </a>
          <button
            type="button"
            onClick={handleCreateLesson}
            disabled={loading}
            className="rounded bg-brand-amber px-3 py-1.5 text-sm font-medium text-brand-bg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Fetching lyrics...' : '+ Create My Lesson'}
          </button>
        </div>
      </div>
    </div>
  );
}
