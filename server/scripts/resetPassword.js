// Emergency/manual password reset, run directly against the database.
// There is no in-app "forgot password" flow by design (see PRD §6.1) - this
// script exists for the one case that flow can't cover: the Super Admin
// locking themselves out, or any user who needs a fresh password issued.
//
// Usage:
//   node scripts/resetPassword.js you@macintl.in aNewStrongPassword123
//
// By default this forces a change on next login for non-admin users. To set
// a FINAL password directly - e.g. seeding known test/demo credentials, or
// simply issuing someone a password they'll keep using as-is - add "final"
// as a third argument:
//   node scripts/resetPassword.js you@macintl.in aNewStrongPassword123 final
require('dotenv').config();
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function main() {
  const [, , email, newPassword, mode] = process.argv;

  if (!email || !newPassword) {
    console.error('Usage: node scripts/resetPassword.js email newPassword [final]');
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
  user.mustChangePassword = mode === 'final' ? false : !user.isSuperAdmin;
  await user.save();

  console.log(`Password updated for ${user.email} (${user.role}${user.isSuperAdmin ? ', Super Admin' : ''}).`);
  console.log(`Must change on next login: ${user.mustChangePassword}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to reset password:', err.message);
  process.exit(1);
});