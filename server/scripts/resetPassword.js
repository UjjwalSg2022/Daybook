// Emergency/manual password reset, run directly against the database.
// There is no in-app "forgot password" flow by design (see PRD §6.1) - this
// script exists for the one case that flow can't cover: the Super Admin
// locking themselves out. Anyone with terminal + .env access can run this,
// so treat that access itself as the security boundary.
//
// Usage:
//   node scripts/resetPassword.js you@macintl.in aNewStrongPassword123
require('dotenv').config();
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function main() {
  const [, , email, newPassword] = process.argv;

  if (!email || !newPassword) {
    console.error('Usage: node scripts/resetPassword.js email newPassword');
    process.exit(1);
  }
  if (newPassword.length < 8) {
    console.error('Password must be at least 8 characters');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    console.error(`No user found with email ${email}.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  // Force a change on next login for anyone but the Super Admin resetting
  // their own account - keeps the "must change temp password" rule intact
  // for regular users while letting the admin set a real password directly.
  user.mustChangePassword = !user.isSuperAdmin;
  await user.save();

  console.log(`Password updated for ${user.email} (${user.role}${user.isSuperAdmin ? ', Super Admin' : ''}).`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to reset password:', err.message);
  process.exit(1);
});
