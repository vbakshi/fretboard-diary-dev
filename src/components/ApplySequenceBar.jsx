function formatSequencePreview(slots) {
  const parts = (slots || [])
    .map((s) => {
      if (s.pause) return '—';
      if (s.chord) return s.chord;
      return null;
    })
    .filter((p) => p !== null);
  return parts.join(' · ');
}

export default function ApplySequenceBar({
  sequences,
  selectedSequenceId,
  onSelectSequence,
  onApply,
  applyDisabled,
  noLinesSelected,
}) {
  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <span className="shrink-0 text-xs text-[#6b6560]">Apply:</span>
      <select
        value={selectedSequenceId || ''}
        onChange={(e) =>
          onSelectSequence(e.target.value ? e.target.value : null)
        }
        className="min-w-0 flex-1 appearance-none rounded-lg border border-[#3d3830] bg-[#221f1a] px-2.5 py-[7px] text-xs text-[#EF9F27] outline-none"
        style={{ borderWidth: '0.5px', borderRadius: '8px' }}
      >
        <option value="">Choose sequence…</option>
        {sequences.map((seq) => (
          <option key={seq.id} value={seq.id}>
            {seq.label} — {formatSequencePreview(seq.slots)}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={applyDisabled}
        onClick={onApply}
        className={`shrink-0 rounded-lg bg-[#EF9F27] px-3.5 py-[7px] text-xs font-semibold text-[#1a1510] whitespace-nowrap transition-opacity duration-150 ease-in-out disabled:cursor-not-allowed ${
          noLinesSelected ? 'pointer-events-none opacity-40' : 'opacity-100'
        }`}
        style={{ borderRadius: '8px' }}
      >
        Apply to lines
      </button>
    </div>
  );
}
