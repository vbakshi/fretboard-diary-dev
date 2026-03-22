import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { CHORDS } from '../data/chords';
import ChordDiagram from './ChordDiagram';

const DEFAULT_NAMES = ['G', 'C', 'D', 'Em', 'Am', 'E', 'A', 'Dm', 'F', 'Bm'];
const POPOVER_WIDTH = 220;
const POPOVER_MIN = 160;
const LIST_MAX_H = 340;

function filterChordList(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return DEFAULT_NAMES.map((name) => CHORDS.find((c) => c.name === name)).filter(
      Boolean
    );
  }
  const starts = CHORDS.filter((c) => c.name.toLowerCase().startsWith(q));
  const rest = CHORDS.filter(
    (c) =>
      !starts.includes(c) && c.name.toLowerCase().includes(q)
  );
  return [...starts, ...rest].slice(0, 20);
}

export default function ChordPickerPopup({
  open,
  onClose,
  onSelectChord,
  paletteSet,
  anchorRef,
}) {
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0, width: POPOVER_WIDTH });

  const updatePosition = useCallback(() => {
    const btn = anchorRef?.current;
    if (!btn || typeof window === 'undefined') return;
    const rect = btn.getBoundingClientRect();
    const w = Math.min(
      POPOVER_WIDTH,
      Math.max(POPOVER_MIN, window.innerWidth - 24)
    );
    let left = rect.left;
    left = Math.min(left, window.innerWidth - w - 8);
    left = Math.max(8, left);
    let top = rect.bottom + 8;
    const spaceBelow = window.innerHeight - rect.bottom - 16;
    if (spaceBelow < LIST_MAX_H + 40 && rect.top > LIST_MAX_H + 48) {
      top = Math.max(8, rect.top - LIST_MAX_H - 56);
    }
    setPos({ top, left, width: w });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) return;
    // Position overlay from anchor; setState syncs fixed coords to the portal.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- popover layout
    updatePosition();
    const onWin = () => updatePosition();
    window.addEventListener('resize', onWin);
    window.addEventListener('scroll', onWin, true);
    return () => {
      window.removeEventListener('resize', onWin);
      window.removeEventListener('scroll', onWin, true);
    };
  }, [open, updatePosition, search]);

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when closed
      setSearch('');
      return;
    }
    const t = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      const el = rootRef.current;
      const anchor = anchorRef?.current;
      if (el?.contains(e.target)) return;
      if (anchor?.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, onClose, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const list = useMemo(() => filterChordList(search), [search]);

  const handlePick = useCallback(
    (name) => {
      if (paletteSet.has(name)) return;
      onSelectChord(name);
      onClose();
    },
    [paletteSet, onSelectChord, onClose]
  );

  if (!open || typeof document === 'undefined') return null;

  const panel = (
    <div
      ref={rootRef}
      className="fixed z-[10050] rounded-xl border border-[#EF9F27] bg-[#2a2318] p-3 shadow-2xl"
      style={{
        borderWidth: '1px',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        maxWidth: 'min(220px, calc(100vw - 16px))',
      }}
      role="dialog"
      aria-label="Add chord to palette"
    >
      <input
        ref={inputRef}
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search chords..."
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="mb-2 w-full rounded-lg border border-[#3d3830] bg-[#221f1a] px-3 py-2 text-sm text-white placeholder-[#4d4840] outline-none focus:ring-1 focus:ring-[#EF9F27]"
        style={{ borderWidth: '0.5px' }}
      />
      <ul
        className="space-y-1 overflow-y-auto pr-0.5"
        style={{ maxHeight: LIST_MAX_H, scrollbarWidth: 'thin' }}
      >
        {list.map((chord) => {
          const inPalette = paletteSet.has(chord.name);
          return (
            <li key={chord.name}>
              <button
                type="button"
                disabled={inPalette}
                onClick={() => handlePick(chord.name)}
                className={`flex w-full items-center justify-between gap-1.5 rounded-lg px-1.5 py-1.5 text-left transition-colors ${
                  inPalette
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:bg-[#3d2a00]'
                }`}
              >
                <span className="flex min-w-0 flex-1 items-center gap-2 font-mono text-sm text-[#EF9F27]">
                  {chord.name}
                  {inPalette && (
                    <span className="text-xs text-[#6b6560]" aria-hidden>
                      ✓
                    </span>
                  )}
                </span>
                <ChordDiagram
                  name=""
                  frets={chord.frets}
                  fingers={chord.fingers}
                  baseFret={chord.baseFret}
                  barres={chord.barres}
                  size="mini"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return createPortal(panel, document.body);
}
