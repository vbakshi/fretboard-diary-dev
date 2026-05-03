import { useState, useEffect } from 'react';
import { getAICache, setAICache } from '../hooks/useSearch';
import { useCreateLesson } from '../hooks/useCreateLesson';
import { useAuth } from '../context/AuthContext';
import CreateLessonAuthModal from './CreateLessonAuthModal';

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
  const { user } = useAuth();
  const { createLessonFromVideo, creating } = useCreateLesson(searchQuery);
  const [aiData, setAIData] = useState(() => getAICache(video.videoId));
  const [authGateOpen, setAuthGateOpen] = useState(false);

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

  const handleCreateLesson = () => {
    if (!user) {
      setAuthGateOpen(true);
      return;
    }
    createLessonFromVideo(video, {
      additionalChordsUsed: aiData?.chordsUsed || [],
    });
  };

  const diffStyle = DIFFICULTY_STYLES[video.difficultyLabel] || DIFFICULTY_STYLES.Intermediate;

  return (
    <>
      <CreateLessonAuthModal
        open={authGateOpen}
        onClose={() => setAuthGateOpen(false)}
        onContinueGuest={() => {
          setAuthGateOpen(false);
          createLessonFromVideo(video, {
            guestMode: true,
            additionalChordsUsed: aiData?.chordsUsed || [],
          });
        }}
        videoTitle={video.title}
      />
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
            disabled={creating}
            className="rounded bg-brand-amber px-3 py-1.5 text-sm font-medium text-brand-bg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? 'Fetching lyrics...' : '+ Create My Lesson'}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
