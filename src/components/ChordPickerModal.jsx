import { useState, useMemo } from 'react';
import { CHORDS } from '../data/chords';
import ChordDiagram from './ChordDiagram';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'major', label: 'Major' },
  { id: 'minor', label: 'Minor' },
  { id: 'seventh', label: '7th' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'other', label: 'Other' },
];

const OTHER_CATEGORIES = ['minor7', 'maj7', 'add9', 'power'];

export default function ChordPickerModal({ onSelect, onCancel }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const filtered = useMemo(() => {
    let list = CHORDS;
    const q = search.trim().toLowerCase();
    // When typing a name, search only — category pills would hide valid matches (e.g. "Major" + "Am" = empty).
    if (q) {
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    } else if (category !== 'all') {
      if (category === 'other') {
        list = list.filter((c) => OTHER_CATEGORIES.includes(c.category));
      } else {
        list = list.filter((c) => c.category === category);
      }
    }
    return list;
  }, [search, category]);

  const handleSelect = (chord) => {
    onSelect(chord.name);
    onCancel();
  };

  return (
    <div className="min-h-[500px] w-full bg-brand-surface border border-brand-border rounded-lg p-4">
      <div className="flex items-center justify-between gap-2 mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chords..."
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          className="flex-1 px-3 py-2 rounded bg-brand-bg border border-brand-border text-white placeholder-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-amber"
        />
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 text-brand-muted hover:text-white shrink-0"
        >
          Cancel
        </button>
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={`px-2 py-1 rounded text-sm ${
              category === cat.id
                ? 'bg-brand-amber text-brand-bg'
                : 'bg-brand-bg text-brand-muted hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {filtered.map((chord) => (
          <button
            key={chord.name}
            type="button"
            onClick={() => handleSelect(chord)}
            className="flex flex-col items-center p-2 rounded bg-brand-bg border border-brand-border hover:border-brand-amber transition-colors"
          >
            <ChordDiagram
              name={chord.name}
              frets={chord.frets}
              fingers={chord.fingers}
              baseFret={chord.baseFret}
              barres={chord.barres}
              size="sm"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
