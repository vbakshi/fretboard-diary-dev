import { useState, useEffect, useRef } from 'react';
import { useLessons } from '../hooks/useLessons';

const OPTIONS = [
  {
    value: 'private',
    icon: '🔒',
    label: 'Private',
    description: 'Only you can see this',
  },
  {
    value: 'followers',
    icon: '👥',
    label: 'Followers',
    description: 'People who follow you',
  },
  {
    value: 'public',
    icon: '🌐',
    label: 'Public',
    description: 'Anyone on Fretboard Diary',
  },
];

function pillLabel(visibility) {
  const o = OPTIONS.find((x) => x.value === visibility);
  return o ? `${o.icon} ${o.label}` : '🔒 Private';
}

export default function VisibilitySelector({ lessonId, visibility = 'private' }) {
  const { updateVisibility } = useLessons();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const select = async (v) => {
    setOpen(false);
    if (v === visibility) return;
    await updateVisibility(lessonId, v);
  };

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex max-w-[140px] items-center gap-1 rounded-full border border-[#3d3830] bg-[#221f1a] px-2.5 py-1 text-left text-[11px] font-medium text-brand-muted"
        style={{ borderWidth: '0.5px' }}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate">{pillLabel(visibility)}</span>
        <span className="text-[10px] text-[#6b6560]" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <ul
          className="absolute right-0 z-50 mt-1 min-w-[220px] rounded-lg border border-brand-border bg-[#2a2318] py-1 shadow-lg"
          role="listbox"
        >
          {OPTIONS.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === visibility}
                onClick={() => select(o.value)}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition-colors ${
                  o.value === visibility
                    ? 'bg-brand-amber/15 text-brand-amber'
                    : 'text-brand-muted hover:bg-[#332a20] hover:text-white'
                }`}
              >
                <span className="shrink-0 pt-0.5">{o.icon}</span>
                <span>
                  <span className="font-medium text-white">{o.label}</span>
                  <span className="mt-0.5 block text-[11px] text-[#6b6560]">
                    {o.description}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
