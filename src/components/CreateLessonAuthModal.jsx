import { Link } from 'react-router-dom';

export default function CreateLessonAuthModal({
  open,
  onClose,
  onContinueGuest,
  videoTitle,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/65 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-lesson-auth-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-brand-border bg-[#2a2318] px-5 py-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="create-lesson-auth-title"
          className="text-lg font-semibold text-white"
        >
          Save lessons to your diary
        </h2>
        <p className="mt-2 text-sm text-brand-muted">
          Sign in to add this lesson to your personal diary and sync it across devices.
          {videoTitle ? (
            <>
              {' '}
              <span className="text-[#8a8580]">({videoTitle})</span>
            </>
          ) : null}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            to="/auth"
            state={{ from: '/' }}
            className="flex justify-center rounded-lg bg-brand-amber py-2.5 text-center text-sm font-medium text-brand-bg hover:opacity-90"
            onClick={onClose}
          >
            Log in
          </Link>
          <Link
            to="/auth"
            state={{ from: '/' }}
            className="flex justify-center rounded-lg border border-brand-border py-2.5 text-center text-sm font-medium text-white hover:border-brand-amber hover:text-brand-amber"
            onClick={onClose}
          >
            Sign up
          </Link>
          <button
            type="button"
            onClick={() => onContinueGuest()}
            className="rounded-lg py-2.5 text-center text-sm text-brand-muted underline-offset-2 hover:text-white hover:underline"
          >
            Continue as guest
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 rounded-lg py-2 text-center text-xs text-[#6b6560] hover:text-brand-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
