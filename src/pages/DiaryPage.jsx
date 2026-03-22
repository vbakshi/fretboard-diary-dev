import { useState } from 'react';
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleConfirmDelete = () => {
    setRemoving(true);
    window.setTimeout(() => {
      onDelete(lesson.id);
    }, 300);
  };

  return (
    <div
      className={`relative transition-opacity duration-300 ease-out ${
        removing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <Link
        to={`/editor/${lesson.id}`}
        className={`block rounded-lg border border-brand-border bg-brand-surface transition-colors hover:border-brand-amber/50 ${
          confirmDelete ? 'pointer-events-none opacity-40' : ''
        }`}
        onClick={(e) => {
          if (confirmDelete) e.preventDefault();
        }}
      >
        <div className="flex gap-3 p-3 pr-12">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-white">
              {lesson.songTitle || 'Untitled'}
            </h3>
            <p className="text-sm text-brand-muted">{lesson.artist || 'Unknown artist'}</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {(lesson.chordPalette || []).slice(0, 4).map((c) => (
                <span
                  key={c}
                  className="rounded bg-brand-amber/20 px-1.5 py-0.5 text-xs text-brand-amber"
                >
                  {c}
                </span>
              ))}
            </div>
            <p className="mt-1 text-xs text-brand-muted">
              {formatRelative(lesson.updatedAt)}
            </p>
          </div>
          {lesson.referenceVideo?.thumbnail && (
            <img
              src={lesson.referenceVideo.thumbnail}
              alt=""
              className="h-10 w-14 shrink-0 rounded object-cover"
            />
          )}
        </div>
      </Link>

      <div className="absolute right-2 top-2 z-10">
        {confirmDelete ? (
          <div className="flex max-w-[220px] flex-col gap-2 rounded-lg border border-brand-border bg-brand-bg p-2 text-xs shadow-lg">
            <p className="text-white">Delete this lesson?</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded bg-red-700 px-2 py-1 text-white hover:bg-red-600"
              >
                Yes, delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded border border-brand-border px-2 py-1 text-brand-muted hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setConfirmDelete(true);
            }}
            className="rounded p-1 text-lg leading-none text-brand-muted hover:text-red-400"
            aria-label="Delete lesson"
          >
            🗑
          </button>
        )}
      </div>
    </div>
  );
}

export default function DiaryPage() {
  const { lessons, deleteLesson } = useLessons();
  const sorted = [...lessons].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );

  return (
    <div className="mx-auto max-w-[480px] px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold text-white">My Lessons</h1>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="mb-4 text-5xl">🎸</span>
          <p className="mb-2 text-lg text-brand-muted">No lessons yet</p>
          <Link to="/" className="text-brand-amber hover:underline">
            Search for a song to get started
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((lesson) => (
            <DiaryCard key={lesson.id} lesson={lesson} onDelete={deleteLesson} />
          ))}
        </div>
      )}
    </div>
  );
}
