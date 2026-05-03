import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLessons } from '../hooks/useLessons';
import { mapRowToLesson } from '../utils/lessonMap';
import { formatRelative } from '../utils/time';
import { logActivity } from '../utils/logActivity';

function avatar(name, url) {
  if (url) return <img src={url} alt="" className="h-8 w-8 rounded-full object-cover" />;
  const label = (name || 'U').slice(0, 2).toUpperCase();
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#3a3125] text-xs text-brand-amber">
      {label}
    </span>
  );
}

function statusBadge(status = 'building') {
  const s = String(status).toLowerCase();
  if (s === 'learned') return 'Learned';
  if (s === 'practicing') return 'Practicing';
  return 'Building';
}

function FeedCard({ row, userId, onLikeToggle, onSave }) {
  const lesson = mapRowToLesson(row);
  const owner = row.profiles || {};
  const likesCount = row.likes_count || 0;
  const liked = Boolean(row.user_liked);

  return (
    <article className="rounded-xl border border-brand-border bg-brand-surface p-3">
      <div className="mb-2 flex items-center gap-2">
        {avatar(owner.display_name || owner.username, owner.avatar_url)}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-white">
            {owner.display_name || owner.username || 'Unknown'}
            {owner.username ? (
              <span className="ml-1 text-brand-muted">@{owner.username}</span>
            ) : null}
          </p>
          <p className="text-[11px] text-brand-muted">{formatRelative(row.updated_at)}</p>
        </div>
      </div>

      <h3 className="text-base font-semibold text-brand-amber">{lesson.songTitle || 'Untitled'}</h3>
      <p className="text-sm text-brand-muted">{lesson.artist || 'Unknown artist'}</p>

      <div className="mt-2 flex flex-wrap gap-1">
        {(lesson.chordPalette || []).slice(0, 4).map((c) => (
          <span key={c} className="rounded bg-brand-amber/20 px-1.5 py-0.5 text-xs text-brand-amber">
            {c}
          </span>
        ))}
        <span className="rounded border border-brand-border px-1.5 py-0.5 text-[11px] text-brand-muted">
          {statusBadge(lesson.status)}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onLikeToggle(row)}
          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${
            liked ? 'text-brand-amber' : 'text-brand-muted'
          }`}
        >
          <span aria-hidden>{liked ? '♥' : '♡'}</span>
          <span>{likesCount}</span>
        </button>
      </div>

      <div className="mt-2 flex gap-2">
        <Link
          to={`/lesson/${row.id}`}
          className="flex-1 rounded border border-brand-border px-2 py-1.5 text-center text-sm text-brand-amber hover:border-brand-amber"
        >
          View lesson
        </Link>
        <button
          type="button"
          disabled={row.user_id === userId}
          onClick={() => onSave(row)}
          className="flex-1 rounded bg-brand-amber px-2 py-1.5 text-sm font-medium text-brand-bg disabled:opacity-40"
        >
          Save to my diary
        </button>
      </div>
    </article>
  );
}

export default function FeedPage() {
  const { user } = useAuth();
  const { copyLessonToMyDiary } = useLessons();
  const [tab, setTab] = useState('following');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const fetchFeed = async () => {
      setLoading(true);
      if (tab === 'following') {
        const { data: followingIds } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        const ids = (followingIds || []).map((f) => f.following_id);
        if (ids.length === 0) {
          setRows([]);
          setLoading(false);
          return;
        }
        const { data } = await supabase
          .from('lessons')
          .select('*, profiles:user_id ( username, display_name, avatar_url )')
          .in('user_id', ids)
          .in('visibility', ['public', 'followers'])
          .order('updated_at', { ascending: false })
          .limit(20);
        setRows(data || []);
      } else {
        const { data } = await supabase
          .from('lessons')
          .select('*, profiles:user_id ( username, display_name, avatar_url )')
          .eq('visibility', 'public')
          .order('updated_at', { ascending: false })
          .limit(30);
        setRows(data || []);
      }
      setLoading(false);
    };
    fetchFeed();
  }, [tab, user?.id]);

  useEffect(() => {
    if (!user?.id || rows.length === 0) return;
    const loadCounts = async () => {
      const ids = rows.map((r) => r.id);
      const [{ data: likes }, { data: mine }] = await Promise.all([
        supabase.from('likes').select('lesson_id').in('lesson_id', ids),
        supabase
          .from('likes')
          .select('lesson_id')
          .eq('user_id', user.id)
          .in('lesson_id', ids),
      ]);
      const countBy = {};
      for (const l of likes || []) countBy[l.lesson_id] = (countBy[l.lesson_id] || 0) + 1;
      const mineSet = new Set((mine || []).map((m) => m.lesson_id));
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          likes_count: countBy[r.id] || 0,
          user_liked: mineSet.has(r.id),
        }))
      );
    };
    loadCounts();
  }, [rows.length, user?.id]);

  const onLikeToggle = async (row) => {
    if (!user?.id) return;
    const liked = Boolean(row.user_liked);
    if (liked) {
      await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('lesson_id', row.id);
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, user_liked: false, likes_count: Math.max(0, (r.likes_count || 1) - 1) }
            : r
        )
      );
      return;
    }

    await supabase.from('likes').insert({ user_id: user.id, lesson_id: row.id });
    await logActivity('lesson_liked', 'lesson', row.id);
    if (row.user_id !== user.id) {
      await supabase.from('notifications').insert({
        recipient_id: row.user_id,
        actor_id: user.id,
        type: 'like',
        lesson_id: row.id,
      });
    }
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, user_liked: true, likes_count: (r.likes_count || 0) + 1 }
          : r
      )
    );
  };

  const onSave = async (row) => {
    await copyLessonToMyDiary(row.id);
  };

  return (
    <div className="mx-auto max-w-[480px] px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold text-white">Feed</h1>
      <div className="mb-4 inline-flex rounded-lg border border-brand-border bg-brand-surface p-1">
        {['following', 'discover'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded px-3 py-1.5 text-sm ${
              tab === t ? 'bg-brand-amber text-brand-bg' : 'text-brand-muted'
            }`}
          >
            {t === 'following' ? 'Following' : 'Discover'}
          </button>
        ))}
      </div>

      {loading ? <p className="text-sm text-brand-muted">Loading feed…</p> : null}
      {!loading && rows.length === 0 ? (
        <p className="text-sm text-brand-muted">No shared lessons yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <FeedCard
              key={r.id}
              row={r}
              userId={user?.id}
              onLikeToggle={onLikeToggle}
              onSave={onSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
