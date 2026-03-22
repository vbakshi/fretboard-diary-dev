/** @typedef {{ chord: string | null, pause: boolean }} ChordSlot */

/** @returns {ChordSlot[]} */
export function createEmptySlots() {
  return Array.from({ length: 4 }, () => ({ chord: null, pause: false }));
}

/** @param {ChordSlot[]} slots */
export function cloneSlots(slots) {
  return (slots || createEmptySlots()).map((s) => ({
    chord: s.chord ?? null,
    pause: Boolean(s.pause),
  }));
}

/** Migrate legacy line { chords: string[] } to { slots } */
export function migrateLine(line) {
  if (!line) return { text: '', slots: createEmptySlots() };
  if (line.slots && Array.isArray(line.slots) && line.slots.length === 4) {
    const { chords: _c, ...rest } = line;
    return { ...rest, slots: cloneSlots(line.slots) };
  }
  const slots = createEmptySlots();
  const chords = line.chords || [];
  for (let i = 0; i < 4 && i < chords.length; i++) {
    const c = chords[i];
    if (c === '—' || c === '-' || c === '—') {
      slots[i] = { chord: null, pause: true };
    } else if (c) {
      slots[i] = { chord: String(c), pause: false };
    }
  }
  const { chords: _ch, ...rest } = line;
  return { ...rest, slots };
}

export function migrateSection(section) {
  return {
    ...section,
    lines: (section.lines || []).map(migrateLine),
  };
}

export function migrateSequence(seq) {
  if (!seq) return seq;
  if (seq.slots && Array.isArray(seq.slots) && seq.slots.length === 4) {
    return { ...seq, slots: cloneSlots(seq.slots) };
  }
  return { ...seq, slots: createEmptySlots() };
}

export function migrateLesson(lesson) {
  if (!lesson) return lesson;
  return {
    ...lesson,
    sequences: Array.isArray(lesson.sequences)
      ? lesson.sequences.map(migrateSequence)
      : [],
    sections: (lesson.sections || []).map(migrateSection),
  };
}

export function lineId(sectionIdx, lineIdx) {
  return `s${sectionIdx}-l${lineIdx}`;
}

export function parseLineId(id) {
  const m = /^s(\d+)-l(\d+)$/.exec(id);
  if (!m) return null;
  return { sectionIdx: Number(m[1]), lineIdx: Number(m[2]) };
}
