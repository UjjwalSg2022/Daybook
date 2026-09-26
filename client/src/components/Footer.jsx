import React, { useEffect, useState } from 'react';

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function Footer() {
  const now = useClock();
  const timeStr = now.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <footer className="border-t border-rule mt-auto">
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-6 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2">
        <p className="font-mono text-[11px] text-ink-soft tracking-wide">
          Daybook — Internal work record
        </p>
        <p className="font-mono text-[11px] text-ink-soft tracking-wide tabular-nums">
          {timeStr}
        </p>
      </div>
    </footer>
  );
}