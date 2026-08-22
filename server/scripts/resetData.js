// Wipes all test/demo data while preserving one specific account (by email)
// - typically the Super Admin. Deletes every other User, and every Task,
// Note, and ActivityLog document, since those all reference Users anyway
// and would otherwise be left dangling.
//
// Usage:
//   node scripts/resetData.js ujjwal@macintl.in
//
// This asks for confirmation before deleting anything.
require('dotenv').config();
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const readline = require('readline');
const mongoose = require('mongoose');
const User = require('../models/User');
const Task = require('../models/Task');
const Note = require('../models/Note');
const ActivityLog = require('../models/ActivityLog');

function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}

async function main() {
  const [, , keepEmail] = process.argv;
  if (!keepEmail) {
    console.error('Usage: node scripts/resetData.js emailToKeep');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const keepUser = await User.findOne({ email: keepEmail.toLowerCase().trim() });
  if (!keepUser) {
    console.error(`No user found with email ${keepEmail} - nothing kept, aborting.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const otherUserCount = await User.countDocuments({ _id: { $ne: keepUser._id } });
  const taskCount = await Task.countDocuments({});
  const noteCount = await Note.countDocuments({});
  const activityCount = await ActivityLog.countDocuments({});

  console.log(`This will delete:`);
  console.log(`  ${otherUserCount} user(s) (everyone except ${keepUser.email})`);
  console.log(`  ${taskCount} task(s)`);
  console.log(`  ${noteCount} note(s)`);
  console.log(`  ${activityCount} activity log entr(y/ies)`);
  console.log(`Keeping: ${keepUser.email} (${keepUser.role}${keepUser.isSuperAdmin ? ', Super Admin' : ''})`);

  const ok = await confirm('Type "yes" to proceed: ');
  if (!ok) {
    console.log('Aborted - nothing was deleted.');
    await mongoose.disconnect();
    process.exit(0);
  }

  await Task.deleteMany({});
  await Note.deleteMany({});
  await ActivityLog.deleteMany({});
  await User.deleteMany({ _id: { $ne: keepUser._id } });

  console.log('Done. Only', keepUser.email, 'remains.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to reset data:', err.message);
  process.exit(1);
});
