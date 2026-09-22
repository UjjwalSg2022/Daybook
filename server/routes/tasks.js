const express = require('express');
const Task = require('../models/Task');
const User = require('../models/User');
const Note = require('../models/Note');
const ActivityLog = require('../models/ActivityLog');
const requireAuth = require('../middleware/auth');
const logActivity = require('../utils/logActivity');
const notify = require('../utils/notify');

const router = express.Router();

const TASK_TYPES = ['daily', 'weekly'];
const EDITABLE_FIELDS = ['title', 'description', 'type', 'dueDate'];

function isAdmin(user) {
  return user.role === 'admin' || user.isSuperAdmin === true;
}

// Is this manager one of the employee's linked managers?
function managesEmployee(managerId, employee) {
  return (employee.managerIds || []).some((id) => String(id) === String(managerId));
}

async function canAccessTask(user, task) {
  if (isAdmin(user)) return true;
  if (String(task.assignedTo) === String(user._id)) return true;
  if (user.role === 'manager') {
    const employee = await User.findById(task.assignedTo);
    return employee && managesEmployee(user._id, employee);
  }
  return false;
}

router.post('/', requireAuth, async (req, res) => {
  try {
    if (!isAdmin(req.user) && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can create tasks' });
    }

    const { title, description, type, dueDate, assignedTo } = req.body;
    if (!title || !assignedTo) {
      return res.status(400).json({ error: 'Title and assignedTo are required' });
    }
    if (type && !TASK_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid task type' });
    }

    const employee = await User.findById(assignedTo);
    if (!employee || employee.role !== 'employee') {
      return res.status(400).json({ error: 'assignedTo must be a valid employee' });
    }
    if (!isAdmin(req.user) && !managesEmployee(req.user._id, employee)) {
      return res.status(403).json({ error: 'You can only assign tasks to your own team' });
    }

    const task = await Task.create({
      title,
      description: description || '',
      type: type || 'daily',
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

    await notify({
      recipientId: employee._id,
      type: 'task_assigned',
      message: `You've been assigned a new task: "${title}"`,
      taskId: task._id,
    });

    res.status(201).json({ task });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create task' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    let filter = {};

    if (isAdmin(req.user)) {
      if (req.query.employeeId) filter.assignedTo = req.query.employeeId;
    } else if (req.user.role === 'employee') {
      filter.assignedTo = req.user._id;
    } else if (req.user.role === 'manager') {
      if (req.query.employeeId) {
        const employee = await User.findById(req.query.employeeId);
        if (!employee || !managesEmployee(req.user._id, employee)) {
          return res.status(403).json({ error: 'Not your team member' });
        }
        filter.assignedTo = req.query.employeeId;
      } else {
        const teamIds = (await User.find({ managerIds: req.user._id }).select('_id')).map(
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

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (!(await canAccessTask(req.user, task))) {
      return res.status(403).json({ error: 'Not permitted to view this task' });
    }

    const notes = await Note.find({ linkedTaskId: task._id }).sort({ createdAt: -1 });

    let activity = [];
    if (isAdmin(req.user) || req.user.role === 'manager') {
      activity = await ActivityLog.find({ taskId: task._id }).sort({ timestamp: -1 });
    }

    res.json({ task, notes, activity });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load task' });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (!(await canAccessTask(req.user, task))) {
      return res.status(403).json({ error: 'Not permitted to edit this task' });
    }

    if (req.body.type !== undefined && !TASK_TYPES.includes(req.body.type)) {
      return res.status(400).json({ error: 'Invalid task type' });
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

    if (task.assignedBy) {
      await notify({
        recipientId: task.assignedBy,
        type: 'status_changed',
        message: `${req.user.name} changed "${task.title}" to ${status.replace('_', ' ')}`,
        taskId: task._id,
      });
    }

    res.json({ task });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update status' });
  }
});

module.exports = router;