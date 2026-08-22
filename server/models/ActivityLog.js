const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    action: {
      type: String,
      enum: ['created', 'edited', 'status_changed', 'note_added'],
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Free-form detail, e.g. { field: 'title', from: 'old', to: 'new' }
    // or { from: 'pending', to: 'in_progress' } for status changes
    detail: { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
