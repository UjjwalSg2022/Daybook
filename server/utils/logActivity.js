const ActivityLog = require('../models/ActivityLog');

/**
 * Writes one entry to the activity log. Never throws - a logging failure
 * should never block the underlying task/note operation from succeeding,
 * but it is worth console.error-ing so it doesn't go unnoticed.
 */
async function logActivity({ taskId, action, performedBy, detail = {} }) {
  try {
    await ActivityLog.create({ taskId, action, performedBy, detail });
  } catch (err) {
    console.error('Failed to write activity log entry:', err.message);
  }
}

module.exports = logActivity;
