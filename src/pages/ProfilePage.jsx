import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { mapRowToLesson } from '../utils/lessonMap';
import { logActivity } from '../utils/logActivity';

function Avatar({ profile }) {
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />;
  }
  const initials = (profile?.display_name || profile?.username || 'U')
    .split(' ')
    .map((x) => x[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#3a3125] text-lg text-brand-amber">
      {initials}
    </span>
  );
}

export default function ProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [bio, setBio] = useState('');
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [listMode, setListMode] = useState(null);
  const [listUsers, setListUsers] = useState([]);

  const isOwn = Boolean(user?.id && profile?.id && user.id === profile.id);

  useEffect(() => {
    const load = async () => {
      let p = null;
      if (username === 'me') {
        if (!user?.id) {
          setProfile(null);
          setLessons([]);
          return;
        }
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        p = data || null;
      } else {
        if (!username) return;
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .maybeSingle();
        p = data || null;
      }
      setProfile(p || null);
      setBio(p?.bio || '');
      if (!p?.id) return;
      const { data: ls } = await supabase
        .from('lessons')
        .select('*')
        .eq('user_id', p.id)
        .order('updated_at', { ascending: false });
      setLessons((ls || []).map(mapRowToLesson));

      const [{ count: c1 }, { count: c2 }, { data: f }] = await Promise.all([
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', p.id),
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', p.id),
        user?.id
          ? supabase
              .from('follows')
              .select('*')
              .eq('follower_id', user.id)
              .eq('following_id', p.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setFollowers(c1 || 0);
      setFollowing(c2 || 0);
      setIsFollowing(Boolean(f));
    };
    load();
  }, [username, user?.id]);

  const visibilityIcon = (v) => {
    if (v === 'public') return '🌐';
    if (v === 'followers') return '👥';
    return '🔒';
  };

  const loadList = async (mode) => {
    if (!profile?.id) return;
    setListMode(mode);
    if (mode === 'followers') {
      const { data } = await supabase
        .from('follows')
        .select('follower_id, profiles!follows_follower_id_fkey(username, display_name, avatar_url)')
        .eq('following_id', profile.id);
      setListUsers((data || []).map((x) => x.profiles).filter(Boolean));
    } else {
      const { data } = await supabase
        .from('follows')
        .select('following_id, profiles!follows_following_id_fkey(username, display_name, avatar_url)')
        .eq('follower_id', profile.id);
      setListUsers((data || []).map((x) => x.profiles).filter(Boolean));
    }
  };

  const onFollowToggle = async () => {
    if (!user?.id || !profile?.id || user.id === profile.id) return;
    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', profile.id);
      setIsFollowing(false);
      setFollowers((n) => Math.max(0, n - 1));
      return;
    }
    await supabase.from('follows').insert({
      follower_id: user.id,
      following_id: profile.id,
    });
    await supabase.from('notifications').insert({
      recipient_id: profile.id,
      actor_id: user.id,
      type: 'follow',
    });
    await logActivity('user_followed', 'profile', profile.id);
    setIsFollowing(true);
    setFollowers((n) => n + 1);
  };

  const saveBio = async () => {
    if (!isOwn) return;
    await supabase.from('profiles').update({ bio }).eq('id', profile.id);
  };

  if (username === 'me' && authLoading) {
    return (
      <div className="mx-auto max-w-[480px] px-4 py-8">
        <p className="text-sm text-brand-muted">Loading profile…</p>
      </div>
    );
  }

  if (username === 'me' && !user) {
    return <Navigate to="/auth" replace state={{ from: '/profile/me' }} />;
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-[480px] px-4 py-8">
        <p className="text-sm text-brand-muted">Profile not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[480px] px-4 py-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar profile={profile} />
          <div>
            <h1 className="text-xl font-semibold text-white">
              {profile.display_name || profile.username}
            </h1>
            <p className="text-sm text-brand-muted">@{profile.username}</p>
          </div>
        </div>
        {isOwn && (
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
            className="rounded border border-brand-border px-2.5 py-1 text-xs text-brand-muted hover:text-white"
          >
            Sign out
          </button>
        )}
      </div>

      {isOwn ? (
        <div className="mb-4">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            onBlur={saveBio}
            rows={2}
            className="w-full rounded border border-brand-border bg-brand-surface px-2 py-1 text-sm text-white"
            placeholder="Write a short bio"
          />
        </div>
      ) : (
        <p className="mb-4 text-sm text-brand-muted">{profile.bio || 'No bio yet.'}</p>
      )}

      <div className="mb-4 flex items-center gap-4 text-sm">
        <button type="button" onClick={() => loadList('followers')} className="text-brand-muted">
          <span className="font-semibold text-white">{followers}</span> Followers
        </button>
        <button type="button" onClick={() => loadList('following')} className="text-brand-muted">
          <span className="font-semibold text-white">{following}</span> Following
        </button>
      </div>

      {!isOwn && (
        <button
          type="button"
          onClick={onFollowToggle}
          className={`mb-5 rounded px-3 py-2 text-sm ${
            isFollowing
              ? 'bg-brand-amber text-brand-bg'
              : 'border border-brand-amber text-brand-amber'
          }`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      )}

      <h2 className="mb-2 text-lg font-semibold text-white">Lessons</h2>
      {lessons.length === 0 ? (
        <p className="text-sm text-brand-muted">No lessons yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {lessons.map((l) => (
            <Link
              key={l.id}
              to={isOwn ? `/editor/${l.id}` : `/lesson/${l.id}`}
              className="rounded-lg border border-brand-border bg-brand-surface p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-brand-amber">{l.songTitle || 'Untitled'}</p>
                  <p className="truncate text-sm text-brand-muted">{l.artist || 'Unknown artist'}</p>
                </div>
                {isOwn && (
                  <span className="text-sm text-brand-muted">
                    {visibilityIcon(l.visibility)} {l.visibility}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {listMode && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => setListMode(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-brand-border bg-brand-bg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-base font-semibold text-white">
              {listMode === 'followers' ? 'Followers' : 'Following'}
            </h3>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {listUsers.map((u) => (
                <Link
                  key={u.username}
                  to={`/profile/${u.username}`}
                  className="block rounded border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-muted"
                  onClick={() => setListMode(null)}
                >
                  {u.display_name || u.username}{' '}
                  <span className="text-[#6b6560]">@{u.username}</span>
                </Link>
              ))}
              {listUsers.length === 0 && (
                <p className="text-sm text-brand-muted">No users to show.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
