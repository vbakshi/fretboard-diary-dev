import { useState, useEffect } from 'react';
import { cloneSlots, createEmptySlots } from '../utils/slots';
import SlotDropdown from './SlotDropdown';

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function EditSlotCell({
  slot,
  idx,
  openSlotIdx,
  setOpenSlotIdx,
  setDraftIndex,
  chordPalette,
}) {
  const open = openSlotIdx === idx;

  return (
    <div className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpenSlotIdx(open ? null : idx)}
        className={`flex h-7 w-full min-w-0 items-center justify-center rounded border text-[11px] font-medium transition-colors duration-150 ease-in-out ${
          !slot.pause && !slot.chord
            ? 'border-dashed border-[#3d3830] bg-[#1a1510] text-[#4d4840]'
            : slot.pause
              ? 'border-[#2a2520] bg-[#1a1510] text-[#4d4840]'
              : 'border-[#3d3830] bg-[#1a1510] text-[#EF9F27]'
        }`}
        style={{ borderWidth: '0.5px', borderRadius: '5px' }}
      >
        {!slot.pause && !slot.chord && '+'}
        {slot.pause && '—'}
        {!slot.pause && slot.chord && slot.chord}
      </button>
      <SlotDropdown
        open={open}
        onClose={() => setOpenSlotIdx(null)}
        paletteChords={chordPalette}
        onPickChord={(name) => setDraftIndex(idx, { chord: name, pause: false })}
        onPickPause={() => setDraftIndex(idx, { chord: null, pause: true })}
        onClear={() => setDraftIndex(idx, { chord: null, pause: false })}
      />
    </div>
  );
}

function lineHasChordContent(slots) {
  return (slots || []).some((s) => s.chord || s.pause);
}

export default function LyricBlock({
  lineId,
  line,
  chordPalette,
  isSelected,
  isEditing,
  onToggleSelect,
  onEditStart,
  onEditConfirm,
  onEditCancel,
  onClearSlot,
}) {
  const slots = line.slots?.length === 4 ? line.slots : createEmptySlots();
  const [draftSlots, setDraftSlots] = useState(() => cloneSlots(slots));
  const [openSlotIdx, setOpenSlotIdx] = useState(null);

  useEffect(() => {
    if (isEditing) {
      setDraftSlots(cloneSlots(slots));
    }
  }, [isEditing, slots]);

  const startManualEdit = () => {
    setDraftSlots(cloneSlots(slots));
    setOpenSlotIdx(null);
    onEditStart(lineId);
  };

  const confirmEdit = () => {
    onEditConfirm(lineId, draftSlots);
  };

  const cancelEdit = () => {
    onEditCancel(lineId);
  };

  const setDraftIndex = (idx, slot) => {
    setDraftSlots((prev) => {
      const next = cloneSlots(prev);
      next[idx] = slot;
      return next;
    });
  };

  const annotated = lineHasChordContent(slots);

  return (
    <div
      className={`flex gap-0 rounded-lg px-1 py-1 transition-colors duration-150 ease-in-out ${
        isSelected ? 'bg-[#2a2210]' : ''
      } ${isEditing ? 'border-l-2 border-[#EF9F27] pl-1' : ''}`}
    >
      <div className="flex w-9 shrink-0 items-center justify-center self-start pt-0.5">
        <label className="flex min-h-[24px] min-w-[24px] cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(lineId)}
            className="peer sr-only"
          />
          <span
            className="flex h-4 w-4 items-center justify-center rounded border border-[#3d3830] bg-transparent transition-colors duration-150 ease-in-out peer-checked:border-[#EF9F27] peer-checked:bg-[#EF9F27] [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
            style={{ borderWidth: '0.5px', borderRadius: '4px' }}
          >
            <CheckIcon />
          </span>
        </label>
      </div>

      <div className="min-w-0 flex-1 overflow-visible">
        {!isEditing ? (
          <>
            <div
              className="mb-0.5 flex min-h-[18px] flex-wrap items-center gap-1.5"
              style={{ gap: '5px' }}
            >
              {slots.map((slot, idx) => {
                if (slot.pause) {
                  return (
                    <span
                      key={idx}
                      className="px-1 py-0.5 font-mono text-[11px] text-[#3d3830]"
                    >
                      —
                    </span>
                  );
                }
                if (slot.chord) {
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded border border-[#6b4e10] bg-[#2e2510] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#EF9F27]"
                      style={{ borderWidth: '0.5px', borderRadius: '4px' }}
                    >
                      {slot.chord}
                      <button
                        type="button"
                        onClick={() => onClearSlot(lineId, idx)}
                        className="flex min-h-[24px] min-w-[24px] items-center justify-center text-[#6b4e10] transition-colors duration-150 ease-in-out hover:text-[#EF9F27]"
                        aria-label={`Clear ${slot.chord}`}
                      >
                        <span className="text-[10px] leading-none">×</span>
                      </button>
                    </span>
                  );
                }
                return null;
              })}
              <button
                type="button"
                onClick={startManualEdit}
                className="border border-dashed border-[#2e2b25] bg-transparent px-1.5 py-0.5 text-[10px] italic text-[#3d3830] transition-colors duration-150 ease-in-out hover:border-[#EF9F27] hover:text-[#EF9F27]"
                style={{ borderWidth: '0.5px', borderRadius: '4px' }}
              >
                + chord
              </button>
            </div>
            <div
              className={`font-serif text-[13px] leading-[1.5] ${
                annotated ? 'text-[#d4cfc8]' : 'text-[#b0a898]'
              }`}
            >
              {line.text || '\u00A0'}
            </div>
          </>
        ) : (
          <>
            <div className="mb-1 flex items-center gap-1.5">
              <div className="flex min-w-0 flex-1 gap-1.5">
                {draftSlots.map((slot, idx) => (
                  <EditSlotCell
                    key={idx}
                    slot={slot}
                    idx={idx}
                    openSlotIdx={openSlotIdx}
                    setOpenSlotIdx={setOpenSlotIdx}
                    setDraftIndex={setDraftIndex}
                    chordPalette={chordPalette}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={confirmEdit}
                className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md bg-[#EF9F27] transition-opacity duration-150 ease-in-out"
                aria-label="Confirm"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a1510" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="flex h-[26px] w-[26px] shrink-0 items-center justify-center text-[#4d4840] transition-colors duration-150 ease-in-out hover:text-[#EF9F27]"
                aria-label="Cancel"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div
              className={`font-serif text-[13px] leading-[1.5] ${
                annotated ? 'text-[#d4cfc8]' : 'text-[#b0a898]'
              }`}
            >
              {line.text || '\u00A0'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
