import React from 'react';

const LABELS = {
  pending: 'Pending',
  in_progress: 'In progress',
  done: 'Done',
};

// Self-contained per-status styling (no reliance on chained @apply classes)
// so the color/weight is always correct regardless of build quirks.
const STYLES = {
  pending: 'border-ink-soft/50 text-ink-soft bg-ink-soft/10',
  in_progress: 'border-gold text-gold bg-gold/15 font-semibold',
  done: 'border-ledger text-ledger bg-ledger/15 font-semibold',
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-mono uppercase tracking-wide ${
        STYLES[status] || STYLES.pending
      }`}
    >
      {LABELS[status] || status}
    </span>
  );
}