import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLessons } from '../hooks/useLessons';
import { getAICache, setAICache } from '../hooks/useSearch';
import { migrateLine, createEmptySlots } from '../utils/slots';
import { fetchLyricsForLesson } from '../../lib/lyricsShared.js';

const DIFFICULTY_STYLES = {
  Beginner: 'bg-green-600/30 text-green-400 border-green-500/50',
  Intermediate: 'bg-yellow-600/30 text-yellow-400 border-yellow-500/50',
  Advanced: 'bg-red-600/30 text-red-400 border-red-500/50',
};

const LESSON_STEPS = [
  { id: 'parse', label: 'Read song & artist from video title' },
  { id: 'fetch', label: 'Fetch lyrics from music library' },
  { id: 'verses', label: 'Organize into verses & sections' },
  { id: 'save', label: 'Save lesson to your diary' },
];

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function StepRow({ label, status }) {
  const done = status === 'done';
  const running = status === 'running';
  const err = status === 'error';

  return (
    <li className="flex items-start gap-3 text-left text-sm">
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px]"
        style={{
          borderWidth: '0.5px',
          borderColor: done ? '#6b4e10' : err ? '#8a3a3a' : '#3d3830',
          background: done ? '#2e2510' : 'transparent',
          color: done ? '#EF9F27' : err ? '#cc6666' : '#6b6560',
        }}
      >
        {done ? '✓' : err ? '!' : running ? '…' : '○'}
      </span>
      <span
        className={
          done
            ? 'text-[#d4cfc8]'
            : running
              ? 'font-medium text-[#EF9F27]'
              : err
                ? 'text-[#cc6666]'
                : 'text-[#6b6560]'
        }
      >
        {label}
      </span>
    </li>
  );
}

export default function LessonCard({ video, onFetchSummarize }) {
  const navigate = useNavigate();
  const { createLesson } = useLessons();
  const [loading, setLoading] = useState(false);
  const [stepStates, setStepStates] = useState(() =>
    LESSON_STEPS.map((s) => ({ ...s, status: 'pending' }))
  );
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

  const updateStep = useCallback((id, status) => {
    setStepStates((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  }, []);

  const resetSteps = useCallback(() => {
    setStepStates(LESSON_STEPS.map((s) => ({ ...s, status: 'pending' })));
  }, []);

  const handleCreateLesson = async () => {
    resetSteps();
    setLoading(true);

    const run = async () => {
      updateStep('parse', 'running');
      await delay(120);
      const { song, artist } = parseSongFromTitle(video.title);
      updateStep('parse', 'done');

      updateStep('fetch', 'running');
      let data;
      try {
        data = await fetchLyricsForLesson(song, artist);
      } catch {
        data = { error: 'Lyrics not found', sections: [] };
      }
      if (data.error || !data.sections?.length) {
        updateStep('fetch', 'error');
      } else {
        updateStep('fetch', 'done');
      }

      updateStep('verses', 'running');
      await delay(180);
      updateStep('verses', 'done');

      updateStep('save', 'running');

      let sections = [
        {
          label: 'Verse 1',
          lines: [{ text: '', slots: createEmptySlots() }],
          practiceNote: '',
        },
      ];

      if (data.sections?.length && !data.error) {
        sections = data.sections.map((s) => ({
          label: s.label || 'Verse',
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

      const chordPalette = [
        ...new Set([...(video.chordsUsed || []), ...(aiData?.chordsUsed || [])]),
      ].filter(Boolean);

      const lesson = createLesson({
        songTitle: data.title || song,
        artist: data.artist || artist,
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

      updateStep('save', 'done');
      await delay(250);
      navigate(`/editor/${lesson.id}`);
    };

    try {
      await run();
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
            {loading ? 'Working…' : '+ Create My Lesson'}
          </button>
        </div>
      </div>

      {loading && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lesson-fetch-title"
        >
          <div
            className="w-full max-w-sm rounded-[10px] border border-[#2e2b25] bg-[#2a2318] p-5 shadow-none"
            style={{ borderWidth: '0.5px' }}
          >
            <p
              id="lesson-fetch-title"
              className="mb-1 text-[10px] font-normal uppercase tracking-[0.1em] text-[#6b6560]"
            >
              Creating lesson
            </p>
            <p className="mb-4 text-base font-medium text-white">Setting up your editor…</p>
            <ul className="space-y-3">
              {stepStates.map((s) => (
                <StepRow key={s.id} label={s.label} status={s.status} />
              ))}
            </ul>
            <p className="mt-4 text-xs text-[#6b6560]">
              If lyrics aren’t found, you can still add them manually in the editor.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function parseSongFromTitle(title) {
  let cleaned = title
    .replace(
      /\s*(guitar lesson|how to play|on guitar|tutorial|chords|cover|easy|beginner|intermediate|advanced)\s*(\([^)]*\))?\s*$/gi,
      ''
    )
    .trim();

  const byMatch = cleaned.match(
    /^(?:how\s+to\s+play\s+)?(.+?)\s+by\s+(.+?)$/i
  );
  if (byMatch) {
    return { song: byMatch[1].trim(), artist: byMatch[2].trim() };
  }

  const parts = cleaned.split(/\s+[-–—|]\s+/);
  if (parts.length >= 2) {
    return {
      song: parts[0].trim(),
      artist: parts.slice(1).join(' - ').trim(),
    };
  }
  return { song: cleaned, artist: '' };
}
