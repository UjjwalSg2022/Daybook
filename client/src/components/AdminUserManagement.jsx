import React, { useEffect, useState } from 'react';
import api from '../api/client';

function CreateAccountModal({ managers, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('employee');
  const [managerId, setManagerId] = useState(managers[0]?._id || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/users', {
        name,
        email,
        role,
        password,
        managerId: role === 'employee' ? managerId : undefined,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create account');
    } finally {
      setBusy(false);
    }
  }

  const needsManagerButNoneExist = role === 'employee' && managers.length === 0;

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-6 z-20">
      <form
        onSubmit={submit}
        className="bg-paper border border-rule rounded-sm p-6 w-full max-w-md space-y-4"
      >
        <h3 className="font-display text-xl font-semibold text-ink">Create account</h3>

        <div>
          <label className="block font-mono text-xs uppercase tracking-wide text-ink-soft mb-1.5">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border border-rule bg-white/60 rounded-sm px-3 py-2"
          />
        </div>

        <div>
          <label className="block font-mono text-xs uppercase tracking-wide text-ink-soft mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="name@macintl.in"
            className="w-full border border-rule bg-white/60 rounded-sm px-3 py-2"
          />
        </div>

        <div>
          <label className="block font-mono text-xs uppercase tracking-wide text-ink-soft mb-1.5">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border border-rule bg-white/60 rounded-sm px-3 py-2"
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
          </select>
        </div>

        {role === 'employee' && (
          <div>
            <label className="block font-mono text-xs uppercase tracking-wide text-ink-soft mb-1.5">
              Reports to
            </label>
            {needsManagerButNoneExist ? (
              <p className="font-mono text-xs text-stamp bg-stamp/5 border border-stamp/30 rounded-sm px-3 py-2">
                No managers exist yet. Create a manager account first.
              </p>
            ) : (
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                required
                className="w-full border border-rule bg-white/60 rounded-sm px-3 py-2"
              >
                {managers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div>
          <label className="block font-mono text-xs uppercase tracking-wide text-ink-soft mb-1.5">
            Password
          </label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="w-full border border-rule bg-white/60 rounded-sm px-3 py-2 font-mono"
          />
          <p className="font-mono text-[11px] text-ink-soft mt-1">
            Shown in plain text so you can note it down and hand it over directly.
          </p>
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
            disabled={busy || needsManagerButNoneExist}
            className="flex-1 bg-ledger text-paper rounded-sm py-2 font-medium hover:bg-ledger-dark transition-colors disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditAccountModal({ targetUser, managers, onClose, onSaved }) {
  const [name, setName] = useState(targetUser.name);
  const [email, setEmail] = useState(targetUser.email);
  const [role, setRole] = useState(targetUser.role);
  const [managerId, setManagerId] = useState(
    targetUser.managerId?._id || targetUser.managerId || managers[0]?._id || ''
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.patch(`/users/${targetUser._id}`, {
        name,
        email,
        role,
        managerId: role === 'employee' ? managerId : undefined,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update account');
    } finally {
      setBusy(false);
    }
  }

  const needsManagerButNoneExist = role === 'employee' && managers.length === 0;

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-6 z-20">
      <form
        onSubmit={submit}
        className="bg-paper border border-rule rounded-sm p-6 w-full max-w-sm space-y-4"
      >
        <h3 className="font-display text-lg font-semibold text-ink">Edit account</h3>

        <div>
          <label className="block font-mono text-xs uppercase tracking-wide text-ink-soft mb-1.5">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border border-rule bg-white/60 rounded-sm px-3 py-2"
          />
        </div>

        <div>
          <label className="block font-mono text-xs uppercase tracking-wide text-ink-soft mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-rule bg-white/60 rounded-sm px-3 py-2"
          />
        </div>

        <div>
          <label className="block font-mono text-xs uppercase tracking-wide text-ink-soft mb-1.5">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border border-rule bg-white/60 rounded-sm px-3 py-2"
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
          </select>
          {targetUser.role === 'manager' && role === 'employee' && (
            <p className="font-mono text-[11px] text-stamp mt-1">
              If anyone still reports to this manager, reassign them first or this
              will be rejected.
            </p>
          )}
        </div>

        {role === 'employee' && (
          <div>
            <label className="block font-mono text-xs uppercase tracking-wide text-ink-soft mb-1.5">
              Reports to
            </label>
            {needsManagerButNoneExist ? (
              <p className="font-mono text-xs text-stamp bg-stamp/5 border border-stamp/30 rounded-sm px-3 py-2">
                No managers exist yet. Create a manager account first.
              </p>
            ) : (
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                required
                className="w-full border border-rule bg-white/60 rounded-sm px-3 py-2"
              >
                {managers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

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
            disabled={busy || needsManagerButNoneExist}
            className="flex-1 bg-ledger text-paper rounded-sm py-2 font-medium hover:bg-ledger-dark transition-colors disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ResetPasswordModal({ targetUser, onClose, onReset }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.patch(`/users/${targetUser._id}/reset-password`, {
        newPassword: password,
      });
      onReset();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reset password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-6 z-20">
      <form
        onSubmit={submit}
        className="bg-paper border border-rule rounded-sm p-6 w-full max-w-sm space-y-4"
      >
        <h3 className="font-display text-lg font-semibold text-ink">Reset password</h3>
        <p className="text-sm text-ink-soft">
          For {targetUser.name} ({targetUser.email})
        </p>
        <div>
          <label className="block font-mono text-xs uppercase tracking-wide text-ink-soft mb-1.5">
            New password
          </label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="w-full border border-rule bg-white/60 rounded-sm px-3 py-2 font-mono"
          />
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
            className="flex-1 bg-stamp text-paper rounded-sm py-2 font-medium hover:bg-stamp/90 transition-colors disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Set new password'}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteAccountModal({ targetUser, onClose, onDeleted }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    setError('');
    setBusy(true);
    try {
      await api.delete(`/users/${targetUser._id}`);
      onDeleted();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete account');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-6 z-20">
      <div className="bg-paper border border-rule rounded-sm p-6 w-full max-w-sm space-y-4">
        <h3 className="font-display text-lg font-semibold text-ink">Delete account</h3>
        <p className="text-sm text-ink-soft">
          This permanently deletes <span className="text-ink font-medium">{targetUser.name}</span>{' '}
          ({targetUser.email}), along with all their tasks, notes, and voice messages.
          This cannot be undone.
        </p>

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
            type="button"
            onClick={confirmDelete}
            disabled={busy}
            className="flex-1 bg-stamp text-paper rounded-sm py-2 font-medium hover:bg-stamp/90 transition-colors disabled:opacity-50"
          >
            {busy ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function load() {
    setLoading(true);
    const [usersRes, managersRes] = await Promise.all([
      api.get('/users'),
      api.get('/users/managers'),
    ]);
    setUsers(usersRes.data.users);
    setManagers(managersRes.data.managers);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="mb-10 border border-rule rounded-sm p-5 bg-white/30">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Account management</h2>
          <p className="font-mono text-xs text-ink-soft mt-0.5">
            Create manager/employee logins and issue new passwords
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="bg-ledger text-paper text-sm font-medium rounded-sm px-4 py-2 hover:bg-ledger-dark transition-colors"
        >
          + Create account
        </button>
      </div>

      {loading ? (
        <p className="font-mono text-sm text-ink-soft">Loading…</p>
      ) : users.length === 0 ? (
        <p className="font-mono text-sm text-ink-soft border border-dashed border-rule rounded-sm p-6 text-center">
          No accounts created yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {users.map((u) => (
            <li
              key={u._id}
              className="flex items-center justify-between gap-3 border border-rule rounded-sm px-3 py-2.5 bg-white/40"
            >
              <div className="min-w-0">
                <div className="text-sm text-ink font-medium">
                  {u.name}{' '}
                  <span className="font-mono text-[10px] uppercase text-ink-soft ml-1">
                    {u.role}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-ink-soft truncate">
                  {u.email}
                  {u.managerId && ` · reports to ${u.managerId.name}`}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setEditTarget(u)}
                  className="font-mono text-[11px] uppercase tracking-wide border border-rule rounded-sm px-3 py-1.5 hover:border-ledger hover:text-ledger transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setResetTarget(u)}
                  className="font-mono text-[11px] uppercase tracking-wide border border-rule rounded-sm px-3 py-1.5 hover:border-stamp hover:text-stamp transition-colors"
                >
                  Reset password
                </button>

                 <button
                  onClick={() => setDeleteTarget(u)}
                  className="font-mono text-[11px] uppercase tracking-wide border border-rule text-stamp/80 rounded-sm px-3 py-1.5 hover:border-stamp hover:bg-stamp/10 transition-colors"
                >
                  Delete
                </button>

              </div>
            </li>
          ))}
        </ul>
      )}

      {createOpen && (
        <CreateAccountModal
          managers={managers}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}

      {editTarget && (
        <EditAccountModal
          targetUser={editTarget}
          managers={managers}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            load();
          }}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          targetUser={resetTarget}
          onClose={() => setResetTarget(null)}
          onReset={() => setResetTarget(null)}
        />
      )}

            {resetTarget && (
        <ResetPasswordModal
          targetUser={resetTarget}
          onClose={() => setResetTarget(null)}
          onReset={() => setResetTarget(null)}
        />
      )}

      {deleteTarget && (
        <DeleteAccountModal
          targetUser={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            load();
          }}
        />
      )}
    </section>
  );
}