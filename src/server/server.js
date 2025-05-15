const express = require('express');
require('dotenv').config(); // Load environment variables
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');
const { startNewSession } = require('../users/userSession');
const { syncMemoryToSupabase, loadAllSessionsFromSupabase } = require('../database/models/supabaseAuthState');
const { deleteAllUsers } = require('../database/userDatabase');
const { router: adminRoutes,  emitLiveMetricsToAdmin } = require('./adminRoutes');
const authRoutes = require('./authRoutes');
const { getAllUserMetrics } = require('../database/models/metrics');
const { initializeSocket, } = require('./socket'); // Import the WebSocket initializer
const { router: userRoutes, } = require('./userRoutes'); // Import user routes and emitLiveMetrics
const validateToken = require('../middlewares/validateToken'); // Import the validateToken middleware
const { getCorsOptions } = require('./socket'); // Import the CORS options


const createServer = () => {
    const app = express();
    const server = http.createServer(app);

    // Initialize WebSocket server
    const io = initializeSocket(server);
    const corsOptions = getCorsOptions();
    // Middleware
    app.use(cors(corsOptions));

    app.use(bodyParser.json()); // Parse application/json
    app.use(bodyParser.urlencoded({ extended: true })); // Parse application/x-www-form-urlencoded

    // Routes
    app.use('/api/admin', adminRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/user', userRoutes);

    emitLiveMetricsToAdmin();

    // Serve static files (e.g., frontend)
    // app.use(express.static('public'));

    // Start a new session
    app.post('/api/start-session', validateToken, async (req, res) => {
    const { phoneNumber, authId } = req.body;

    console.log(`📥 Received phone number: ${phoneNumber}, auth_id: ${authId}`);

    if (!phoneNumber || !authId) {
        console.error('❌ Phone number or auth_id is missing in the request.');
        return res.status(400).json({ error: 'Phone number and auth_id are required.' });
    }

    try {
        await startNewSession(phoneNumber, io, authId); // Pass the WebSocket instance to startNewSession
        console.log(`✅ Session started for phone number: ${phoneNumber}`);
        return res.status(200).json({ message: 'Session started. Please scan the QR code.' });
    } catch (error) {
        console.error('❌ Error starting session:', error);
        return res.status(500).json({ error: 'Failed to start session.' });
    }
});

    // Delete all users
    app.delete('/api/delete-all-users', async (req, res) => {
        try {
            console.log('🗑️ Deleting all users...');
            await deleteAllUsers();
            console.log('✅ All users deleted successfully.');
            return res.status(200).json({ message: 'All users deleted successfully.' });
        } catch (error) {
            console.error('❌ Error deleting all users:', error);
            return res.status(500).json({ error: 'Failed to delete all users.' });
        }
    });

    // WebSocket connection
    io.on('connection', (socket) => {
        console.log('🔗 A client connected to WebSocket.');

        // Emit live metrics updates every 5 seconds
        const metricsInterval = setInterval(() => {
            const metrics = getAllUserMetrics();
            socket.emit('metrics-update', metrics); // Send metrics to the frontend
        }, 5000); // Adjust the interval as needed

        socket.on('disconnect', () => {
            console.log('❌ A client disconnected from WebSocket.');
            clearInterval(metricsInterval); // Stop emitting updates when the client disconnects
        });
    });

    // Start the server
    const PORT = process.env.PORT;
   server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server is running on http://0.0.0.0:${PORT}`);
});

};

// Load all sessions into memory on startup
loadAllSessionsFromSupabase();

// Auto-sync memory to Supabase every 6 hours
setInterval(() => {
    syncMemoryToSupabase();
}, 6 * 60 * 60 * 1000); // 6 hours in milliseconds

// Sync memory to Supabase on shutdown
process.on('SIGINT', async () => {
    console.log('🔄 Syncing memory to Supabase before shutdown...');
    await syncMemoryToSupabase();
    process.exit();
});

module.exports = { createServer };