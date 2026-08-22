const express = require('express');
const User = require('../models/User');
const Task = require('../models/Task');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');

const router = express.Router();

// GET /api/users/my-team
// Manager dashboard data: each linked employee plus a task-count breakdown.
// There is no general "list all users" route - deliberately no admin UI.
router.get('/my-team', requireAuth, requireRole('manager'), async (req, res) => {
  try {
    const employees = await User.find({ managerId: req.user._id }).select(
      '-passwordHash'
    );

    const team = await Promise.all(
      employees.map(async (emp) => {
        const [pending, inProgress, done] = await Promise.all([
          Task.countDocuments({ assignedTo: emp._id, status: 'pending' }),
          Task.countDocuments({ assignedTo: emp._id, status: 'in_progress' }),
          Task.countDocuments({ assignedTo: emp._id, status: 'done' }),
        ]);
        return {
          id: emp._id,
          name: emp.name,
          email: emp.email,
          taskCounts: { pending, inProgress, done, total: pending + inProgress + done },
        };
      })
    );

    res.json({ team });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load team' });
  }
});

module.exports = router;
