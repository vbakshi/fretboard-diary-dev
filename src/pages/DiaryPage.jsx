import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLessons } from '../hooks/useLessons';

function formatRelative(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

function DiaryCard({ lesson, onDelete }) {
  const [showDelete, setShowDelete] = useState(false);
  const longPressTimer = useRef(null);

  const handleLongPressStart = () => {
    longPressTimer.current = setTimeout(() => setShowDelete(true), 500);
  };
  const handleLongPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  return (
    <div
      className="relative"
      onContextMenu={(e) => {
        e.preventDefault();
        setShowDelete(true);
      }}
      onTouchStart={handleLongPressStart}
      onTouchEnd={handleLongPressEnd}
    >
      <Link to={`/editor/${lesson.id}`} className="block">
        <div className="flex gap-3 p-3 rounded-lg bg-brand-surface border border-brand-border hover:border-brand-amber/50 transition-colors">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-lg">{lesson.songTitle || 'Untitled'}</h3>
          <p className="text-brand-muted text-sm">{lesson.artist || 'Unknown artist'}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {(lesson.chordPalette || []).slice(0, 4).map((c) => (
              <span
                key={c}
                className="text-xs px-1.5 py-0.5 rounded bg-brand-amber/20 text-brand-amber"
              >
                {c}
              </span>
            ))}
          </div>
          <p className="text-brand-muted text-xs mt-1">
            {formatRelative(lesson.updatedAt)}
          </p>
        </div>
        {lesson.referenceVideo?.thumbnail && (
          <img
            src={lesson.referenceVideo.thumbnail}
            alt=""
            className="w-14 h-10 object-cover rounded shrink-0"
          />
        )}
        </div>
      </Link>
      {showDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(lesson.id);
          }}
          className="absolute top-2 right-2 px-2 py-1 text-xs bg-red-600 text-white rounded z-10"
        >
          Delete
        </button>
      )}
    </div>
  );
}

export default function DiaryPage() {
  const { lessons, deleteLesson } = useLessons();
  const sorted = [...lessons].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );

  return (
    <div className="px-4 py-6 max-w-[480px] mx-auto">
      <h1 className="text-2xl font-semibold text-white mb-4">My Lessons</h1>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-5xl mb-4">🎸</span>
          <p className="text-brand-muted text-lg mb-2">No lessons yet</p>
          <Link
            to="/"
            className="text-brand-amber hover:underline"
          >
            Search for a song to get started
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((lesson) => (
            <div key={lesson.id} className="relative">
              <DiaryCard
                lesson={lesson}
                onDelete={deleteLesson}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
