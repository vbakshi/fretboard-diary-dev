import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { mapRowToLesson } from '../utils/lessonMap';
import { lineId as makeLineId } from '../utils/slots';
import LyricBlock from '../components/LyricBlock';
import { useAuth } from '../context/AuthContext';
import { logActivity } from '../utils/logActivity';

export default function SharedLessonPage() {
  const { lessonId } = useParams();
  const { user } = useAuth();
  const [lesson, setLesson] = useState(null);

  useEffect(() => {
    if (!lessonId) return;
    const load = async () => {
      const { data } = await supabase.from('lessons').select('*').eq('id', lessonId).maybeSingle();
      const mapped = mapRowToLesson(data);
      setLesson(mapped || null);
      if (mapped?.userId && user?.id && mapped.userId !== user.id) {
        await supabase.from('lesson_views').insert({
          lesson_id: mapped.id,
          viewer_id: user.id,
        });
        await logActivity('lesson_viewed', 'lesson', mapped.id);
      }
    };
    load();
  }, [lessonId, user?.id]);

  if (!lesson) {
    return (
      <div className="mx-auto max-w-[480px] px-4 py-6">
        <p className="text-sm text-brand-muted">Lesson not found or not shared.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[480px] px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-brand-amber">{lesson.songTitle || 'Untitled'}</h1>
          <p className="text-sm text-brand-muted">{lesson.artist || 'Unknown artist'}</p>
        </div>
        <Link to="/feed" className="text-sm text-brand-amber">
          Back to feed
        </Link>
      </div>

      {(lesson.sections || []).map((section, sectionIdx) => (
        <div key={sectionIdx} className="mb-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-brand-amber">
            {section.label || 'Section'}
          </p>
          {(section.lines || []).map((line, lineIdx) => {
            const lid = makeLineId(sectionIdx, lineIdx);
            return (
              <LyricBlock
                key={lid}
                lineId={lid}
                line={line}
                chordPalette={lesson.chordPalette || []}
                isSelected={false}
                isEditing={false}
                onToggleSelect={() => {}}
                onEditStart={() => {}}
                onEditConfirm={() => {}}
                onEditCancel={() => {}}
                onClearSlot={() => {}}
                readOnly
              />
            );
          })}
          {section.practiceNote ? (
            <p className="mt-2 text-sm text-brand-muted">{section.practiceNote}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
