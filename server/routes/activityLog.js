const express = require('express');
const ActivityLog = require('../models/ActivityLog');
const Task = require('../models/Task');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// GET /api/activity/:taskId
// The activity log is the primary safeguard now that task text is
// open-edit in v1 (see PRD "Decision" note) - visible to Manager and
// Super Admin only, never to the employee, and never editable by anyone.
router.get('/:taskId', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'manager' && !req.user.isSuperAdmin) {
      return res.status(403).json({ error: 'Activity log is manager/admin only' });
    }

    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (!req.user.isSuperAdmin) {
      const employee = await User.findById(task.assignedTo);
      if (!employee || String(employee.managerId) !== String(req.user._id)) {
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
