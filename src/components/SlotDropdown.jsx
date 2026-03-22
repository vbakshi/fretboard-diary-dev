import { useEffect, useRef } from 'react';

/**
 * Inline dropdown in normal document flow (relative parent). Not fixed / not portal.
 * Options: palette chords + pause (—) + clear (✕).
 */
export default function SlotDropdown({
  open,
  onClose,
  paletteChords,
  onPickChord,
  onPickPause,
  onClear,
}) {
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={rootRef}
      className="absolute left-0 top-full z-50 mt-0.5 min-w-[140px] overflow-hidden rounded-lg border border-[#3d3830] bg-[#2a2318]"
      role="listbox"
    >
      <div
        className="max-h-[216px] overflow-y-auto"
        style={{ scrollbarWidth: 'thin' }}
      >
        {(paletteChords || []).map((name) => (
          <button
            key={name}
            type="button"
            role="option"
            className="flex h-9 w-full items-center px-3 text-left text-xs text-[#EF9F27] transition-colors duration-150 ease-in-out hover:bg-[#3d2a00]"
            onClick={() => {
              onPickChord(name);
              onClose();
            }}
          >
            {name}
          </button>
        ))}
        <button
          type="button"
          role="option"
          className="flex h-9 w-full items-center px-3 text-left text-xs text-[#EF9F27] transition-colors duration-150 ease-in-out hover:bg-[#3d2a00]"
          onClick={() => {
            onPickPause();
            onClose();
          }}
        >
          — pause
        </button>
        <button
          type="button"
          role="option"
          className="flex h-9 w-full items-center px-3 text-left text-xs text-[#EF9F27] transition-colors duration-150 ease-in-out hover:bg-[#3d2a00]"
          onClick={() => {
            onClear();
            onClose();
          }}
        >
          ✕ clear
        </button>
      </div>
    </div>
  );
}
