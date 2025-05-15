const { Server } = require('socket.io');
const { getAllUserMetrics } = require('../database/models/metrics');

let io;
const userSockets = new Map();

const allowedOrigins = [
  'http://127.0.0.1:8080',  // local dev frontend
  'https://your-frontend-domain.com', // production frontend
];

const getCorsOptions = () => ({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
  credentials: true,
});

const corsOptions = getCorsOptions();

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: corsOptions,
  });

  io.on('connection', (socket) => {
    console.log(`🔗 New WebSocket connection: ${socket.id}`);

    socket.on('authId', (authId) => {
      console.log(`📥 Received authId: ${authId} for socket: ${socket.id}`);
      userSockets.set(authId, socket.id);
      socket.join(authId);
    });

    // Live metrics for admin (optional, if needed)
    const metricsInterval = setInterval(() => {
      const metrics = getAllUserMetrics();
      socket.emit('metrics-update', metrics);
    }, 5000);

    socket.on('disconnect', () => {
      console.log(`❌ WebSocket disconnected: ${socket.id}`);
      for (const [authId, id] of userSockets.entries()) {
        if (id === socket.id) userSockets.delete(authId);
      }
      clearInterval(metricsInterval);
    });
  });

  return io;
};

const getSocketInstance = () => {
  if (!io) {
    throw new Error('Socket.io instance not initialized.');
  }
  return io;
};

module.exports = { initializeSocket, getSocketInstance, userSockets, getCorsOptions };
