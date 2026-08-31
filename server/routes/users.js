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

// GET /api/users/my-team
// Manager dashboard data: each linked employee plus a task-count breakdown.
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

// GET /api/users/managers - Super Admin only. Powers the "assign to
// manager" dropdown when creating a new employee account.
router.get('/managers', requireAuth, async (req, res) => {
  try {
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({ error: 'Only the Super Admin can view this' });
    }
    const managers = await User.find({ role: 'manager' }).select('name email');
    res.json({ managers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load managers' });
  }
});

// GET /api/users - Super Admin only. Every manager/employee account, so the
// admin can see who already has credentials and reset anyone's password.
router.get('/', requireAuth, async (req, res) => {
  try {
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({ error: 'Only the Super Admin can view all accounts' });
    }
    const users = await User.find({ isSuperAdmin: { $ne: true } })
      .select('-passwordHash')
      .populate('managerId', 'name')
      .sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load accounts' });
  }
});

// POST /api/users - Super Admin creates a manager or employee account with
// an explicit password chosen right here, to hand over directly. This is
// the UI equivalent of scripts/createUser.js.
router.post('/', requireAuth, async (req, res) => {
  try {
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({ error: 'Only the Super Admin can create accounts' });
    }

    const { name, email, role, password, managerId } = req.body;
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

    let linkedManagerId = null;
    if (role === 'employee') {
      if (!managerId) {
        return res.status(400).json({ error: 'Employees must be linked to a manager' });
      }
      const manager = await User.findById(managerId);
      if (!manager || manager.role !== 'manager') {
        return res.status(400).json({ error: 'Invalid manager selected' });
      }
      linkedManagerId = manager._id;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      managerId: linkedManagerId,
      mustChangePassword: false,
    });

    res.status(201).json({ user: user.toSafeObject() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create account' });
  }
});

// PATCH /api/users/:id - Super Admin edits any detail on an account: name,
// email (their login username), role, or which manager an employee reports
// to. Password changes go through the separate reset-password route.
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({ error: 'Only the Super Admin can edit accounts' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isSuperAdmin) {
      return res.status(403).json({ error: 'The Super Admin account cannot be edited here' });
    }

    const { name, email, role, managerId } = req.body;

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
        const linkedCount = await User.countDocuments({ managerId: user._id });
        if (linkedCount > 0) {
          return res.status(400).json({
            error: `Reassign ${user.name}'s ${linkedCount} employee(s) to another manager before changing their role`,
          });
        }
      }
      user.role = role;
      if (role === 'manager') user.managerId = null;
    }

    if (user.role === 'employee' && managerId !== undefined) {
      if (!managerId) {
        return res.status(400).json({ error: 'Employees must be linked to a manager' });
      }
      const manager = await User.findById(managerId);
      if (!manager || manager.role !== 'manager') {
        return res.status(400).json({ error: 'Invalid manager selected' });
      }
      user.managerId = manager._id;
    }

    await user.save();

    res.json({ user: user.toSafeObject() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update account' });
  }
});

// PATCH /api/users/:id/reset-password - Super Admin sets a new password for
// any account directly. This is the product's only "forgot password" flow.
router.patch('/:id/reset-password', requireAuth, async (req, res) => {
  try {
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({ error: 'Only the Super Admin can reset passwords' });
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

// DELETE /api/users/:id - Super Admin removes an account entirely. Cascades
// to clean up anything solely tied to that account (their tasks, notes,
// voice messages, and the activity log entries for those tasks) so nothing
// is left dangling with a reference to a user that no longer exists.
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({ error: 'Only the Super Admin can delete accounts' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isSuperAdmin) {
      return res.status(403).json({ error: 'The Super Admin account cannot be deleted' });
    }

    if (user.role === 'manager') {
      const linkedCount = await User.countDocuments({ managerId: user._id });
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