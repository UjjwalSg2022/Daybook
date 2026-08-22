const express = require('express');
const Task = require('../models/Task');
const User = require('../models/User');
const Note = require('../models/Note');
const ActivityLog = require('../models/ActivityLog');
const requireAuth = require('../middleware/auth');
const logActivity = require('../utils/logActivity');

const router = express.Router();

// Fields a manager or employee is allowed to edit on a task's text/details.
// Status is intentionally excluded - it's employee-owned (see PATCH /:id/status).
const EDITABLE_FIELDS = ['title', 'description', 'type', 'dueDate'];

// Confirms the requesting user is allowed to see/act on this specific task:
// its own assignee, that assignee's manager, or the (hidden) super admin.
async function canAccessTask(user, task) {
  if (user.isSuperAdmin) return true;
  if (String(task.assignedTo) === String(user._id)) return true;
  if (user.role === 'manager') {
    const employee = await User.findById(task.assignedTo);
    return employee && String(employee.managerId) === String(user._id);
  }
  return false;
}

// POST /api/tasks - manager creates a task for one of their linked employees
router.post('/', requireAuth, async (req, res) => {
  try {
    if (!req.user.isSuperAdmin && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can create tasks' });
    }

    const { title, description, type, dueDate, assignedTo } = req.body;
    if (!title || !assignedTo) {
      return res.status(400).json({ error: 'Title and assignedTo are required' });
    }

    const employee = await User.findById(assignedTo);
    if (!employee || employee.role !== 'employee') {
      return res.status(400).json({ error: 'assignedTo must be a valid employee' });
    }
    if (!req.user.isSuperAdmin && String(employee.managerId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You can only assign tasks to your own team' });
    }

    const task = await Task.create({
      title,
      description: description || '',
      type: type || 'adhoc',
      dueDate: dueDate || null,
      assignedTo,
      assignedBy: req.user._id,
    });

    await logActivity({
      taskId: task._id,
      action: 'created',
      performedBy: req.user._id,
      detail: { title, assignedTo },
    });

    res.status(201).json({ task });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create task' });
  }
});

// GET /api/tasks - scoped list:
//   employee -> only their own tasks
//   manager  -> tasks for their linked employees (optionally ?employeeId=)
router.get('/', requireAuth, async (req, res) => {
  try {
    let filter = {};

    if (req.user.isSuperAdmin) {
      if (req.query.employeeId) filter.assignedTo = req.query.employeeId;
    } else if (req.user.role === 'employee') {
      filter.assignedTo = req.user._id;
    } else if (req.user.role === 'manager') {
      if (req.query.employeeId) {
        const employee = await User.findById(req.query.employeeId);
        if (!employee || String(employee.managerId) !== String(req.user._id)) {
          return res.status(403).json({ error: 'Not your team member' });
        }
        filter.assignedTo = req.query.employeeId;
      } else {
        const teamIds = (await User.find({ managerId: req.user._id }).select('_id')).map(
          (u) => u._id
        );
        filter.assignedTo = { $in: teamIds };
      }
    }

    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json({ tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load tasks' });
  }
});

// GET /api/tasks/:id - expanded view: full task, status/edit history, linked notes
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (!(await canAccessTask(req.user, task))) {
      return res.status(403).json({ error: 'Not permitted to view this task' });
    }

    const notes = await Note.find({ linkedTaskId: task._id }).sort({ createdAt: -1 });

    // Activity log is visible to Manager and Super Admin only (PRD 6.4)
    let activity = [];
    if (req.user.isSuperAdmin || req.user.role === 'manager') {
      activity = await ActivityLog.find({ taskId: task._id }).sort({ timestamp: -1 });
    }

    res.json({ task, notes, activity });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load task' });
  }
});

// PATCH /api/tasks/:id - edit title/description/type/dueDate.
// Open-edit decision (PRD, build-phase): BOTH the assigned employee and their
// manager may edit these fields, not just the manager. Every changed field is
// written to the Activity Log so there's still a record of what changed and
// by whom - this is the safeguard while the description itself isn't locked.
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (!(await canAccessTask(req.user, task))) {
      return res.status(403).json({ error: 'Not permitted to edit this task' });
    }

    const changes = [];
    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] !== undefined && String(req.body[field]) !== String(task[field] ?? '')) {
        changes.push({ field, from: task[field], to: req.body[field] });
        task[field] = req.body[field];
      }
    }

    if (changes.length === 0) {
      return res.json({ task, message: 'No changes' });
    }

    await task.save();

    await logActivity({
      taskId: task._id,
      action: 'edited',
      performedBy: req.user._id,
      detail: { changes },
    });

    res.json({ task });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update task' });
  }
});

// PATCH /api/tasks/:id/status - status is employee-owned.
// Managers (and super admin acting as manager-equivalent) get a 403 here by
// design: status reflects the employee's own report of their work.
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'in_progress', 'done'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const isOwner = String(task.assignedTo) === String(req.user._id);
    if (!isOwner) {
      return res
        .status(403)
        .json({ error: 'Only the assigned employee can change task status' });
    }

    if (status === task.status) {
      return res.json({ task, message: 'No change' });
    }

    const from = task.status;
    task.status = status;
    await task.save();

    await logActivity({
      taskId: task._id,
      action: 'status_changed',
      performedBy: req.user._id,
      detail: { from, to: status },
    });

    res.json({ task });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update status' });
  }
});

module.exports = router;
