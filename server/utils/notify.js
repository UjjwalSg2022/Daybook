const Notification = require('../models/Notification');

/**
 * Writes one notification. Never throws - a notification failing to save
 * should never block the underlying task/status operation from succeeding.
 */
async function notify({ recipientId, type, message, taskId = null }) {
  try {
    await Notification.create({ recipientId, type, message, taskId });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

module.exports = notify;