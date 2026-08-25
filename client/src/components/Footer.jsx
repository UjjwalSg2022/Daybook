import React from 'react';

// Decorative only - these don't route anywhere.
const FOOTER_LINKS = ['Privacy', 'Terms', 'Support'];

export default function Footer() {
  return (
    <footer className="border-t border-rule mt-auto">
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="font-mono text-[11px] text-ink-soft tracking-wide">
          Daybook — MAC International · Internal work record
        </p>
        <div className="flex items-center gap-5">
          {FOOTER_LINKS.map((label) => (
            <span
              key={label}
              className="font-mono text-[11px] uppercase tracking-wide text-ink-soft hover:text-ledger transition-colors cursor-default"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}