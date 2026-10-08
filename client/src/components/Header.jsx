import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';

export default function Header({ subtitle }) {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-rule bg-paper/95 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-5 sm:py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight leading-none">
            Daybook
          </h1>
          <p className="font-mono text-[11px] text-ink-soft tracking-widest uppercase mt-1.5">
            Mac International{subtitle ? ` — ${subtitle}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-end">
                    {user && (
            <>
              <span className="text-sm font-medium text-ink">{user.name}</span>
              <button
                onClick={logout}
                className="font-mono text-xs uppercase tracking-wide text-stamp border border-stamp/40 rounded-sm px-3 py-1.5 hover:bg-stamp/10 transition-colors"
              >
                Sign out
              </button>
              <NotificationBell />
            </>
          )}
        </div>
      </div>
    </header>
  );
}