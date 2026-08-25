import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      navigate(user.mustChangePassword ? '/change-password' : '/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not sign in');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header subtitle="Sign in" />
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-semibold text-ink tracking-tight">
              Sign in to your account
            </h2>
            <p className="font-mono text-xs text-ink-soft mt-2 tracking-wide">
              MAC INTERNATIONAL
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="border border-rule bg-paper/60 rounded-sm p-8 space-y-5"
          >
            <div>
              <label className="block font-mono text-xs uppercase tracking-wide text-ink-soft mb-1.5">
                Company email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-rule bg-white/60 rounded-sm px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-ledger/40 focus:border-ledger"
                placeholder="you@macintl.in"
              />
            </div>
            <div>
              <label className="block font-mono text-xs uppercase tracking-wide text-ink-soft mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-rule bg-white/60 rounded-sm px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-ledger/40 focus:border-ledger"
                placeholder="••••••••"
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
              {busy ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="text-xs text-ink-soft text-center pt-2">
              Forgot your password? Ask your Super Admin to issue a new one.
            </p>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}