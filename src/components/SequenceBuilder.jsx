import { useState, useEffect } from 'react';
import { cloneSlots } from '../utils/slots';
import SlotDropdown from './SlotDropdown';

function CheckIcon({ stroke = '#1a1510' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.5">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function SequenceSlotBox({
  slot,
  open,
  onOpen,
  onClose,
  paletteChords,
  onSetSlot,
}) {
  const isEmpty = !slot.pause && !slot.chord;
  const isPause = slot.pause;

  return (
    <div className="relative min-w-[42px] flex-1">
      <button
        type="button"
        onClick={onOpen}
        className={`flex h-7 w-full items-center justify-center rounded-md border text-[11px] font-medium transition-colors duration-150 ease-in-out ${
          isEmpty
            ? 'border-dashed border-[#3d3830] bg-[#1a1510] text-[#4d4840]'
            : isPause
              ? 'border-[#2a2520] bg-[#1a1510] text-[#4d4840]'
              : 'border-[#3d3830] bg-[#1a1510] text-[#EF9F27]'
        }`}
        style={{ borderWidth: '0.5px' }}
      >
        {isEmpty && '+'}
        {isPause && '—'}
        {!isEmpty && !isPause && slot.chord}
      </button>
      <SlotDropdown
        open={open}
        onClose={onClose}
        paletteChords={paletteChords}
        onPickChord={(name) => onSetSlot({ chord: name, pause: false })}
        onPickPause={() => onSetSlot({ chord: null, pause: true })}
        onClear={() => onSetSlot({ chord: null, pause: false })}
      />
    </div>
  );
}

export default function SequenceBuilder({
  sequences,
  paletteChords,
  editingSequenceId,
  onBeginEdit,
  onCommitSequence,
  onUpdateSequenceLabel,
  onDeleteSequence,
  onAddSequence,
}) {
  const [draftSlots, setDraftSlots] = useState(null);
  const [openSlot, setOpenSlot] = useState(null);

  // Only sync draft when switching which sequence is being edited (not on every sequences prop change).
  useEffect(() => {
    if (!editingSequenceId) {
      setDraftSlots(null);
      setOpenSlot(null);
      return;
    }
    const seq = sequences.find((s) => s.id === editingSequenceId);
    if (seq) {
      setDraftSlots(cloneSlots(seq.slots));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: avoid wiping draft on label save etc.
  }, [editingSequenceId]);

  const setSlotAt = (seq, idx, nextSlot) => {
    setDraftSlots((prev) => {
      if (editingSequenceId !== seq.id) {
        return prev;
      }
      const base = prev ? cloneSlots(prev) : cloneSlots(seq.slots);
      base[idx] = nextSlot;
      return base;
    });
  };

  const handleConfirm = (seq) => {
    if (editingSequenceId !== seq.id || !draftSlots) return;
    onCommitSequence({ ...seq, slots: cloneSlots(draftSlots) });
  };

  return (
    <div className="mt-4 border-t border-[#2a2520] pt-4">
      <p className="mb-3 text-[10px] font-normal uppercase tracking-[0.1em] text-[#6b6560]">
        CHORD SEQUENCES
      </p>
      <div className="flex flex-col">
        {sequences.map((seq) => {
          const displaySlots =
            editingSequenceId === seq.id && draftSlots ? draftSlots : seq.slots;
          const isEditing = editingSequenceId === seq.id;

          return (
            <div
              key={seq.id}
              className="relative mb-2 flex items-center gap-0 overflow-visible rounded-[10px] border border-[#2e2b25] bg-[#221f1a] px-2.5 py-2"
              style={{ borderWidth: '0.5px' }}
            >
              <input
                type="text"
                defaultValue={seq.label}
                onBlur={(e) => onUpdateSequenceLabel?.(seq.id, e.target.value)}
                className="w-6 shrink-0 border-none bg-transparent text-[11px] font-semibold tracking-[0.02em] text-[#EF9F27] outline-none placeholder:text-[#4d4840]"
                style={{ width: '24px' }}
                aria-label="Sequence label"
              />
              <div className="ml-1 flex min-w-0 flex-1 items-center gap-1">
                {displaySlots.map((slot, idx) => (
                  <span key={idx} className="flex min-w-0 flex-1 items-center gap-1">
                    {idx > 0 && (
                      <span
                        className="mx-0.5 shrink-0 text-[10px] text-[#3a3630]"
                        aria-hidden
                      >
                        ·
                      </span>
                    )}
                    <SequenceSlotBox
                      slot={slot}
                      open={openSlot === `${seq.id}-${idx}`}
                      onOpen={() => {
                        if (editingSequenceId !== seq.id) {
                          onBeginEdit(seq.id);
                        }
                        setOpenSlot(`${seq.id}-${idx}`);
                      }}
                      onClose={() => setOpenSlot(null)}
                      paletteChords={paletteChords}
                      onSetSlot={(next) => setSlotAt(seq, idx, next)}
                    />
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => handleConfirm(seq)}
                disabled={!isEditing}
                className="ml-1 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md bg-[#EF9F27] transition-opacity duration-150 ease-in-out disabled:pointer-events-none disabled:opacity-40"
                title="Confirm sequence"
                aria-label="Confirm sequence"
              >
                <CheckIcon stroke="#1a1510" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteSequence(seq.id)}
                className="group/del ml-1 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md transition-colors duration-150 ease-in-out"
                aria-label="Delete sequence"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4d4840"
                  strokeWidth="2"
                  className="transition-colors duration-150 ease-in-out group-hover/del:stroke-[#EF9F27]"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onAddSequence}
        className="mt-1 w-full rounded-[10px] border border-dashed border-[#2e2b25] bg-transparent py-[9px] text-center text-xs text-[#5a5650] transition-colors duration-150 ease-in-out hover:border-[#EF9F27] hover:text-[#EF9F27]"
        style={{ borderWidth: '0.5px' }}
      >
        + Add sequence
      </button>
    </div>
  );
}
