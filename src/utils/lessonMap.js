/** @param {Record<string, unknown>} row */
export function mapRowToLesson(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    songTitle: row.song_title ?? '',
    artist: row.artist ?? '',
    visibility: row.visibility ?? 'private',
    referenceVideo: row.reference_video ?? null,
    chordPalette: row.chord_palette ?? [],
    progression: row.progression ?? [],
    sequences: Array.isArray(row.sequences) ? row.sequences : [],
    sections: Array.isArray(row.sections) ? row.sections : [],
    status: row.status ?? 'building',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function lessonToDbInsert(data, userId) {
  return {
    user_id: userId,
    song_title: data.songTitle ?? '',
    artist: data.artist ?? '',
    visibility: 'private',
    reference_video: data.referenceVideo ?? null,
    chord_palette: data.chordPalette ?? [],
    progression: data.progression ?? [],
    sequences: data.sequences ?? [],
    sections: data.sections ?? [],
    status: data.status ?? 'building',
  };
}

/** Map partial app-level lesson updates to DB column names. */
export function lessonToDbUpdate(updates) {
  /** @type {Record<string, unknown>} */
  const out = {};
  if ('songTitle' in updates) out.song_title = updates.songTitle;
  if ('artist' in updates) out.artist = updates.artist;
  if ('referenceVideo' in updates) out.reference_video = updates.referenceVideo;
  if ('chordPalette' in updates) out.chord_palette = updates.chordPalette;
  if ('progression' in updates) out.progression = updates.progression;
  if ('sequences' in updates) out.sequences = updates.sequences;
  if ('sections' in updates) out.sections = updates.sections;
  if ('status' in updates) out.status = updates.status;
  if ('visibility' in updates) out.visibility = updates.visibility;
  return out;
}
