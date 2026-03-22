import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { uuid } from '../utils/uuid';
import { migrateLesson, createEmptySlots } from '../utils/slots';

const STORAGE_KEY = 'fretboard_lessons';

const LessonsContext = createContext(null);

function loadLessons() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLessons(lessons) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lessons));
}

/**
 * Single source of truth for lessons (React state + localStorage).
 * Must wrap the app — otherwise each useLessons() call had its own isolated state
 * and the editor could not see lessons created on the search page.
 */
export function LessonsProvider({ children }) {
  const [lessons, setLessons] = useState([]);

  useEffect(() => {
    setLessons(loadLessons().map(migrateLesson));
  }, []);

  const persist = useCallback((next) => {
    setLessons((prev) => {
      const updated = typeof next === 'function' ? next(prev) : next;
      saveLessons(updated);
      return updated;
    });
  }, []);

  const createLesson = useCallback(
    (data) => {
      const now = new Date().toISOString();
      const lesson = {
        id: uuid(),
        songTitle: data.songTitle ?? '',
        artist: data.artist ?? '',
        createdAt: now,
        updatedAt: now,
        referenceVideo: data.referenceVideo ?? null,
        chordPalette: data.chordPalette ?? [],
        progression: data.progression ?? [],
        sections:
          data.sections ?? [
            {
              label: 'Lyrics',
              lines: [{ text: '', slots: createEmptySlots() }],
              practiceNote: '',
            },
          ],
        sequences: data.sequences ?? [],
      };
      persist((prev) => [...prev, lesson]);
      return lesson;
    },
    [persist]
  );

  const updateLesson = useCallback(
    (id, updates) => {
      persist((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l
        )
      );
    },
    [persist]
  );

  const deleteLesson = useCallback(
    (id) => {
      persist((prev) => prev.filter((l) => l.id !== id));
    },
    [persist]
  );

  const getLesson = useCallback(
    (id) => lessons.find((l) => l.id === id),
    [lessons]
  );

  const value = useMemo(
    () => ({
      lessons,
      createLesson,
      updateLesson,
      deleteLesson,
      getLesson,
    }),
    [lessons, createLesson, updateLesson, deleteLesson, getLesson]
  );

  return (
    <LessonsContext.Provider value={value}>{children}</LessonsContext.Provider>
  );
}

export function useLessons() {
  const ctx = useContext(LessonsContext);
  if (!ctx) {
    throw new Error('useLessons must be used within a LessonsProvider');
  }
  return ctx;
}
