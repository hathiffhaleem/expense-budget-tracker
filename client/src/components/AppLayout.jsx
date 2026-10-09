import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';

const links = [
  { to: '/', label: 'Overview', end: true },
  { to: '/transactions', label: 'Transactions' },
  { to: '/budgets', label: 'Budgets' }
];

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    toast.success('You are logged out');
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {menuOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/40 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-950 px-5 py-6 text-white transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <NavLink to="/" className="mb-10 flex items-center gap-3" onClick={() => setMenuOpen(false)}>
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-400 font-bold text-slate-950">E</span>
          <span className="font-semibold">Expense Tracker</span>
        </NavLink>

        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Workspace</p>
        <nav className="space-y-1">
          {links.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `block rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-emerald-400 text-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-slate-800 pt-5">
          <p className="truncate px-3 text-sm font-medium">{user?.name}</p>
          <p className="mb-4 truncate px-3 pt-1 text-xs text-slate-400">{user?.email}</p>
          <button onClick={handleLogout} className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 hover:text-white">
            Log out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:hidden">
          <button aria-label="Open navigation" onClick={() => setMenuOpen(true)} className="rounded-lg p-2 text-slate-700 hover:bg-slate-100">
            ☰
          </button>
          <span className="font-semibold">Expense Tracker</span>
        </header>
        <main className="mx-auto w-full max-w-7xl p-5 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
