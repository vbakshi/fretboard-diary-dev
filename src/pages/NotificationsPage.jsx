import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatRelative } from '../utils/time';

function actorLabel(n) {
  return n?.display_name || n?.username || 'Someone';
}

export default function NotificationsPage() {
  const { user, refreshUnread } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from('notifications')
        .select(
          `
          *,
          actor:actor_id (username, display_name, avatar_url),
          lesson:lesson_id (song_title)
        `
        )
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });
      setItems(data || []);
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('recipient_id', user.id)
        .eq('read', false);
      refreshUnread();
    };
    load();
  }, [user?.id, refreshUnread]);

  const message = (item) => {
    const actor = actorLabel(item.actor);
    const song = item.lesson?.song_title || 'your lesson';
    if (item.type === 'follow') return `${actor} started following you`;
    if (item.type === 'lesson_copy') return `${actor} saved your lesson ${song} to their diary`;
    return `${actor} liked your lesson ${song}`;
  };

  return (
    <div className="mx-auto max-w-[480px] px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold text-white">Notifications</h1>
      {items.length === 0 ? (
        <p className="text-sm text-brand-muted">No notifications yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-lg border border-brand-border px-3 py-2 ${
                item.read ? 'bg-brand-surface' : 'border-l-2 border-l-brand-amber bg-[#2a2210]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-white">{message(item)}</p>
                <span className="shrink-0 text-[11px] text-brand-muted">
                  {formatRelative(item.created_at)}
                </span>
              </div>
              {item.lesson_id && (
                <Link to={`/lesson/${item.lesson_id}`} className="mt-1 inline-block text-xs text-brand-amber">
                  View lesson
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
