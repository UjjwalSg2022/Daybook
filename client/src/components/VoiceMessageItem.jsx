import React, { useEffect, useState } from 'react';
import api from '../api/client';
import AudioPlayer from './AudioPlayer.jsx';

export default function VoiceMessageItem({ message, showRecipient, showListenedStatus }) {
  const [listened, setListened] = useState(!!message.listenedAt);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let objectUrl;
    let cancelled = false;

    api
      .get(`/voice-messages/${message._id}/audio`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setAudioUrl(objectUrl);
      })
      .catch(() => setLoadError(true));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [message._id]);

  async function handlePlay() {
    if (listened) return;
    setListened(true);
    try {
      await api.patch(`/voice-messages/${message._id}/listened`);
    } catch {
      // Non-critical - if this fails the message just stays unmarked
    }
  }

  const person = showRecipient ? message.recipientId : message.senderId;

  return (
    <li className="border border-rule rounded-sm p-3 bg-white/40">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-ink">
          {person?.name || (showRecipient ? 'Unknown recipient' : 'Unknown sender')}
        </span>
        <span className="font-mono text-[11px] text-ink-soft">
          {new Date(message.createdAt).toLocaleString()}
        </span>
      </div>

      {loadError ? (
        <p className="font-mono text-xs text-stamp">Could not load audio</p>
      ) : audioUrl ? (
        <AudioPlayer src={audioUrl} onPlay={handlePlay} />
      ) : (
        <p className="font-mono text-xs text-ink-soft">Loading audio…</p>
      )}

      {showListenedStatus && (
        <p className="font-mono text-[11px] text-ink-soft mt-1.5">
          {message.listenedAt
            ? `Listened ${new Date(message.listenedAt).toLocaleString()}`
            : 'Not yet listened'}
        </p>
      )}
    </li>
  );
}