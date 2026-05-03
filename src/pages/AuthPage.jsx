import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase, hasSupabaseEnv } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import FullScreenSpinner from '../components/FullScreenSpinner';
import { getOAuthErrorFromLocation, isAuthHttpDebugEnabled } from '../utils/authDebug';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden className="shrink-0">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

const signInWith = async (provider) => {
  if (!hasSupabaseEnv || !supabase) return;
  // Must match an entry in Supabase → Authentication → URL Configuration → Redirect URLs
  // exactly (trailing slash often differs; use origin only = http://localhost:5173).
  const redirectTo = window.location.origin;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: false,
    },
  });
  if (isAuthHttpDebugEnabled()) {
    console.warn('[Fretboard Diary auth] signInWithOAuth', {
      provider,
      redirectTo,
      data,
      error,
    });
    if (error) {
      console.warn('[Fretboard Diary auth] signInWithOAuth failed', {
        message: error.message,
        status: error.status,
        name: error.name,
        raw: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
    }
  }
};

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const from = location.state?.from;
  const [urlAuthError, setUrlAuthError] = useState(() => getOAuthErrorFromLocation());

  useEffect(() => {
    setUrlAuthError(getOAuthErrorFromLocation());
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    const dest = from && from !== '/auth' ? from : '/';
    navigate(dest, { replace: true });
  }, [loading, user, from, navigate]);

  if (!loading && user) {
    return <FullScreenSpinner />;
  }

  const queuePostAuthRedirectAndSignIn = (provider) => {
    const target = typeof from === 'string' && from.startsWith('/') ? from : '/';
    sessionStorage.setItem('postAuthRedirect', target);
    signInWith(provider);
  };

  return (
    <div
      className="flex min-h-[100svh] flex-col items-center justify-center px-4 py-8"
      style={{ background: '#1a1510' }}
    >
      <Link
        to="/"
        className="mb-6 text-sm text-brand-muted hover:text-brand-amber"
      >
        ← Back to Fretboard Diary
      </Link>
      <div
        className="w-full max-w-[360px] rounded-2xl px-6 py-8"
        style={{
          background: '#2a2318',
          border: '0.5px solid #3d3426',
          borderRadius: 16,
          padding: '32px 24px',
        }}
      >
        <h1
          className="mb-1.5 text-center font-medium"
          style={{ fontSize: 24, color: '#EF9F27', marginBottom: 6 }}
        >
          Fretboard Diary
        </h1>
        <p
          className="mb-8 text-center"
          style={{ fontSize: 13, color: '#6b6560', marginBottom: 32 }}
        >
          Your personal guitar learning journal
        </p>
        {urlAuthError && (
          <p className="mb-3 rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-left text-[11px] text-red-200">
            <span className="font-semibold text-red-100">Sign-in error: </span>
            {urlAuthError}
          </p>
        )}

        {!hasSupabaseEnv && (
          <p className="mb-3 rounded border border-brand-border bg-brand-bg/40 px-3 py-2 text-center text-[11px] text-brand-muted">
            Add Supabase URL + anon/publishable key to `.env.local` (e.g.{' '}
            <code className="text-brand-amber">VITE_SUPABASE_URL</code> /{' '}
            <code className="text-brand-amber">VITE_SUPABASE_ANON_KEY</code>, or{' '}
            <code className="text-brand-amber">NEXT_PUBLIC_SUPABASE_URL</code> /{' '}
            <code className="text-brand-amber">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>
            ), then restart the dev server.
          </p>
        )}

        <button
          type="button"
          onClick={() => queuePostAuthRedirectAndSignIn('google')}
          disabled={!hasSupabaseEnv}
          className="flex w-full items-center justify-center gap-3 rounded-[10px] bg-white py-3 text-[#1a1510]"
          style={{ padding: 12 }}
        >
          <GoogleIcon />
          <span className="text-sm font-medium">Continue with Google</span>
        </button>

        <button
          type="button"
          onClick={() => queuePostAuthRedirectAndSignIn('github')}
          disabled={!hasSupabaseEnv}
          className="mt-2.5 flex w-full items-center justify-center gap-3 rounded-[10px] py-3 text-white"
          style={{ background: '#24292e', padding: 12, marginTop: 10 }}
        >
          <GitHubIcon />
          <span className="text-sm font-medium">Continue with GitHub</span>
        </button>

        <p
          className="mt-6 text-center"
          style={{ fontSize: 11, color: '#4d4840', marginTop: 24 }}
        >
          By continuing you agree to our terms
        </p>
      </div>
    </div>
  );
}
