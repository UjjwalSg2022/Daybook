const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['employee', 'manager', 'admin'],
      required: true,
    },
    isSuperAdmin: { type: Boolean, default: false },
    // An employee can report to more than one manager at once, so this is
    // an array rather than a single reference. Only meaningful for
    // role: 'employee' - always empty for managers/admin.
    managerIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    isSuperAdmin: this.isSuperAdmin,
    managerIds: this.managerIds,
    mustChangePassword: this.mustChangePassword,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);