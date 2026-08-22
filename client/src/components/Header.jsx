import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Header({ subtitle }) {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-rule bg-paper/95 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-ink">
            Daybook
          </h1>
          <p className="font-mono text-xs text-ink-soft tracking-wide mt-0.5">
            {subtitle || 'MAC International — work record'}
          </p>
        </div>
        {user && (
          <div className="flex items-center gap-4">
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
          </div>
        )}
      </div>
    </header>
  );
}
