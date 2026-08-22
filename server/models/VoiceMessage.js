const mongoose = require('mongoose');

const voiceMessageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Stored filename on disk under uploads/voice-messages/ - never the
    // original client filename, to avoid path traversal / collisions
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    durationSeconds: { type: Number, default: null },
    listenedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VoiceMessage', voiceMessageSchema);
