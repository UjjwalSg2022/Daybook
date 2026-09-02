import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import VoiceMessageItem from '../components/VoiceMessageItem.jsx';
import api from '../api/client';
import { isOverdue } from '../utils/dueDate.js';

function StatChip({ label, value, accent }) {
  return (
    <div className="border border-rule rounded-sm px-4 py-3">
      <div className={`font-display text-2xl font-semibold ${accent}`}>{value}</div>
      <div className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mt-0.5">
        {label}
      </div>
    </div>
  );
}

export default function EmployeeDashboard() {
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [voiceMessages, setVoiceMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [noteTaskId, setNoteTaskId] = useState('');
  const [posting, setPosting] = useState(false);

  async function load() {
    setLoading(true);
    const [tasksRes, notesRes, voiceRes] = await Promise.all([
      api.get('/tasks'),
      api.get('/notes'),
      api.get('/voice-messages'),
    ]);
    setTasks(tasksRes.data.tasks);
    setNotes(notesRes.data.notes);
    setVoiceMessages(voiceRes.data.messages);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(taskId, status) {
    await api.patch(`/tasks/${taskId}/status`, { status });
    load();
  }

  async function submitNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setPosting(true);
    try {
      await api.post('/notes', {
        text: noteText.trim(),
        linkedTaskId: noteTaskId || null,
      });
      setNoteText('');
      setNoteTaskId('');
      load();
    } finally {
      setPosting(false);
    }
  }

  const counts = {
    pending: tasks.filter((t) => t.status === 'pending').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
  };
  const overdueCount = tasks.filter(isOverdue).length;
  const unheardCount = voiceMessages.filter((m) => !m.listenedAt).length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header subtitle="Your daily record" />
      <main className="max-w-5xl mx-auto px-6 md:px-10 py-8 ledger-page flex-1 w-full">
        {/* Stats strip - CSS grid with auto-fit so chips stretch evenly to
            fill each row instead of leaving a gap on an uneven last row */}
        <div
          className="grid gap-3 mb-8"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}
        >
          <StatChip label="Pending" value={counts.pending} accent="text-ink-soft" />
          <StatChip label="In progress" value={counts.in_progress} accent="text-gold" />
          <StatChip label="Done" value={counts.done} accent="text-ledger" />
          <StatChip label="Total" value={tasks.length} accent="text-ink" />
          {overdueCount > 0 && (
            <StatChip label="Overdue" value={overdueCount} accent="text-stamp" />
          )}
          {voiceMessages.length > 0 && (
            <StatChip
              label="Voice inbox"
              value={unheardCount > 0 ? `${unheardCount} new` : voiceMessages.length}
              accent={unheardCount > 0 ? 'text-stamp' : 'text-ink-soft'}
            />
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Task list */}
          <section className="md:col-span-2">
            <h2 className="font-display text-lg font-semibold text-ink mb-4">
              Your tasks
            </h2>
            {loading ? (
              <p className="font-mono text-sm text-ink-soft">Loading…</p>
            ) : tasks.length === 0 ? (
              <p className="font-mono text-sm text-ink-soft border border-dashed border-rule rounded-sm p-6 text-center">
                No tasks assigned yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {tasks.map((task) => (
                  <li
                    key={task._id}
                    className={`border rounded-sm p-4 transition-colors ${
                      isOverdue(task)
                        ? 'border-stamp/50 bg-stamp/5 hover:bg-stamp/10'
                        : 'border-rule bg-white/40 hover:bg-white/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          to={`/task/${task._id}`}
                          className="font-medium text-ink hover:text-ledger transition-colors"
                        >
                          {task.title}
                        </Link>
                        <p className="text-sm text-ink-soft mt-1 line-clamp-2">
                          {task.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-3 mt-2 font-mono text-[11px] uppercase tracking-wide">
                          <span className="text-ink-soft">{task.type}</span>
                          {task.dueDate && (
                            <span className={isOverdue(task) ? 'text-stamp font-semibold' : 'text-ink-soft'}>
                              Due {new Date(task.dueDate).toLocaleDateString()}
                              {isOverdue(task) && ' · Overdue'}
                            </span>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>

                    <div className="flex gap-2 mt-3">
                      {['pending', 'in_progress', 'done'].map((s) => {
                        const activeStyles = {
                          pending: 'border-ink-soft/60 text-ink-soft bg-ink-soft/10',
                          in_progress: 'border-gold text-gold bg-gold/15',
                          done: 'border-ledger text-ledger bg-ledger/15',
                        };
                        const isActive = task.status === s;
                        return (
                          <button
                            key={s}
                            onClick={() => updateStatus(task._id, s)}
                            disabled={isActive}
                            className={`font-mono text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-sm border transition-colors ${
                              isActive
                                ? `${activeStyles[s]} font-semibold cursor-default`
                                : 'border-rule text-ink-soft hover:border-ink hover:text-ink hover:bg-paper-dark'
                            }`}
                          >
                            {s === 'in_progress' ? 'In progress' : s}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Notes log */}
          <section>
            <h2 className="font-display text-lg font-semibold text-ink mb-4">
              Notes log
            </h2>
            <form
              onSubmit={submitNote}
              className="border border-rule rounded-sm p-3 mb-4 bg-white/40 space-y-2"
            >
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Log what you did…"
                rows={3}
                className="w-full border border-rule bg-white/60 rounded-sm px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ledger/40 focus:border-ledger resize-none"
              />
              <select
                value={noteTaskId}
                onChange={(e) => setNoteTaskId(e.target.value)}
                className="w-full border border-rule bg-white/60 rounded-sm px-2.5 py-1.5 text-xs font-mono"
              >
                <option value="">Not linked to a task</option>
                {tasks.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.title}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={posting || !noteText.trim()}
                className="w-full bg-ledger text-paper text-sm font-medium rounded-sm py-2 hover:bg-ledger-dark transition-colors disabled:opacity-50"
              >
                {posting ? 'Adding…' : 'Add note'}
              </button>
            </form>

            <ul className="space-y-3">
              {notes.map((note) => (
                <li key={note._id} className="border-l-2 border-rule pl-3 py-0.5">
                  <p className="text-sm text-ink">{note.text}</p>
                  <p className="font-mono text-[11px] text-ink-soft mt-1">
                    {new Date(note.createdAt).toLocaleString()}
                    {note.statusChangeApplied && (
                      <span className="text-gold"> · status → {note.statusChangeApplied}</span>
                    )}
                  </p>
                </li>
              ))}
              {notes.length === 0 && (
                <p className="font-mono text-xs text-ink-soft">No notes yet.</p>
              )}
            </ul>
          </section>
        </div>

        {/* Voice messages inbox - standalone, not tied to any task */}
        {voiceMessages.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-lg font-semibold text-ink mb-4">
              Voice messages
            </h2>
            <ul className="space-y-3">
              {voiceMessages.map((msg) => (
                <VoiceMessageItem key={msg._id} message={msg} showListenedStatus={false} />
              ))}
            </ul>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}