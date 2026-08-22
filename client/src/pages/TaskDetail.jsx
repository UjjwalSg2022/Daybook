import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client';

export default function TaskDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [notes, setNotes] = useState([]);
  const [activity, setActivity] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'adhoc', dueDate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isManagerView = user?.role === 'manager' || user?.isSuperAdmin;

  async function load() {
    const res = await api.get(`/tasks/${id}`);
    setTask(res.data.task);
    setNotes(res.data.notes);
    setActivity(res.data.activity);
    setForm({
      title: res.data.task.title,
      description: res.data.task.description || '',
      type: res.data.task.type,
      dueDate: res.data.task.dueDate ? res.data.task.dueDate.slice(0, 10) : '',
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveEdits(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.patch(`/tasks/${id}`, {
        title: form.title,
        description: form.description,
        type: form.type,
        dueDate: form.dueDate || null,
      });
      setEditing(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save changes');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(status) {
    await api.patch(`/tasks/${id}/status`, { status });
    load();
  }

  if (!task) {
    return (
      <div className="min-h-screen">
        <Header />
        <p className="font-mono text-sm text-ink-soft text-center mt-10">Loading…</p>
      </div>
    );
  }

  const isOwner = user && task.assignedTo === user.id;
  const canEditText = isOwner || isManagerView; // open-edit decision, build phase

  return (
    <div className="min-h-screen">
      <Header subtitle="Task record" />
      <main className="max-w-3xl mx-auto px-6 md:px-10 py-8 ledger-page">
        <Link
          to={user?.role === 'manager' || user?.isSuperAdmin ? '/manager' : '/employee'}
          className="font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-ledger"
        >
          ← Back to dashboard
        </Link>

        <div className="border border-rule rounded-sm p-6 mt-4 bg-white/40">
          {!editing ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-display text-2xl font-semibold text-ink">
                  {task.title}
                </h2>
                <StatusBadge status={task.status} />
              </div>
              <p className="text-ink-soft mt-3 whitespace-pre-wrap">
                {task.description || 'No description'}
              </p>
              <div className="flex gap-4 mt-4 font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                <span>{task.type}</span>
                {task.dueDate && (
                  <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                )}
              </div>

                            {canEditText && (
                <button
                  onClick={() => setEditing(true)}
                  className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-ledger border border-ledger/50 rounded-sm px-3 py-1.5 hover:bg-ledger/10 hover:border-ledger transition-colors"
                >
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                    <path d="M11.3 1.3a1 1 0 0 1 1.4 0l2 2a1 1 0 0 1 0 1.4l-8 8-3.7 1 1-3.7 8-8z" />
                  </svg>
                  Edit task
                </button>
              )}
            </>
          ) : (
            <form onSubmit={saveEdits} className="space-y-4">
              <div>
                <label className="block font-mono text-xs uppercase tracking-wide text-ink-soft mb-1.5">
                  Title
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="w-full border border-rule bg-white/60 rounded-sm px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-mono text-xs uppercase tracking-wide text-ink-soft mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full border border-rule bg-white/60 rounded-sm px-3 py-2 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wide text-ink-soft mb-1.5">
                    Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full border border-rule bg-white/60 rounded-sm px-3 py-2"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wide text-ink-soft mb-1.5">
                    Due date
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full border border-rule bg-white/60 rounded-sm px-3 py-2"
                  />
                </div>
              </div>

              {error && (
                <p className="text-stamp text-sm font-mono bg-stamp/5 border border-stamp/30 rounded-sm px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 border border-rule rounded-sm py-2 text-ink-soft hover:bg-paper-dark"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-ledger text-paper rounded-sm py-2 font-medium hover:bg-ledger-dark disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          )}

          {isOwner && !editing && (
            <div className="flex gap-2 mt-5 pt-5 border-t border-rule">
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
                    onClick={() => updateStatus(s)}
                    disabled={isActive}
                    className={`font-mono text-[11px] uppercase tracking-wide px-3 py-1.5 rounded-sm border transition-colors ${
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
          )}
        </div>

        {/* Linked notes */}
        <section className="mt-8">
          <h3 className="font-display text-lg font-semibold text-ink mb-3">
            Linked notes
          </h3>
          {notes.length === 0 ? (
            <p className="font-mono text-xs text-ink-soft">No notes linked to this task.</p>
          ) : (
            <ul className="space-y-2">
              {notes.map((n) => (
                <li key={n._id} className="border-l-2 border-rule pl-3 py-0.5">
                  <p className="text-sm text-ink">{n.text}</p>
                  <p className="font-mono text-[11px] text-ink-soft mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Activity log - manager/super admin only */}
        {isManagerView && (
          <section className="mt-8">
            <h3 className="font-display text-lg font-semibold text-ink mb-3">
              Activity log
            </h3>
            {activity.length === 0 ? (
              <p className="font-mono text-xs text-ink-soft">No activity recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {activity.map((a) => (
                  <li
                    key={a._id}
                    className="font-mono text-xs text-ink-soft border-l-2 border-gold/50 pl-3 py-0.5"
                  >
                    <span className="text-ink">{a.action.replace('_', ' ')}</span>{' '}
                    · {new Date(a.timestamp).toLocaleString()}
                    {a.detail?.changes && (
                      <ul className="mt-1 ml-3 list-disc">
                        {a.detail.changes.map((c, i) => (
                          <li key={i}>
                            {c.field}: "{String(c.from).slice(0, 40)}" → "
                            {String(c.to).slice(0, 40)}"
                          </li>
                        ))}
                      </ul>
                    )}
                    {a.detail?.from && a.action === 'status_changed' && (
                      <span> ({a.detail.from} → {a.detail.to})</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
