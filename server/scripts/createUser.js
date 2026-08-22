// Run by the Super Admin to create an employee or manager account.
// A random temporary password is generated and printed once - it is not
// stored anywhere in plaintext, and there is no way to retrieve it later.
// If someone forgets their password, re-run this script logic manually
// (a future admin-only "reset password" script can reuse this same helper).
//
// Usage:
//   node scripts/createUser.js "Jane Doe" jane@macintl.in employee
//   node scripts/createUser.js "Sam Manager" sam@macintl.in manager
//   node scripts/createUser.js "Jane Doe" jane@macintl.in employee sam@macintl.in
//                                                            ^ optional: manager's email to link
require('dotenv').config();
// Same DNS workaround as server.js - some networks fail to resolve the
// mongodb+srv:// SRV record even though the network itself is fine.
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

function generateTempPassword() {
  // Readable-ish random password, e.g. "k3f9-m2pq-7htx"
  return crypto.randomBytes(6).toString('hex').match(/.{1,4}/g).join('-');
}

async function main() {
  const [, , name, email, role, managerEmail] = process.argv;

  if (!name || !email || !role || !['employee', 'manager'].includes(role)) {
    console.error(
      'Usage: node scripts/createUser.js "Name" email <employee|manager> [managerEmail]'
    );
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    console.error(`A user with email ${email} already exists.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  let managerId = null;
  if (role === 'employee') {
    if (!managerEmail) {
      console.error('Creating an employee requires a managerEmail argument.');
      await mongoose.disconnect();
      process.exit(1);
    }
    const manager = await User.findOne({ email: managerEmail.toLowerCase().trim() });
    if (!manager || manager.role !== 'manager') {
      console.error(`No manager found with email ${managerEmail}.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    managerId = manager._id;
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const user = await User.create({
    name,
    email: email.toLowerCase().trim(),
    passwordHash,
    role,
    managerId,
    mustChangePassword: true,
  });

  console.log('User created:');
  console.log(`  Name:  ${user.name}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Role:  ${user.role}`);
  console.log(`  Temporary password: ${tempPassword}`);
  console.log('Share this password with them directly - it will not be shown again.');
  console.log('They will be required to change it on first login.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to create user:', err.message);
  process.exit(1);
});
