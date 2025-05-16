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

    // Fetch subscription info
    const { data: token, error } = await supabase
        .from('subscription_tokens')
        .select('subscription_level, expiration_date')
        .eq('user_auth_id', authId)
        .single();

    if (error || !token) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    // Count current bots
    const { data: bots } = await supabase
        .from('users')
        .select('user_id')
        .eq('auth_id', authId);

    const botCount = bots ? bots.length : 0;

    // Set limits
    let maxBots = 1, months = 1;
    if (token.subscription_level === 'gold') { maxBots = 3; months = 2; }
    if (token.subscription_level === 'premium') { maxBots = 5; months = 3; }

    if (botCount >= maxBots) {
        return res.status(403).json({ error: `Your subscription (${token.subscription_level}) allows only ${maxBots} bot(s).` });
    }

    // Continue with registration...
    await startNewSession(phoneNumber, io, authId);
    return res.status(200).json({ message: 'Session started. Please scan the QR code.' });
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
