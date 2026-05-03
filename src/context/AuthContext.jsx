import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase, hasSupabaseEnv } from '../lib/supabase';
import { logOAuthReturnErrorsToConsole } from '../utils/authDebug';
import { buildProfileRowFromAuthUser } from '../utils/bootstrapProfile';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchProfile = useCallback(async (authUser) => {
    if (!hasSupabaseEnv || !supabase) {
      setProfile(null);
      setLoading(false);
      return;
    }
    if (!authUser?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();
    if (error) {
      console.warn('[Fretboard Diary auth] profile fetch', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setProfile(null);
      setLoading(false);
      return;
    }
    if (data) {
      setProfile(data);
      setLoading(false);
      return;
    }

    const row = buildProfileRowFromAuthUser(authUser);
    if (!row) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { error: insertError } = await supabase.from('profiles').insert(row);
    if (insertError) {
      if (insertError.code === '23505') {
        const { data: retry } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();
        setProfile(retry || null);
      } else {
        console.warn('[Fretboard Diary auth] profile bootstrap insert', {
          message: insertError.message,
          code: insertError.code,
        });
        setProfile(null);
      }
      setLoading(false);
      return;
    }
    const { data: created } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();
    setProfile(created || row);
    setLoading(false);
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!hasSupabaseEnv || !supabase) {
      setUnreadCount(0);
      return;
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      console.warn('[Fretboard Diary auth] getUser (unread):', userErr.message, userErr);
    }
    const u = userData?.user;
    if (!u?.id) {
      setUnreadCount(0);
      return;
    }
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', u.id)
      .eq('read', false);
    if (error) {
      console.warn('[Fretboard Diary auth] unread count', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return;
    }
    setUnreadCount(count ?? 0);
  }, []);

  useEffect(() => {
    if (!hasSupabaseEnv || !supabase) {
      setLoading(false);
      setUser(null);
      setProfile(null);
      setUnreadCount(0);
      return undefined;
    }
    logOAuthReturnErrorsToConsole();

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn('[Fretboard Diary auth] getSession', {
          message: error.message,
          status: error.status,
          name: error.name,
        });
      }
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setProfile(null);
        setUnreadCount(0);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  useEffect(() => {
    if (!user?.id) return undefined;
    refreshUnread();
    const id = window.setInterval(refreshUnread, 45_000);
    return () => window.clearInterval(id);
  }, [user?.id, refreshUnread]);

  const signOut = async () => {
    if (!hasSupabaseEnv || !supabase) {
      setUser(null);
      setProfile(null);
      setUnreadCount(0);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setUnreadCount(0);
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      signOut,
      unreadCount,
      refreshUnread,
    }),
    [user, profile, loading, unreadCount, refreshUnread]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
