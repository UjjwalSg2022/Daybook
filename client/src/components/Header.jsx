import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';
import logo from '../assets/logo.svg';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Still at it';
}

function DateStamp() {
  const dateStr = new Date()
    .toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();
  return (
    <div
      className="inline-flex items-center border-2 border-stamp/70 text-stamp rounded-sm px-2 py-0.5 sm:px-2.5 sm:py-1 -rotate-3 select-none flex-shrink-0"
      aria-hidden="true"
    >
      <span className="font-mono text-[9px] sm:text-[10px] font-bold tracking-widest whitespace-nowrap">
        {dateStr}
      </span>
    </div>
  );
}

export default function Header({ subtitle }) {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-rule bg-paper/95 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Every element here renders at every breakpoint now - nothing is
            hidden on mobile/tablet. flex-wrap lets items drop to their own
            line when there isn't room, instead of disappearing. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 min-w-0">
                    <img src={logo} alt="Daybook — MAC International" className="h-16 md:h-20 w-auto flex-shrink-0" />
          {subtitle && (
            <span className="font-mono text-xs text-ink-soft tracking-wide border-l border-rule pl-3">
              {subtitle}
            </span>
          )}
          <DateStamp />
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-end">
          {user && (
            <>
              <NotificationBell />
              <div className="text-sm font-medium text-ink">
                {getGreeting()}, {user.name.split(' ')[0]}
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