import { NavLink } from 'react-router-dom';

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-brand-surface border-t border-brand-border flex justify-around py-2 safe-area-pb">
      <NavLink
        to="/"
        className={({ isActive }) =>
          `flex flex-col items-center gap-0.5 py-2 px-6 rounded-lg transition-colors ${
            isActive ? 'text-brand-amber' : 'text-brand-muted hover:text-white'
          }`
        }
      >
        <span className="text-xl">🔍</span>
        <span className="text-xs font-medium">Search</span>
      </NavLink>
      <NavLink
        to="/diary"
        className={({ isActive }) =>
          `flex flex-col items-center gap-0.5 py-2 px-6 rounded-lg transition-colors ${
            isActive ? 'text-brand-amber' : 'text-brand-muted hover:text-white'
          }`
        }
      >
        <span className="text-xl">📖</span>
        <span className="text-xs font-medium">My Lessons</span>
      </NavLink>
    </nav>
  );
}
