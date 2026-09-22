const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Task = require('../models/Task');
const Note = require('../models/Note');
const VoiceMessage = require('../models/VoiceMessage');
const ActivityLog = require('../models/ActivityLog');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');

const router = express.Router();

function isAdmin(user) {
  return user.role === 'admin' || user.isSuperAdmin === true;
}

// GET /api/users/my-team
// Manager dashboard data: every employee who has this manager anywhere in
// their managerIds list, plus a task-count breakdown. An employee with
// several managers shows up on each of their dashboards independently.
router.get('/my-team', requireAuth, requireRole('manager'), async (req, res) => {
  try {
    const employees = await User.find({ managerIds: req.user._id }).select(
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

// GET /api/users/managers - Admin only. Powers the "reports to" multi-pick
// list when creating/editing an employee account.
router.get('/managers', requireAuth, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: 'Only the Admin can view this' });
    }
    const managers = await User.find({ role: 'manager' }).select('name email');
    res.json({ managers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load managers' });
  }
});

// GET /api/users - Admin only. Every manager/employee account.
router.get('/', requireAuth, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: 'Only the Admin can view all accounts' });
    }
    const users = await User.find({ role: { $ne: 'admin' }, isSuperAdmin: { $ne: true } })
      .select('-passwordHash')
      .populate('managerIds', 'name')
      .sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load accounts' });
  }
});

// Validates a managerIds array from the request body: must be a non-empty
// array of IDs that all belong to real manager accounts. Returns the
// deduplicated array of ObjectIds, or throws an object with .status/.error
// for the route handler to respond with.
async function resolveManagerIds(managerIds) {
  if (!Array.isArray(managerIds) || managerIds.length === 0) {
    throw { status: 400, error: 'Employees must be linked to at least one manager' };
  }
  const uniqueIds = [...new Set(managerIds.map(String))];
  const managers = await User.find({ _id: { $in: uniqueIds }, role: 'manager' });
  if (managers.length !== uniqueIds.length) {
    throw { status: 400, error: 'One or more selected managers are invalid' };
  }
  return managers.map((m) => m._id);
}

// POST /api/users - Admin creates a manager or employee account. Employees
// can be linked to more than one manager at once.
router.post('/', requireAuth, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: 'Only the Admin can create accounts' });
    }

    const { name, email, role, password, managerIds } = req.body;
    if (!name || !email || !role || !password) {
      return res.status(400).json({ error: 'Name, email, role, and password are required' });
    }
    if (!['employee', 'manager'].includes(role)) {
      return res.status(400).json({ error: 'Role must be employee or manager' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    let resolvedManagerIds = [];
    if (role === 'employee') {
      try {
        resolvedManagerIds = await resolveManagerIds(managerIds);
      } catch (e) {
        return res.status(e.status || 400).json({ error: e.error || 'Invalid managers' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      managerIds: resolvedManagerIds,
      mustChangePassword: false,
    });

    res.status(201).json({ user: user.toSafeObject() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create account' });
  }
});

// PATCH /api/users/:id - Admin edits any detail on an account, including
// the full set of managers an employee reports to.
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: 'Only the Admin can edit accounts' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (isAdmin(user)) {
      return res.status(403).json({ error: 'The Admin account cannot be edited here' });
    }

    const { name, email, role, managerIds } = req.body;

    if (email && email.toLowerCase().trim() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        return res.status(400).json({ error: 'A user with this email already exists' });
      }
      user.email = email.toLowerCase().trim();
    }

    if (name) user.name = name;

    if (role && role !== user.role) {
      if (!['employee', 'manager'].includes(role)) {
        return res.status(400).json({ error: 'Role must be employee or manager' });
      }
      // Switching a manager to employee would orphan anyone still reporting
      // to them - block it until those employees are reassigned.
      if (user.role === 'manager' && role === 'employee') {
        const linkedCount = await User.countDocuments({ managerIds: user._id });
        if (linkedCount > 0) {
          return res.status(400).json({
            error: `Reassign ${user.name}'s ${linkedCount} employee(s) to another manager before changing their role`,
          });
        }
      }
      user.role = role;
      if (role === 'manager') user.managerIds = [];
    }

    if (user.role === 'employee' && managerIds !== undefined) {
      try {
        user.managerIds = await resolveManagerIds(managerIds);
      } catch (e) {
        return res.status(e.status || 400).json({ error: e.error || 'Invalid managers' });
      }
    }

    await user.save();

    res.json({ user: user.toSafeObject() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update account' });
  }
});

// PATCH /api/users/:id/reset-password
router.patch('/:id/reset-password', requireAuth, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: 'Only the Admin can reset passwords' });
    }
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not reset password' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: 'Only the Admin can delete accounts' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (isAdmin(user)) {
      return res.status(403).json({ error: 'The Admin account cannot be deleted' });
    }

    if (user.role === 'manager') {
      const linkedCount = await User.countDocuments({ managerIds: user._id });
      if (linkedCount > 0) {
        return res.status(400).json({
          error: `Reassign or delete ${user.name}'s ${linkedCount} employee(s) before deleting this manager`,
        });
      }
    }

    const tasksToDelete = await Task.find({ assignedTo: user._id }).select('_id');
    const taskIds = tasksToDelete.map((t) => t._id);

    await ActivityLog.deleteMany({ taskId: { $in: taskIds } });
    await Task.deleteMany({ _id: { $in: taskIds } });
    await Note.deleteMany({ authorId: user._id });
    await VoiceMessage.deleteMany({
      $or: [{ senderId: user._id }, { recipientId: user._id }],
    });

    await user.deleteOne();

    res.json({ message: 'Account deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete account' });
  }
});

module.exports = router;