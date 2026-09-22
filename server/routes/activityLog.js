const express = require('express');
const ActivityLog = require('../models/ActivityLog');
const Task = require('../models/Task');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

const router = express.Router();

function isAdmin(user) {
  return user.role === 'admin' || user.isSuperAdmin === true;
}

function managesEmployee(managerId, employee) {
  return (employee.managerIds || []).some((id) => String(id) === String(managerId));
}

router.get('/:taskId', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'manager' && !isAdmin(req.user)) {
      return res.status(403).json({ error: 'Activity log is manager/admin only' });
    }

    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (!isAdmin(req.user)) {
      const employee = await User.findById(task.assignedTo);
      if (!employee || !managesEmployee(req.user._id, employee)) {
        return res.status(403).json({ error: 'Not your team member' });
      }
    }

    const entries = await ActivityLog.find({ taskId: task._id }).sort({ timestamp: -1 });
    res.json({ entries });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load activity log' });
  }
});

module.exports = router;