const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: { type: String, required: true, trim: true },
    linkedTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    // If set, this note also updated the linked task's status at write time
    statusChangeApplied: {
      type: String,
      enum: ['pending', 'in_progress', 'done', null],
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Note', noteSchema);
