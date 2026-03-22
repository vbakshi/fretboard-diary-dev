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

export default function LessonCard({ video, onFetchSummarize }) {
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
      const parsed =
        typeof video.cleanedSong === 'string' ||
        typeof video.cleanedArtist === 'string'
          ? {
              song: video.cleanedSong ?? '',
              artist: video.cleanedArtist ?? '',
            }
          : parseVideoTitle(video.title, video.channel || '');
      const song = parsed.song;
      const artist = parsed.artist;
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
        // POST /api/lyrics with song + artist from video.cleanedSong / cleanedArtist (Haiku-parsed on search).
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
      } catch {
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
