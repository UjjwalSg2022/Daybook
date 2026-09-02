import React, { useState } from 'react';
import api from '../api/client';

export default function ExportReport() {
  const [period, setPeriod] = useState('week');
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  async function handleExport(format) {
    setBusy(format);
    setError('');
    try {
      const res = await api.get(`/reports?format=${format}&period=${period}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      const a = document.createElement('a');
      a.href = url;
      a.download = `daybook-report-${period}-${new Date().toISOString().slice(0, 10)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not generate report');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mb-8 border border-rule rounded-sm p-4 bg-white/30">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">
          Export report
        </span>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="border border-rule bg-white/60 rounded-sm px-2.5 py-1.5 text-sm font-mono"
        >
          <option value="week">Past 7 days</option>
          <option value="month">Past 30 days</option>
        </select>
        <button
          onClick={() => handleExport('pdf')}
          disabled={busy !== null}
          className="font-mono text-xs uppercase tracking-wide border border-rule rounded-sm px-3 py-1.5 hover:border-ledger hover:text-ledger transition-colors disabled:opacity-50"
        >
          {busy === 'pdf' ? 'Generating…' : 'Download PDF'}
        </button>
        <button
          onClick={() => handleExport('excel')}
          disabled={busy !== null}
          className="font-mono text-xs uppercase tracking-wide border border-rule rounded-sm px-3 py-1.5 hover:border-ledger hover:text-ledger transition-colors disabled:opacity-50"
        >
          {busy === 'excel' ? 'Generating…' : 'Download Excel'}
        </button>
      </div>
      {error && (
        <p className="text-stamp text-xs font-mono bg-stamp/5 border border-stamp/30 rounded-sm px-3 py-2 mt-3">
          {error}
        </p>
      )}
    </section>
  );
}