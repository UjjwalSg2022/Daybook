import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';
import logo from '../assets/logo.svg';

export default function Header({ subtitle }) {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-rule bg-paper/95 backdrop-blur-sm sticky top-0 z-10">
            <div className="max-w-5xl mx-auto px-6 md:px-10 py-2 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4 flex-shrink-0 min-w-0">
          <img src={logo} alt="Daybook — MAC International" className="h-20 w-auto flex-shrink-0" />
          {subtitle && (
            <span className="font-mono text-xs text-ink-soft tracking-wide hidden sm:block border-l border-rule pl-4 truncate">
              {subtitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {user && (
            <>
              <NotificationBell />
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-ink">{user.name}</div>
                <div className="font-mono text-[11px] text-ink-soft uppercase tracking-wide">
                  {user.role}
                </div>
              </div>
              <button
                onClick={logout}
                className="font-mono text-xs uppercase tracking-wide text-stamp border border-stamp/40 rounded-sm px-3 py-1.5 hover:bg-stamp/10 transition-colors"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}