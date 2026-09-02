const express = require('express');
const Notification = require('../models/Notification');
const Task = require('../models/Task');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');
const notify = require('../utils/notify');

const router = express.Router();

function isAdmin(user) {
  return user.role === 'admin' || user.isSuperAdmin === true;
}

// There's no background job/cron running (the free hosting tier would sleep
// through it anyway), so overdue notifications are generated lazily right
// here: every time someone loads their notifications, we check their
// relevant tasks for ones that are newly overdue and don't already have an
// overdue notification recorded, and create one. This keeps things simple
// with no extra infrastructure, at the cost of only surfacing an overdue
// notice the next time the person actually opens the app.
async function generateOverdueNotifications(user) {
  const now = new Date();
  let taskFilter = { dueDate: { $lt: now }, status: { $ne: 'done' } };

  if (isAdmin(user)) {
    return;
  }
  if (user.role === 'employee') {
    taskFilter.assignedTo = user._id;
  } else if (user.role === 'manager') {
    const teamIds = (await User.find({ managerId: user._id }).select('_id')).map(
      (u) => u._id
    );
    taskFilter.assignedTo = { $in: teamIds };
  }

  const overdueTasks = await Task.find(taskFilter);
  if (overdueTasks.length === 0) return;

  const taskIds = overdueTasks.map((t) => t._id);
  const existing = await Notification.find({
    recipientId: user._id,
    type: 'overdue',
    taskId: { $in: taskIds },
  }).select('taskId');
  const alreadyNotified = new Set(existing.map((n) => String(n.taskId)));

  for (const task of overdueTasks) {
    if (alreadyNotified.has(String(task._id))) continue;
    await notify({
      recipientId: user._id,
      type: 'overdue',
      message: `"${task.title}" is overdue`,
      taskId: task._id,
    });
  }
}

router.get('/', requireAuth, async (req, res) => {
  try {
    await generateOverdueNotifications(req.user);

    const notifications = await Notification.find({ recipientId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipientId: req.user._id,
      read: false,
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load notifications' });
  }
});

router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    if (String(notification.recipientId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not permitted' });
    }
    notification.read = true;
    await notification.save();
    res.json({ notification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update notification' });
  }
});

router.patch('/read-all', requireAuth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user._id, read: false },
      { $set: { read: true } }
    );
    res.json({ message: 'All marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update notifications' });
  }
});

module.exports = router;