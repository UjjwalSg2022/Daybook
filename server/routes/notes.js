const express = require('express');
const Note = require('../models/Note');
const Task = require('../models/Task');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');
const logActivity = require('../utils/logActivity');

const router = express.Router();

function isAdmin(user) {
  return user.role === 'admin' || user.isSuperAdmin === true;
}

router.post('/', requireAuth, async (req, res) => {
  try {
    if (!isAdmin(req.user) && req.user.role !== 'employee') {
      return res.status(403).json({ error: 'Only employees write notes' });
    }

    const { text, linkedTaskId, statusChange } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Note text is required' });
    }

    let task = null;
    if (linkedTaskId) {
      task = await Task.findById(linkedTaskId);
      if (!task) return res.status(404).json({ error: 'Linked task not found' });
      if (String(task.assignedTo) !== String(req.user._id)) {
        return res.status(403).json({ error: 'Can only link notes to your own tasks' });
      }
    }

    let appliedStatus = null;
    if (statusChange && task) {
      if (!['pending', 'in_progress', 'done'].includes(statusChange)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      if (statusChange !== task.status) {
        const from = task.status;
        task.status = statusChange;
        await task.save();
        appliedStatus = statusChange;

        await logActivity({
          taskId: task._id,
          action: 'status_changed',
          performedBy: req.user._id,
          detail: { from, to: statusChange, viaNote: true },
        });
      }
    }

    const note = await Note.create({
      authorId: req.user._id,
      text: text.trim(),
      linkedTaskId: linkedTaskId || null,
      statusChangeApplied: appliedStatus,
    });

    if (task) {
      await logActivity({
        taskId: task._id,
        action: 'note_added',
        performedBy: req.user._id,
        detail: { noteId: note._id },
      });
    }

    res.status(201).json({ note, task });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create note' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    let authorId;

    if (req.user.role === 'employee' && !isAdmin(req.user)) {
      authorId = req.user._id;
    } else {
      if (!req.query.employeeId) {
        return res.status(400).json({ error: 'employeeId is required' });
      }
      const employee = await User.findById(req.query.employeeId);
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      if (!isAdmin(req.user) && String(employee.managerId) !== String(req.user._id)) {
        return res.status(403).json({ error: 'Not your team member' });
      }
      authorId = employee._id;
    }

    const notes = await Note.find({ authorId }).sort({ createdAt: -1 });
    res.json({ notes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load notes' });
  }
});

module.exports = router;