import React, { useRef, useState } from 'react';
import api from '../api/client';
import AudioPlayer from './AudioPlayer.jsx';

// Picks the first audio mime type the browser actually supports for
// MediaRecorder - support varies (webm/opus is widest, Safari needs mp4).
function pickSupportedMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg',
  ];
  for (const type of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

export default function VoiceRecorder({ recipientId, onSent }) {
  const [status, setStatus] = useState('idle'); // idle | recording | recorded | sending
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const blobRef = useRef(null);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  async function startRecording() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        blobRef.current = blob;
        setAudioUrl(URL.createObjectURL(blob));
        setStatus('recorded');
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus('recording');
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      setError('Could not access microphone. Check your browser permissions.');
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }

  function discard() {
    setAudioUrl(null);
    blobRef.current = null;
    setStatus('idle');
    setSeconds(0);
    setError('');
  }

  async function send() {
    if (!blobRef.current) return;
    setStatus('sending');
    setError('');
    try {
      const formData = new FormData();
      formData.append('audio', blobRef.current, 'voice-message');
      formData.append('recipientId', recipientId);
      formData.append('durationSeconds', String(seconds));

      await api.post('/voice-messages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      discard();
      onSent?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send voice message');
      setStatus('recorded');
    }
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="border border-rule rounded-sm p-3 bg-white/40 space-y-2">
      {status === 'idle' && (
        <button
          type="button"
          onClick={startRecording}
          className="w-full flex items-center justify-center gap-2 border border-stamp/40 text-stamp rounded-sm py-2 text-sm font-medium hover:bg-stamp/10 transition-colors"
        >
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-stamp" />
          Record voice message
        </button>
      )}

      {status === 'recording' && (
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm text-stamp flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-stamp animate-pulse" />
            Recording {mm}:{ss}
          </span>
          <button
            type="button"
            onClick={stopRecording}
            className="font-mono text-xs uppercase tracking-wide border border-rule rounded-sm px-3 py-1.5 hover:bg-paper-dark transition-colors"
          >
            Stop
          </button>
        </div>
      )}

      {status === 'recorded' && (
        <div className="space-y-2">
          <AudioPlayer src={audioUrl} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={discard}
              className="flex-1 border border-rule rounded-sm py-1.5 text-sm text-ink-soft hover:bg-paper-dark transition-colors"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={send}
              className="flex-1 bg-ledger text-paper rounded-sm py-1.5 text-sm font-medium hover:bg-ledger-dark transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {status === 'sending' && (
        <p className="text-center font-mono text-sm text-ink-soft py-1.5">Sending…</p>
      )}

      {error && (
        <p className="text-stamp text-xs font-mono bg-stamp/5 border border-stamp/30 rounded-sm px-2.5 py-1.5">
          {error}
        </p>
      )}
    </div>
  );
}
