import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import VoiceRecorder from '../components/VoiceRecorder.jsx';
import VoiceMessageItem from '../components/VoiceMessageItem.jsx';
import AdminUserManagement from '../components/AdminUserManagement.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client';

function AssignTaskModal({ team, onClose, onCreated }) {
  const [assignedTo, setAssignedTo] = useState(team[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('daily');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/tasks', {
        assignedTo,
        title,
        description,
        type,
        dueDate: dueDate || null,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create task');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-6 z-20">
      <form
        onSubmit={submit}
        className="bg-paper border border-rule rounded-sm p-6 w-full max-w-md space-y-4"
      >
        <h3 className="font-display text-xl font-semibold text-ink">Assign a task</h3>

        <div>
          <label className="block font-mono text-xs uppercase tracking-wide text-ink-soft mb-1.5">
            Assign to
          </label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            required
            className="w-full border border-rule bg-white/60 rounded-sm px-3 py-2"
          >
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-mono text-xs uppercase tracking-wide text-ink-soft mb-1.5">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border border-rule bg-white/60 rounded-sm px-3 py-2"
          />
        </div>

        <div>
          <label className="block font-mono text-xs uppercase tracking-wide text-ink-soft mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-rule bg-white/60 rounded-sm px-3 py-2 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-mono text-xs uppercase tracking-wide text-ink-soft mb-1.5">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
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
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-rule bg-white/60 rounded-sm px-3 py-2"
            />
          </div>
        </div>

        {error && (
          <p className="text-stamp text-sm font-mono bg-stamp/5 border border-stamp/30 rounded-sm px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-rule rounded-sm py-2 text-ink-soft hover:bg-paper-dark transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 bg-ledger text-paper rounded-sm py-2 font-medium hover:bg-ledger-dark transition-colors disabled:opacity-50"
          >
            {busy ? 'Assigning…' : 'Assign task'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    setLoading(true);
    const res = await api.get('/users/my-team');
    setTeam(res.data.team);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header subtitle="Team overview" />
      <main className="max-w-5xl mx-auto px-6 md:px-10 py-8 ledger-page flex-1 w-full">
        {user?.isSuperAdmin && <AdminUserManagement />}

        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-lg font-semibold text-ink">Your team</h2>
          <button
            onClick={() => setModalOpen(true)}
            disabled={team.length === 0}
            className="bg-ledger text-paper text-sm font-medium rounded-sm px-4 py-2 hover:bg-ledger-dark transition-colors disabled:opacity-50"
          >
            + Assign new task
          </button>
        </div>

        {loading ? (
          <p className="font-mono text-sm text-ink-soft">Loading…</p>
        ) : team.length === 0 ? (
          <p className="font-mono text-sm text-ink-soft border border-dashed border-rule rounded-sm p-6 text-center">
            No employees are linked to you yet. Ask the Super Admin to link team
            members to your account.
          </p>
        ) : (
                    <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
          >
            {team.map((member) => (
              <div
                key={member.id}
                className="border border-rule rounded-sm p-5 bg-white/40"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink">
                      {member.name}
                    </h3>
                    <p className="font-mono text-[11px] text-ink-soft">
                      {member.email}
                    </p>
                  </div>
                  <div className="font-display text-2xl font-semibold text-ink">
                    {member.taskCounts.total}
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <div className="flex-1 text-center border border-rule rounded-sm py-1.5">
                    <div className="font-mono text-sm text-ink-soft">
                      {member.taskCounts.pending}
                    </div>
                    <div className="font-mono text-[10px] uppercase text-ink-soft/70">
                      Pending
                    </div>
                  </div>
                  <div className="flex-1 text-center border border-gold/40 rounded-sm py-1.5">
                    <div className="font-mono text-sm text-gold">
                      {member.taskCounts.inProgress}
                    </div>
                    <div className="font-mono text-[10px] uppercase text-gold/80">
                      In progress
                    </div>
                  </div>
                  <div className="flex-1 text-center border border-ledger/40 rounded-sm py-1.5">
                    <div className="font-mono text-sm text-ledger">
                      {member.taskCounts.done}
                    </div>
                    <div className="font-mono text-[10px] uppercase text-ledger/80">
                      Done
                    </div>
                  </div>
                </div>

                <ViewTasksLink employeeId={member.id} />
                <VoiceMessageToggle employeeId={member.id} />
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />

      {modalOpen && (
        <AssignTaskModal
          team={team}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function ViewTasksLink({ employeeId }) {
  const [tasks, setTasks] = useState(null);
  const [open, setOpen] = useState(false);

  async function toggle() {
    if (!open && tasks === null) {
      const res = await api.get(`/tasks?employeeId=${employeeId}`);
      setTasks(res.data.tasks);
    }
    setOpen((o) => !o);
  }

  return (
    <div className="mt-4">
      <button
        onClick={toggle}
        className="font-mono text-xs uppercase tracking-wide text-ledger hover:text-ledger-dark"
      >
        {open ? 'Hide tasks ▲' : 'View tasks ▼'}
      </button>
            {open && (
        <ul className="mt-3 space-y-2">
          {(tasks || []).map((t) => (
            <li key={t._id}>
              <Link
                to={`/task/${t._id}`}
                className="flex items-center justify-between gap-3 border border-rule rounded-sm px-3 py-2 bg-white/40 hover:bg-white/80 hover:border-ledger transition-colors group"
              >
                <span className="min-w-0">
                  <span className="text-sm text-ink group-hover:text-ledger transition-colors">
                    {t.title}
                  </span>{' '}
                  <span className="font-mono text-[10px] text-ink-soft uppercase ml-1">
                    {t.status}
                  </span>
                </span>
                <svg
                  viewBox="0 0 16 16"
                  width="12"
                  height="12"
                  fill="none"
                  className="flex-shrink-0 text-ink-soft group-hover:text-ledger transition-colors"
                >
                  <path
                    d="M6 3l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </li>
          ))}
          {tasks && tasks.length === 0 && (
            <p className="font-mono text-xs text-ink-soft">No tasks yet.</p>
          )}
        </ul>
      )}
    </div>
  );
}

function VoiceMessageToggle({ employeeId }) {
  const [open, setOpen] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [sentOpen, setSentOpen] = useState(false);
  const [sent, setSent] = useState(null);

  async function toggleSent() {
    if (!sentOpen && sent === null) {
      const res = await api.get(`/voice-messages?employeeId=${employeeId}`);
      setSent(res.data.messages);
    }
    setSentOpen((o) => !o);
  }

  async function refreshSent() {
    const res = await api.get(`/voice-messages?employeeId=${employeeId}`);
    setSent(res.data.messages);
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            setOpen((o) => !o);
            setJustSent(false);
          }}
          className="font-mono text-xs uppercase tracking-wide text-stamp hover:text-stamp/80"
        >
          {open ? 'Hide voice message ▲' : 'Send voice message ▼'}
        </button>
        <button
          onClick={toggleSent}
          className="font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-ledger"
        >
          {sentOpen ? 'Hide sent ▲' : 'View sent ▼'}
        </button>
      </div>

      {open && (
        <div className="mt-3">
          <VoiceRecorder
            recipientId={employeeId}
            onSent={() => {
              setOpen(false);
              setJustSent(true);
              if (sentOpen) refreshSent();
            }}
          />
        </div>
      )}
      {justSent && !open && (
        <p className="font-mono text-[11px] text-ledger mt-2">Voice message sent.</p>
      )}

      {sentOpen && (
        <ul className="mt-3 space-y-2">
          {(sent || []).map((msg) => (
            <VoiceMessageItem
              key={msg._id}
              message={msg}
              showRecipient
              showListenedStatus
            />
          ))}
          {sent && sent.length === 0 && (
            <p className="font-mono text-xs text-ink-soft">No voice messages sent yet.</p>
          )}
        </ul>
      )}
    </div>
  );
}
