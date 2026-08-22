require('dotenv').config();

// Some networks/routers fail to resolve the DNS SRV record Atlas's
// mongodb+srv:// connection strings need, even though the network itself
// is fine (e.g. MongoDB Compass connects without issue). Forcing Node to
// use Google's public DNS for lookups works around that.
require('dns').setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const noteRoutes = require('./routes/notes');
const activityRoutes = require('./routes/activityLog');
const voiceMessageRoutes = require('./routes/voiceMessages');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'daybook-server' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/voice-messages', voiceMessageRoutes);

// Fallback 404 for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Daybook server running on port ${PORT}`);
  });
});
