// One-time setup script. Run once when standing up a fresh database:
//   node scripts/createSuperAdmin.js "Your Name" you@macintl.in yourPassword123
//
// There is no UI for this and no other way to create the Admin account -
// there should only ever be exactly one, so this script refuses to run if
// an Admin already exists.
require('dotenv').config();
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function main() {
  const [, , name, email, password] = process.argv;

  if (!name || !email || !password) {
    console.error('Usage: node scripts/createSuperAdmin.js "Name" email password');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const existingAdmin = await User.findOne({
    $or: [{ role: 'admin' }, { isSuperAdmin: true }],
  });
  if (existingAdmin) {
    console.error(
      `An Admin account already exists (${existingAdmin.email}). Only one Admin is allowed.`
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    console.error(`A user with email ${email} already exists.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await User.create({
    name,
    email: email.toLowerCase().trim(),
    passwordHash,
    role: 'admin',
    isSuperAdmin: true,
    mustChangePassword: false,
  });

  console.log('Admin account created:');
  console.log(`  Name:  ${admin.name}`);
  console.log(`  Email: ${admin.email}`);
  console.log('You can log in with this email and the password you just set.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to create Admin account:', err.message);
  process.exit(1);
});