import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function BottomNav() {
  const { user, profile, unreadCount } = useAuth();
  const profileHref = profile?.username
    ? `/profile/${profile.username}`
    : '/profile/me';

  const tabClass = ({ isActive }) =>
    `relative flex flex-col items-center gap-0.5 py-2 px-4 rounded-lg transition-colors ${
      isActive ? 'text-brand-amber' : 'text-brand-muted hover:text-white'
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-brand-surface border-t border-brand-border flex justify-around py-2 safe-area-pb">
      <NavLink to="/" className={tabClass}>
        <span className="text-xl">🔍</span>
        <span className="text-xs font-medium">Search</span>
      </NavLink>
      <NavLink to={user ? '/diary' : '/auth'} state={user ? undefined : { from: '/diary' }} className={tabClass}>
        <span className="text-xl">📖</span>
        <span className="text-xs font-medium">My Diary</span>
      </NavLink>
      <NavLink to={user ? '/feed' : '/auth'} state={user ? undefined : { from: '/feed' }} className={tabClass}>
        <span className="text-xl">🌐</span>
        <span className="text-xs font-medium">Feed</span>
      </NavLink>
      <NavLink
        to={user ? profileHref : '/auth'}
        state={user ? undefined : { from: '/profile/me' }}
        className={tabClass}
      >
        <span className="text-xl">👤</span>
        <span className="text-xs font-medium">Profile</span>
        {user && unreadCount > 0 && (
          <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-amber px-1 text-[10px] font-semibold text-[#1a1510]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </NavLink>
    </nav>
  );
}
