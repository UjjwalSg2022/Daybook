import React, { useEffect, useRef, useState } from 'react';

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

// Ledger-themed audio player: a play/pause button, a filled progress rail
// with a stamp-red playhead, and a mono time readout. Replaces the native
// browser <audio controls> element, which looks completely out of place
// against the paper/ink design.
export default function AudioPlayer({ src, onPlay }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
      onPlay?.();
    }
  }

  function handleSeek(e) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  }

  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 border border-rule rounded-sm bg-paper/60 px-3 py-2">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />

      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? 'Pause' : 'Play'}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-ledger text-paper hover:bg-ledger-dark transition-colors"
      >
        {playing ? (
          <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
            <rect x="2" y="1" width="4" height="14" />
            <rect x="10" y="1" width="4" height="14" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
            <path d="M3 1.5v13l11-6.5z" />
          </svg>
        )}
      </button>

      <div
        onClick={handleSeek}
        className="relative flex-1 h-2 rounded-full bg-rule/50 cursor-pointer group"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-ledger/70"
          style={{ width: `${progressPct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-stamp border border-paper shadow-sm transition-[left]"
          style={{ left: `calc(${progressPct}% - 5px)` }}
        />
      </div>

      <span className="font-mono text-[11px] text-ink-soft tabular-nums flex-shrink-0">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
}