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
      enum: ['employee', 'manager'],
      required: true,
    },
    // Hidden super-admin flag. Never exposed in any list/admin UI -
    // only set directly via scripts/createSuperAdmin.js
    isSuperAdmin: { type: Boolean, default: false },
    // Only relevant for employees - who they report to
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Never leak the password hash or internal flags to API responses
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    managerId: this.managerId,
    mustChangePassword: this.mustChangePassword,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
