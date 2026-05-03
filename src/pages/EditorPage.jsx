import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useLessons } from '../hooks/useLessons';
import { CHORDS } from '../data/chords';
import ChordDiagram from '../components/ChordDiagram';
import ChordPickerPopup from '../components/ChordPickerPopup';
import LyricBlock from '../components/LyricBlock';
import SequenceBuilder from '../components/SequenceBuilder';
import ApplySequenceBar from '../components/ApplySequenceBar';
import StudyVideoPanel from '../components/StudyVideoPanel';
import VisibilitySelector from '../components/VisibilitySelector';
import {
  createEmptySlots,
  cloneSlots,
  migrateSection,
  lineId as makeLineId,
  parseLineId,
} from '../utils/slots';
import { uuid } from '../utils/uuid';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function nextSequenceLabel(sequences) {
  let max = 0;
  for (const s of sequences) {
    const n = parseInt(String(s.label).replace(/\D/g, ''), 10);
    if (!Number.isNaN(n)) max = Math.max(max, n);
  }
  return `S${max + 1}`;
}

export default function EditorPage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { getLesson, updateLesson, deleteLesson } = useLessons();
  const location = useLocation();
  const lesson = getLesson(lessonId);

  const [songTitle, setSongTitle] = useState('');
  const [sections, setSections] = useState([]);
  const [chordPalette, setChordPalette] = useState([]);
  const [progression, setProgression] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [showChordPicker, setShowChordPicker] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lyricsNotFoundToast, setLyricsNotFoundToast] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const addChordAnchorRef = useRef(null);
  const chordPaletteSectionRef = useRef(null);
  const paletteAttentionTimerRef = useRef(null);
  const [paletteHighlight, setPaletteHighlight] = useState(false);
  const [sequencePaletteMessage, setSequencePaletteMessage] = useState('');

  const [applySequenceId, setApplySequenceId] = useState(null);
  const [selectedLineIds, setSelectedLineIds] = useState(() => new Set());
  const [editingLineId, setEditingLineId] = useState(null);
  const [editingSequenceId, setEditingSequenceId] = useState(null);

  const [studyMode, setStudyMode] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [showPauseHint, setShowPauseHint] = useState(false);
  const ytPlayerRef = useRef(null);
  const wasPlayingRef = useRef(false);
  const ytContainerId = useMemo(() => `yt-player-${lessonId || 'lesson'}`, [lessonId]);

  const handlePlayStateChange = useCallback((playing) => {
    setVideoPlaying(playing);
    if (playing) setShowPauseHint(false);
  }, []);

  useEffect(() => {
    if (studyMode && videoPlaying) {
      setEditingLineId(null);
      setEditingSequenceId(null);
    }
  }, [studyMode, videoPlaying]);

  useEffect(() => {
    if (!studyMode) {
      wasPlayingRef.current = false;
      return;
    }
    if (wasPlayingRef.current && !videoPlaying) {
      setShowPauseHint(true);
      const timer = setTimeout(() => setShowPauseHint(false), 4000);
      wasPlayingRef.current = videoPlaying;
      return () => clearTimeout(timer);
    }
    wasPlayingRef.current = videoPlaying;
  }, [studyMode, videoPlaying]);

  const toggleStudyMode = useCallback(() => {
    if (studyMode) {
      try {
        ytPlayerRef.current?.pauseVideo?.();
      } catch {
        /* ignore */
      }
      setVideoPlaying(false);
      setStudyMode(false);
      setShowPauseHint(false);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setStudyMode(true);
      setVideoPlaying(false);
    }
  }, [studyMode]);

  const blocksEditing = studyMode && videoPlaying;

  useEffect(() => {
    if (lesson) {
      setSongTitle(lesson.songTitle || '');
      setSections(
        JSON.parse(
          JSON.stringify((lesson.sections || []).map(migrateSection))
        )
      );
      setChordPalette([...(lesson.chordPalette || [])]);
      setProgression([...(lesson.progression || [])]);
      setSequences(
        Array.isArray(lesson.sequences)
          ? JSON.parse(JSON.stringify(lesson.sequences))
          : []
      );
    }
  }, [lesson?.id]);

  useEffect(() => {
    if (location.state?.lyricsNotFound) {
      setLyricsNotFoundToast(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.lyricsNotFound, location.pathname, navigate]);

  const persist = useCallback(() => {
    if (!lessonId) return;
    updateLesson(lessonId, {
      songTitle,
      sections,
      chordPalette,
      progression,
      sequences,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [
    lessonId,
    songTitle,
    sections,
    chordPalette,
    progression,
    sequences,
    updateLesson,
  ]);

  const [saveTrigger, setSaveTrigger] = useState(0);
  const debouncedTrigger = useDebounce(saveTrigger, 1000);

  useEffect(() => {
    return () => {
      if (paletteAttentionTimerRef.current) {
        clearTimeout(paletteAttentionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!lessonId || debouncedTrigger === 0) return;
    updateLesson(lessonId, {
      songTitle,
      sections,
      chordPalette,
      progression,
      sequences,
    });
  }, [lessonId, debouncedTrigger]);

  useEffect(() => {
    if (!lesson) return;
    setSaveTrigger((t) => t + 1);
  }, [songTitle, sections, chordPalette, progression, sequences]);

  const addChordToPalette = (name) => {
    if (chordPalette.includes(name)) return;
    setChordPalette((p) => [...p, name]);
    setShowChordPicker(false);
  };

  const removeChordFromPalette = (name) => {
    setChordPalette((p) => p.filter((c) => c !== name));
    setProgression((pr) => pr.filter((c) => c !== name));
    setSections((s) =>
      s.map((sec) => ({
        ...sec,
        lines: sec.lines.map((line) => ({
          ...line,
          slots: (line.slots || createEmptySlots()).map((slot) =>
            slot.chord === name ? { chord: null, pause: false } : slot
          ),
        })),
      }))
    );
    setSequences((seqs) =>
      seqs.map((seq) => ({
        ...seq,
        slots: cloneSlots(seq.slots).map((slot) =>
          slot.chord === name ? { chord: null, pause: false } : slot
        ),
      }))
    );
  };

  const addToProgression = (name) => {
    if (progression.includes(name)) return;
    setProgression((p) => [...p, name]);
  };

  const removeFromProgression = (idx) => {
    setProgression((p) => p.filter((_, i) => i !== idx));
  };

  const updateSectionLabel = (sectionIdx, label) => {
    setSections((s) =>
      s.map((sec, i) => (i === sectionIdx ? { ...sec, label } : sec))
    );
  };

  const updateSectionPracticeNote = (sectionIdx, practiceNote) => {
    setSections((s) =>
      s.map((sec, i) => (i === sectionIdx ? { ...sec, practiceNote } : sec))
    );
  };

  const addLineToSection = (sectionIdx) => {
    setSections((s) =>
      s.map((sec, i) =>
        i === sectionIdx
          ? {
              ...sec,
              lines: [
                ...(sec.lines || []),
                { text: '', slots: createEmptySlots() },
              ],
            }
          : sec
      )
    );
  };

  const updateLineSlots = (sectionIdx, lineIdx, slots) => {
    setSections((s) =>
      s.map((sec, i) =>
        i === sectionIdx
          ? {
              ...sec,
              lines: sec.lines.map((l, j) =>
                j === lineIdx ? { ...l, slots: cloneSlots(slots) } : l
              ),
            }
          : sec
      )
    );
  };

  const clearLineSlot = (lid, slotIdx) => {
    const parsed = parseLineId(lid);
    if (!parsed) return;
    const { sectionIdx, lineIdx } = parsed;
    setSections((s) =>
      s.map((sec, si) =>
        si === sectionIdx
          ? {
              ...sec,
              lines: sec.lines.map((line, li) => {
                if (li !== lineIdx) return line;
                const slots = cloneSlots(line.slots || createEmptySlots());
                slots[slotIdx] = { chord: null, pause: false };
                return { ...line, slots };
              }),
            }
          : sec
      )
    );
  };

  const handleToggleLineSelect = (lid) => {
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(lid)) next.delete(lid);
      else next.add(lid);
      return next;
    });
  };

  const handleEditStartLine = (lid) => {
    setEditingSequenceId(null);
    setEditingLineId(lid);
  };

  const handleEditConfirm = (lid, slots) => {
    const parsed = parseLineId(lid);
    if (!parsed) return;
    updateLineSlots(parsed.sectionIdx, parsed.lineIdx, slots);
    setEditingLineId(null);
  };

  const handleEditCancel = () => {
    setEditingLineId(null);
  };

  const handleBeginEditSequence = (id) => {
    setEditingLineId(null);
    setEditingSequenceId(id);
  };

  const handleCommitSequence = (seq) => {
    setSequences((prev) => prev.map((s) => (s.id === seq.id ? seq : s)));
    setEditingSequenceId(null);
  };

  const handleUpdateSequenceLabel = (id, label) => {
    setSequences((prev) =>
      prev.map((s) => (s.id === id ? { ...s, label: label.trim() || s.label } : s))
    );
  };

  const handleApplySequence = () => {
    if (!applySequenceId) return;
    const seq = sequences.find((s) => s.id === applySequenceId);
    if (!seq) return;
    const newSlots = cloneSlots(seq.slots);
    setSections((prev) =>
      prev.map((sec, si) => ({
        ...sec,
        lines: sec.lines.map((line, li) => {
          const lid = makeLineId(si, li);
          if (!selectedLineIds.has(lid)) return line;
          return { ...line, slots: cloneSlots(newSlots) };
        }),
      }))
    );
    setSelectedLineIds(new Set());
    setApplySequenceId(null);
  };

  const handleDeleteSequence = (id) => {
    setSequences((prev) => prev.filter((s) => s.id !== id));
    if (applySequenceId === id) setApplySequenceId(null);
    if (editingSequenceId === id) setEditingSequenceId(null);
  };

  const handleAddSequence = () => {
    if (chordPalette.length === 0) {
      setSequencePaletteMessage(
        'Please add chords to the Chord Palette before creating sequences.'
      );
      setPaletteHighlight(true);
      requestAnimationFrame(() => {
        chordPaletteSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      });
      if (paletteAttentionTimerRef.current) {
        clearTimeout(paletteAttentionTimerRef.current);
      }
      paletteAttentionTimerRef.current = setTimeout(() => {
        setPaletteHighlight(false);
        setSequencePaletteMessage('');
        paletteAttentionTimerRef.current = null;
      }, 2800);
      return;
    }
    const id = uuid();
    setSequences((prev) => [
      ...prev,
      {
        id,
        label: nextSequenceLabel(prev),
        slots: createEmptySlots(),
      },
    ]);
    setEditingSequenceId(id);
  };

  const getChordData = (name) => CHORDS.find((c) => c.name === name);

  const chordPaletteSet = useMemo(() => new Set(chordPalette), [chordPalette]);

  const handleDeleteLesson = useCallback(() => {
    if (!lessonId) return;
    const current = getLesson(lessonId);
    const dest = current?.persistLocallyOnly ? '/' : '/diary';
    deleteLesson(lessonId);
    navigate(dest);
  }, [lessonId, deleteLesson, navigate, getLesson]);

  const applyDisabled =
    !applySequenceId || selectedLineIds.size === 0;
  const noLinesSelected = selectedLineIds.size === 0;

  if (!lesson) {
    return (
      <div className="p-4 text-brand-muted">
        Lesson not found.{' '}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-brand-amber"
        >
          Back home
        </button>
      </div>
    );
  }

  const backTarget = lesson.persistLocallyOnly ? '/' : '/diary';

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-[#1a1510]">
      {lyricsNotFoundToast && (
        <div className="border-b border-amber-900/50 bg-amber-950/90 px-4 py-2 text-center text-sm text-amber-100">
          <span>Lyrics not found — you can type them in manually. </span>
          <button
            type="button"
            onClick={() => setLyricsNotFoundToast(false)}
            className="text-amber-300 underline"
          >
            Dismiss
          </button>
        </div>
      )}
      {lesson.persistLocallyOnly && (
        <div className="border-b border-brand-border bg-brand-surface px-4 py-2 text-center text-xs text-brand-muted">
          Guest lesson — saved only on this device until you{' '}
          <button
            type="button"
            onClick={() => navigate('/auth')}
            className="text-brand-amber underline-offset-2 hover:underline"
          >
            sign in
          </button>{' '}
          and create a diary lesson.
        </div>
      )}
      <div className="sticky top-0 z-40 flex flex-wrap items-start justify-between gap-2 border-b border-[#2e2b25] bg-[#1a1510] px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(backTarget)}
          className="shrink-0 text-xl text-brand-amber"
        >
          ←
        </button>
        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            readOnly={blocksEditing}
            className="w-full border-none bg-transparent text-xl font-semibold text-white outline-none placeholder-brand-muted read-only:opacity-70"
            placeholder="Song title"
          />
          <p className="truncate text-sm text-brand-muted">{lesson.artist}</p>
        </div>
        <button
          type="button"
          onClick={toggleStudyMode}
          className="flex shrink-0 cursor-pointer items-center rounded-[20px] border border-[#3d3830] bg-[#221f1a]"
          style={{
            borderWidth: '0.5px',
            padding: '4px 10px',
            gap: 6,
          }}
          aria-pressed={studyMode}
          aria-label={studyMode ? 'Exit study mode' : 'Enter study mode'}
        >
          <span
            className={`shrink-0 rounded-full ${
              studyMode ? 'bg-[#EF9F27] study-pulse' : 'bg-[#3d3830]'
            }`}
            style={{ width: 7, height: 7 }}
            aria-hidden
          />
          <span
            className="text-[11px] font-medium"
            style={{ color: studyMode ? '#EF9F27' : '#6b6560' }}
          >
            Study
          </span>
        </button>
        {lesson.persistLocallyOnly ? (
          <span
            className="flex max-w-[140px] items-center rounded-full border border-[#3d3830] bg-[#221f1a] px-2.5 py-1 text-[11px] font-medium text-brand-muted"
            style={{ borderWidth: '0.5px' }}
          >
            👤 Guest only
          </span>
        ) : (
          <VisibilitySelector
            lessonId={lessonId}
            visibility={lesson.visibility || 'private'}
          />
        )}
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {deleteConfirm ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-white">
              <span>Delete this lesson?</span>
              <button
                type="button"
                onClick={handleDeleteLesson}
                disabled={blocksEditing}
                className="rounded bg-red-700 px-2 py-1 text-white hover:bg-red-600 disabled:pointer-events-none disabled:opacity-40"
              >
                Yes, delete
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(false)}
                disabled={blocksEditing}
                className="rounded border border-brand-border px-2 py-1 text-brand-muted hover:text-white disabled:pointer-events-none disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                disabled={blocksEditing}
                className="rounded px-2 py-1.5 text-lg leading-none text-brand-muted hover:text-red-400 disabled:pointer-events-none disabled:opacity-40"
                aria-label="Delete lesson"
                title="Delete lesson"
              >
                🗑
              </button>
              <button
                type="button"
                onClick={persist}
                disabled={blocksEditing}
                className="rounded bg-brand-amber px-3 py-1.5 text-sm font-medium text-brand-bg disabled:pointer-events-none disabled:opacity-40"
              >
                {saved
                  ? lesson.persistLocallyOnly
                    ? 'Saved locally ✓'
                    : 'Saved ✓'
                  : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {!studyMode && lesson.referenceVideo && (
        <div className="flex items-center gap-2 border-b border-[#2e2b25] bg-[#2a2318] px-4 py-2">
          <img
            src={lesson.referenceVideo.thumbnail}
            alt=""
            className="h-7 w-10 rounded object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-white">
              {lesson.referenceVideo.title}
            </p>
            <p className="truncate text-xs text-brand-muted">
              {lesson.referenceVideo.channel}
            </p>
          </div>
        </div>
      )}

      {studyMode && lesson.referenceVideo && (
        <StudyVideoPanel
          videoId={lesson.referenceVideo.videoId}
          watchUrl={lesson.referenceVideo.watchUrl}
          playerContainerId={ytContainerId}
          playerRef={ytPlayerRef}
          onPlayStateChange={handlePlayStateChange}
          videoPlaying={videoPlaying}
        />
      )}

      {!studyMode && (
        <div className="border-b border-[#2e2b25] bg-[#1a1510]">
        <div className="px-4 pb-3 pt-8">
          <div
            ref={chordPaletteSectionRef}
            className={`rounded-xl px-1 py-1 transition-[box-shadow,background-color] duration-300 ${
              paletteHighlight
                ? 'bg-brand-amber/10 shadow-[0_0_0_2px_rgba(239,159,39,0.9)]'
                : 'shadow-[0_0_0_2px_transparent]'
            }`}
          >
          <p className="mb-2 text-[10px] font-normal uppercase tracking-[0.1em] text-[#6b6560]">
            CHORD PALETTE
          </p>
          <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto overflow-y-visible px-4 pb-3 pt-2">
            {chordPalette.map((name) => {
              const data = getChordData(name);
              return (
                <div
                  key={name}
                  className="group/pal relative flex w-[60px] shrink-0 flex-col items-center gap-[5px]"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeChordFromPalette(name);
                    }}
                    className="absolute -right-1 -top-1 z-10 flex h-[14px] w-[14px] items-center justify-center rounded-full border border-[#8a3a3a] bg-[#3a2020] opacity-0 transition-opacity duration-150 ease-in-out group-hover/pal:opacity-100"
                    style={{ borderWidth: '0.5px' }}
                    aria-label={`Remove ${name} from palette`}
                  >
                    <svg width="8" height="8" viewBox="0 0 24 24" aria-hidden>
                      <path
                        d="M18 6L6 18M6 6l12 12"
                        stroke="#cc6666"
                        strokeWidth="2.5"
                        fill="none"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => addToProgression(name)}
                    className="flex flex-col items-center gap-[5px]"
                  >
                    {data ? (
                      <ChordDiagram
                        name={data.name}
                        frets={data.frets}
                        fingers={data.fingers}
                        baseFret={data.baseFret}
                        barres={data.barres}
                        size="palette"
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center rounded-[10px] border border-dashed border-[#3d3830]"
                        style={{ width: 56, height: 78 }}
                      >
                        <span className="text-xs text-[#4d4840]">{name}</span>
                      </div>
                    )}
                    <span className="text-[11px] font-medium tracking-[0.02em] text-[#EF9F27]">
                      {name}
                    </span>
                  </button>
                </div>
              );
            })}
            <div className="relative shrink-0 self-start">
              <button
                ref={addChordAnchorRef}
                type="button"
                onClick={() => setShowChordPicker((v) => !v)}
                className="flex h-[82px] w-[60px] flex-col items-center justify-center rounded-[10px] border border-dashed border-[#3d3830] text-[#4d4840] transition-colors duration-150 ease-in-out hover:border-[#EF9F27] hover:text-[#EF9F27]"
                style={{ borderWidth: '1px' }}
              >
                + Add
              </button>
              <ChordPickerPopup
                open={showChordPicker}
                onClose={() => setShowChordPicker(false)}
                onSelectChord={addChordToPalette}
                paletteSet={chordPaletteSet}
                anchorRef={addChordAnchorRef}
              />
            </div>
          </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1">
            {progression.map((name, i) => (
              <span key={`${name}-${i}`} className="flex items-center gap-0.5">
                <span className="inline-flex items-center gap-0.5 rounded bg-brand-amber/20 px-2 py-0.5 text-sm text-brand-amber">
                  {name}
                  <button
                    type="button"
                    onClick={() => removeFromProgression(i)}
                    className="text-brand-muted hover:text-white"
                  >
                    ×
                  </button>
                </span>
                {i < progression.length - 1 && (
                  <span className="text-[10px] text-[#3a3630]">·</span>
                )}
              </span>
            ))}
          </div>

          {sequencePaletteMessage && (
            <p
              className="mt-3 text-center text-xs leading-snug text-brand-amber"
              role="alert"
            >
              {sequencePaletteMessage}
            </p>
          )}

          <SequenceBuilder
            sequences={sequences}
            paletteChords={chordPalette}
            editingSequenceId={editingSequenceId}
            onBeginEdit={handleBeginEditSequence}
            onCommitSequence={handleCommitSequence}
            onUpdateSequenceLabel={handleUpdateSequenceLabel}
            onDeleteSequence={handleDeleteSequence}
            onAddSequence={handleAddSequence}
          />

          <ApplySequenceBar
            sequences={sequences}
            selectedSequenceId={applySequenceId}
            onSelectSequence={setApplySequenceId}
            onApply={handleApplySequence}
            applyDisabled={applyDisabled}
            noLinesSelected={noLinesSelected}
          />
        </div>
        </div>
      )}

      <div
        className={`px-4 py-4 ${studyMode ? 'overflow-y-auto' : ''}`}
        style={
          studyMode
            ? { maxHeight: 'calc(100vh - 387px)' }
            : undefined
        }
      >
        {studyMode && showPauseHint && (
          <p
            className="text-[11px] text-[#888780]"
            style={{ padding: '8px 16px' }}
          >
            Video paused — tap any line to add chords
          </p>
        )}
        {sections.map((section, sectionIdx) => (
          <div key={sectionIdx} className="mb-6">
            <div className="mb-2 flex items-center gap-2">
              {blocksEditing ? (
                <p className="border-none bg-transparent text-xs font-medium uppercase tracking-wide text-brand-amber">
                  {section.label || 'Section'}
                </p>
              ) : (
                <input
                  type="text"
                  value={section.label}
                  onChange={(e) =>
                    updateSectionLabel(sectionIdx, e.target.value)
                  }
                  className="border-none bg-transparent text-xs font-medium uppercase tracking-wide text-brand-amber outline-none placeholder-brand-muted"
                  placeholder="Section"
                />
              )}
              {!blocksEditing && (
                <button
                  type="button"
                  onClick={() => addLineToSection(sectionIdx)}
                  className="text-lg text-brand-amber"
                >
                  +
                </button>
              )}
            </div>
            {(section.lines || []).map((line, lineIdx) => {
              const lid = makeLineId(sectionIdx, lineIdx);
              return (
                <LyricBlock
                  key={lid}
                  lineId={lid}
                  line={line}
                  chordPalette={chordPalette}
                  isSelected={selectedLineIds.has(lid)}
                  isEditing={editingLineId === lid}
                  onToggleSelect={handleToggleLineSelect}
                  onEditStart={handleEditStartLine}
                  onEditConfirm={handleEditConfirm}
                  onEditCancel={handleEditCancel}
                  onClearSlot={clearLineSlot}
                  readOnly={blocksEditing}
                />
              );
            })}
            <input
              type="text"
              placeholder="Practice note..."
              value={section.practiceNote || ''}
              onChange={(e) =>
                updateSectionPracticeNote(sectionIdx, e.target.value)
              }
              onBlur={() => persist()}
              readOnly={blocksEditing}
              className="mt-2 w-full rounded border border-brand-border bg-brand-surface px-2 py-1 text-sm text-brand-muted placeholder-brand-faint read-only:opacity-70 focus:outline-none focus:ring-1 focus:ring-brand-amber"
            />
            {sectionIdx < sections.length - 1 && (
              <div className="mt-4 border-t border-brand-amber/30" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
