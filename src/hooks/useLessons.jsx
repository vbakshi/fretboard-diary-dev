import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { migrateLesson } from '../utils/slots';
import { logActivity } from '../utils/logActivity';
import { mapRowToLesson, lessonToDbInsert, lessonToDbUpdate } from '../utils/lessonMap';

const LessonsContext = createContext(null);

export function LessonsProvider({ children }) {
  const { user } = useAuth();
  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(true);
  const lessonsRef = useRef([]);
  useEffect(() => {
    lessonsRef.current = lessons;
  }, [lessons]);

  const refreshLessons = useCallback(async () => {
    if (!user?.id) {
      setLessons([]);
      setLessonsLoading(false);
      return;
    }
    setLessonsLoading(true);
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (error) {
      console.error('[lessons] fetch', error);
      setLessons([]);
    } else {
      setLessons((data || []).map((row) => migrateLesson(mapRowToLesson(row))));
    }
    setLessonsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    refreshLessons();
  }, [refreshLessons]);

  const createLesson = useCallback(
    async (data) => {
      if (!user?.id) throw new Error('Not signed in');
      const insertRow = lessonToDbInsert(data, user.id);
      const { data: created, error } = await supabase
        .from('lessons')
        .insert(insertRow)
        .select()
        .single();
      if (error) {
        console.error('[lessons] create', error);
        throw error;
      }
      const lesson = migrateLesson(mapRowToLesson(created));
      void logActivity('lesson_created', 'lesson', lesson.id).catch((err) =>
        console.warn('[lessons] logActivity failed', err)
      );
      setLessons((prev) => [lesson, ...prev.filter((l) => l.id !== lesson.id)]);
      return lesson;
    },
    [user?.id]
  );

  const registerGuestLesson = useCallback((draft) => {
    const lesson = migrateLesson({
      ...draft,
      persistLocallyOnly: true,
    });
    setLessons((prev) => [lesson, ...prev.filter((l) => l.id !== lesson.id)]);
    return lesson;
  }, []);

  const updateLesson = useCallback(
    async (id, updates) => {
      const cur = lessonsRef.current.find((l) => l.id === id);
      if (cur?.persistLocallyOnly) {
        setLessons((prev) =>
          prev.map((l) =>
            l.id === id
              ? migrateLesson({
                  ...l,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                })
              : l
          )
        );
        return;
      }
      if (!user?.id) return;
      const patch = lessonToDbUpdate(updates);
      if (Object.keys(patch).length === 0) return;
      const { error } = await supabase
        .from('lessons')
        .update(patch)
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) {
        console.error('[lessons] update', error);
        return;
      }
      setLessons((prev) =>
        prev.map((l) =>
          l.id === id
            ? migrateLesson({
                ...l,
                ...updates,
                updatedAt: new Date().toISOString(),
              })
            : l
        )
      );
    },
    [user?.id]
  );

  const updateVisibility = useCallback(
    async (id, visibility) => {
      if (!user?.id) return;
      const { error } = await supabase
        .from('lessons')
        .update({ visibility })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) {
        console.error('[lessons] visibility', error);
        return;
      }
      if (visibility !== 'private') {
        await logActivity('lesson_published', 'lesson', id, { visibility });
      }
      setLessons((prev) =>
        prev.map((l) => (l.id === id ? { ...l, visibility } : l))
      );
    },
    [user?.id]
  );

  const deleteLesson = useCallback(
    async (id) => {
      const cur = lessonsRef.current.find((l) => l.id === id);
      if (cur?.persistLocallyOnly) {
        setLessons((prev) => prev.filter((l) => l.id !== id));
        return;
      }
      if (!user?.id) return;
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) {
        console.error('[lessons] delete', error);
        return;
      }
      setLessons((prev) => prev.filter((l) => l.id !== id));
    },
    [user?.id]
  );

  const deleteLessons = useCallback(
    async (ids) => {
      if (!user?.id || !ids?.length) return;
      const { error } = await supabase
        .from('lessons')
        .delete()
        .in('id', ids)
        .eq('user_id', user.id);
      if (error) {
        console.error('[lessons] bulk delete', error);
        return;
      }
      const idSet = new Set(ids);
      setLessons((prev) => prev.filter((l) => !idSet.has(l.id)));
    },
    [user?.id]
  );

  const copyLessonToMyDiary = useCallback(
    async (sourceLessonId) => {
      if (!user?.id) throw new Error('Not signed in');
      const { data: src, error: fetchErr } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', sourceLessonId)
        .single();
      if (fetchErr || !src) {
        console.error('[lessons] copy fetch', fetchErr);
        throw fetchErr || new Error('Lesson not found');
      }
      const insertRow = {
        user_id: user.id,
        song_title: src.song_title,
        artist: src.artist,
        visibility: 'private',
        reference_video: src.reference_video,
        chord_palette: src.chord_palette ?? [],
        progression: src.progression ?? [],
        sequences: src.sequences ?? [],
        sections: src.sections ?? [],
        status: src.status ?? 'building',
      };
      const { data: created, error } = await supabase
        .from('lessons')
        .insert(insertRow)
        .select()
        .single();
      if (error) {
        console.error('[lessons] copy insert', error);
        throw error;
      }
      const lesson = migrateLesson(mapRowToLesson(created));
      await logActivity('lesson_copied', 'lesson', sourceLessonId, {
        copy_id: lesson.id,
      });
      if (src.user_id && src.user_id !== user.id) {
        await supabase.from('notifications').insert({
          recipient_id: src.user_id,
          actor_id: user.id,
          type: 'lesson_copy',
          lesson_id: sourceLessonId,
        });
      }
      setLessons((prev) => [lesson, ...prev]);
      return lesson;
    },
    [user?.id]
  );

  const getLesson = useCallback(
    (id) => lessons.find((l) => l.id === id),
    [lessons]
  );

  const value = useMemo(
    () => ({
      lessons,
      lessonsLoading,
      refreshLessons,
      createLesson,
      registerGuestLesson,
      updateLesson,
      updateVisibility,
      deleteLesson,
      deleteLessons,
      getLesson,
      copyLessonToMyDiary,
    }),
    [
      lessons,
      lessonsLoading,
      refreshLessons,
      createLesson,
      registerGuestLesson,
      updateLesson,
      updateVisibility,
      deleteLesson,
      deleteLessons,
      getLesson,
      copyLessonToMyDiary,
    ]
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
