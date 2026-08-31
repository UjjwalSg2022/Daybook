const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const VoiceMessage = require('../models/VoiceMessage');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

const router = express.Router();

function isAdmin(user) {
  return user.role === 'admin' || user.isSuperAdmin === true;
}

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'voice-messages');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = file.mimetype.includes('webm')
      ? '.webm'
      : file.mimetype.includes('ogg')
      ? '.ogg'
      : file.mimetype.includes('mp4') || file.mimetype.includes('m4a')
      ? '.m4a'
      : '.audio';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('audio/')) {
      return cb(new Error('Only audio files are allowed'));
    }
    cb(null, true);
  },
});

router.post('/', requireAuth, upload.single('audio'), async (req, res) => {
  try {
    if (!isAdmin(req.user) && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can send voice messages' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file received' });
    }

    const { recipientId, durationSeconds } = req.body;
    if (!recipientId) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'recipientId is required' });
    }

    const employee = await User.findById(recipientId);
    if (!employee || employee.role !== 'employee') {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'recipientId must be a valid employee' });
    }
    if (!isAdmin(req.user) && String(employee.managerId) !== String(req.user._id)) {
      fs.unlink(req.file.path, () => {});
      return res.status(403).json({ error: 'You can only message your own team' });
    }

    const message = await VoiceMessage.create({
      senderId: req.user._id,
      recipientId,
      filename: req.file.filename,
      mimeType: req.file.mimetype,
      durationSeconds: durationSeconds ? Number(durationSeconds) : null,
    });

    res.status(201).json({ message });
  } catch (err) {
    console.error(err);
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: err.message || 'Could not send voice message' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'employee' && !isAdmin(req.user)) {
      filter.recipientId = req.user._id;
    } else {
      filter.senderId = isAdmin(req.user) && req.query.senderId
        ? req.query.senderId
        : req.user._id;
      if (req.query.employeeId) filter.recipientId = req.query.employeeId;
    }

    const messages = await VoiceMessage.find(filter)
      .sort({ createdAt: -1 })
      .populate('senderId', 'name')
      .populate('recipientId', 'name');

    res.json({ messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load voice messages' });
  }
});

router.get('/:id/audio', requireAuth, async (req, res) => {
  try {
    const message = await VoiceMessage.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const isParty =
      String(message.senderId) === String(req.user._id) ||
      String(message.recipientId) === String(req.user._id);
    if (!isParty && !isAdmin(req.user)) {
      return res.status(403).json({ error: 'Not permitted to access this message' });
    }

    const filePath = path.join(UPLOAD_DIR, message.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file missing on server' });
    }

    res.setHeader('Content-Type', message.mimeType);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load audio' });
  }
});

router.patch('/:id/listened', requireAuth, async (req, res) => {
  try {
    const message = await VoiceMessage.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    if (String(message.recipientId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Only the recipient can mark this as listened' });
    }

    if (!message.listenedAt) {
      message.listenedAt = new Date();
      await message.save();
    }

    res.json({ message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update message' });
  }
});

module.exports = router;