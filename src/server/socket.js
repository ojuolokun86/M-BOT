const { Server } = require('socket.io');
const { getAllUserMetrics } = require('../database/models/metrics'); // Import the user metrics functions

let io; // WebSocket server instance
const userSockets = new Map(); // Map to store authId and socket ID

/**
 * Initialize the WebSocket server.
 * @param {Object} server - The HTTP server instance.
 */
const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: '*', // Allow all origins (adjust as needed for security)
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        console.log(`🔗 New WebSocket connection: ${socket.id}`);

        // Listen for authId from the client
        socket.on('authId', (authId) => {
            console.log(`📥 Received authId: ${authId} for socket: ${socket.id}`);
            userSockets.set(authId, socket.id); // Map authId to socket ID
            socket.join(authId); // Join the user to a room with their authId
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log(`❌ WebSocket disconnected: ${socket.id}`);
            userSockets.forEach((id, authId) => {
                if (id === socket.id) {
                    userSockets.delete(authId); // Remove the mapping on disconnect
                }
            });
        });
    });

    return io;
};

/**
 * Get the WebSocket server instance.
 * @returns {Object} The WebSocket server instance.
 */
const getSocketInstance = () => {
    if (!io) {
        throw new Error('Socket.io instance has not been initialized. Call initializeSocket first.');
    }
    return io;
};


module.exports = { initializeSocket, getSocketInstance, userSockets, };
