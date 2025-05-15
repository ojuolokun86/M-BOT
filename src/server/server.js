const express = require('express');
require('dotenv').config();
const http = require('http');
const bodyParser = require('body-parser');
const cors = require('cors');

const { startNewSession } = require('../users/userSession');
const { syncMemoryToSupabase, loadAllSessionsFromSupabase } = require('../database/models/supabaseAuthState');
const { deleteAllUsers } = require('../database/userDatabase');

const { router: adminRoutes } = require('./adminRoutes');
const { router: userRoutes } = require('./userRoutes');
const authRoutes = require('./authRoutes');

const validateToken = require('../middlewares/validateToken');
const { initializeSocket, getCorsOptions } = require('./socket');

const createServer = () => {
  const app = express();
  const server = http.createServer(app);
  const io = initializeSocket(server);

  const corsOptions = getCorsOptions();
  app.use(cors(corsOptions));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.use('/api/admin', adminRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/user', userRoutes);

  // Start a new session
  app.post('/api/start-session', validateToken, async (req, res) => {
    const { phoneNumber, authId } = req.body;
    if (!phoneNumber || !authId) {
      return res.status(400).json({ error: 'Phone number and auth_id are required.' });
    }

    try {
      await startNewSession(phoneNumber, io, authId);
      return res.status(200).json({ message: 'Session started. Please scan the QR code.' });
    } catch (error) {
      console.error('❌ Error starting session:', error);
      return res.status(500).json({ error: 'Failed to start session.' });
    }
  });

  // Delete all users
  app.delete('/api/delete-all-users', async (req, res) => {
    try {
      await deleteAllUsers();
      return res.status(200).json({ message: 'All users deleted successfully.' });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete all users.' });
    }
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
};

// Background tasks
loadAllSessionsFromSupabase();
setInterval(() => syncMemoryToSupabase(), 6 * 60 * 60 * 1000);
process.on('SIGINT', async () => {
  console.log('🔄 Syncing memory to Supabase before shutdown...');
  await syncMemoryToSupabase();
  process.exit();
});

module.exports = { createServer };
