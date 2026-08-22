const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const VoiceMessage = require('../models/VoiceMessage');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'voice-messages');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB - a few minutes of speech

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Ignore whatever name the browser sends - generate our own to avoid
    // collisions and any path-traversal risk from a crafted filename.
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

// POST /api/voice-messages - manager records and sends a voice message to
// one of their linked employees. Employees cannot send - manager-to-employee
// only, by design.
router.post('/', requireAuth, upload.single('audio'), async (req, res) => {
  try {
    if (!req.user.isSuperAdmin && req.user.role !== 'manager') {
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
    if (!req.user.isSuperAdmin && String(employee.managerId) !== String(req.user._id)) {
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

// GET /api/voice-messages - inbox/sent list
//   employee -> messages sent to them (their inbox)
//   manager  -> messages they've sent (optionally ?employeeId= to filter to one)
router.get('/', requireAuth, async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'employee' && !req.user.isSuperAdmin) {
      filter.recipientId = req.user._id;
    } else {
      // manager or super admin viewing what they've sent
      filter.senderId = req.user.isSuperAdmin && req.query.senderId
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

// GET /api/voice-messages/:id/audio - stream the actual audio file.
// Only the sender or recipient (or Super Admin) may access it - this is
// personal audio, not something visible more broadly like task notes.
router.get('/:id/audio', requireAuth, async (req, res) => {
  try {
    const message = await VoiceMessage.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const isParty =
      String(message.senderId) === String(req.user._id) ||
      String(message.recipientId) === String(req.user._id);
    if (!isParty && !req.user.isSuperAdmin) {
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

// PATCH /api/voice-messages/:id/listened - recipient marks a message as
// listened. Lets the manager see it was actually heard.
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
