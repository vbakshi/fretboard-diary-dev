import { useState, useCallback } from 'react';
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

function DiaryCard({
  lesson,
  onDelete,
  selectMode,
  selected,
  onToggleSelect,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleConfirmDelete = () => {
    setRemoving(true);
    window.setTimeout(() => {
      onDelete(lesson.id);
    }, 300);
  };

  const cardBody = (
    <div className={`flex gap-3 ${selectMode ? 'p-3' : 'p-3 pr-12'}`}>
      {selectMode && (
        <div className="flex shrink-0 items-start pt-1">
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
              selected
                ? 'border-brand-amber bg-brand-amber text-brand-bg'
                : 'border-brand-border bg-brand-surface'
            }`}
            style={{ borderWidth: '1px' }}
            aria-hidden
          >
            {selected ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : null}
          </span>
        </div>
      )}
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
        <p className="mt-1 text-xs text-brand-muted">{formatRelative(lesson.updatedAt)}</p>
      </div>
      {lesson.referenceVideo?.thumbnail && (
        <img
          src={lesson.referenceVideo.thumbnail}
          alt=""
          className="h-10 w-14 shrink-0 rounded object-cover"
        />
      )}
    </div>
  );

  if (selectMode) {
    return (
      <div
        className={`relative rounded-lg border transition-[opacity,box-shadow] duration-200 ease-out ${
          selected
            ? 'border-brand-amber bg-brand-surface ring-2 ring-brand-amber/40'
            : 'border-brand-border bg-brand-surface'
        } ${removing ? 'opacity-0' : 'opacity-100'}`}
      >
        <button
          type="button"
          onClick={() => onToggleSelect(lesson.id)}
          className="block w-full text-left"
        >
          {cardBody}
        </button>
      </div>
    );
  }

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
        {cardBody}
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
  const { lessons, deleteLesson, deleteLessons } = useLessons();
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const sorted = [...lessons].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const selectAll = useCallback(() => {
    const ordered = [...lessons].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );
    setSelectedIds(ordered.map((l) => l.id));
  }, [lessons]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds([]);
    setBulkConfirm(false);
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.length === 0) return;
    deleteLessons(selectedIds);
    exitSelectMode();
  }, [selectedIds, deleteLessons, exitSelectMode]);

  return (
    <div className="mx-auto max-w-[480px] px-4 py-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <h1 className="text-2xl font-semibold text-white">My Lessons</h1>
        {sorted.length > 0 && (
          <>
            {!selectMode ? (
              <button
                type="button"
                onClick={() => setSelectMode(true)}
                className="shrink-0 rounded-lg border border-brand-border px-3 py-1.5 text-sm text-brand-muted transition-colors hover:border-brand-amber hover:text-white"
              >
                Select
              </button>
            ) : (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="rounded-lg border border-brand-border px-2.5 py-1 text-xs text-brand-muted hover:border-brand-amber hover:text-white"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={selectedIds.length === 0}
                  className="rounded-lg border border-brand-border px-2.5 py-1 text-xs text-brand-muted hover:border-brand-amber hover:text-white disabled:opacity-40"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={exitSelectMode}
                  className="rounded-lg border border-brand-border px-2.5 py-1 text-xs text-brand-muted hover:border-brand-amber hover:text-white"
                >
                  Done
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectMode && sorted.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm">
          <span className="text-brand-muted">
            {selectedIds.length === 0
              ? 'Tap lessons to select'
              : `${selectedIds.length} selected`}
          </span>
          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => setBulkConfirm(true)}
            className="rounded-md bg-red-700/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete selected
          </button>
        </div>
      )}

      {bulkConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-delete-title"
          onClick={() => setBulkConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-brand-border bg-brand-bg p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="bulk-delete-title" className="text-lg font-semibold text-white">
              Delete {selectedIds.length} lesson{selectedIds.length === 1 ? '' : 's'}?
            </h2>
            <p className="mt-2 text-sm text-brand-muted">
              This cannot be undone.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setBulkConfirm(false)}
                className="rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-muted hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
            <DiaryCard
              key={lesson.id}
              lesson={lesson}
              onDelete={deleteLesson}
              selectMode={selectMode}
              selected={selectedIds.includes(lesson.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
