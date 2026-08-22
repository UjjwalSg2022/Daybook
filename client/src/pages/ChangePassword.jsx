import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client';

export default function ChangePassword() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirm) {
      setError('New passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      updateUser({ mustChangePassword: false });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-semibold text-ink tracking-tight">
            {user.mustChangePassword ? 'Set a new password' : 'Change password'}
          </h1>
          <p className="font-mono text-xs text-ink-soft mt-2">
            {user.mustChangePassword
              ? 'Required before you can use Daybook'
              : `Signed in as ${user.email}`}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="border border-rule bg-paper/60 rounded-sm p-8 space-y-5"
        >
          <div>
            <label className="block font-mono text-xs uppercase tracking-wide text-ink-soft mb-1.5">
              Current (temporary) password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border border-rule bg-white/60 rounded-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ledger/40 focus:border-ledger"
            />
          </div>
          <div>
            <label className="block font-mono text-xs uppercase tracking-wide text-ink-soft mb-1.5">
              New password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-rule bg-white/60 rounded-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ledger/40 focus:border-ledger"
            />
          </div>
          <div>
            <label className="block font-mono text-xs uppercase tracking-wide text-ink-soft mb-1.5">
              Confirm new password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-rule bg-white/60 rounded-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ledger/40 focus:border-ledger"
            />
          </div>

          {error && (
            <p className="text-stamp text-sm font-mono bg-stamp/5 border border-stamp/30 rounded-sm px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-ledger text-paper font-medium rounded-sm py-2.5 hover:bg-ledger-dark transition-colors disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Set password'}
          </button>
        </form>
      </div>
    </div>
  );
}
