const { botInstances, restartQueue, intentionalRestarts } = require('../utils/globalStore');
const { updateUserMetrics } = require('../database/models/metrics');

/**
 * Restart the user's bot instance.
 * @param {string} userId - The user's phone number.
 * @param {string} remoteJid - The chat ID where the restart command was used.
 * @param {string} authId - The user's authentication ID.
 */
const restartUserBot = async (userId, remoteJid, authId) => {
    const startTime = Date.now();

    try {
        console.log(`🔄 Restarting bot for user: ${userId}, authId: ${authId}`);

        const botInstance = botInstances[userId];

        // Add the remoteJid to the restart queue
        restartQueue[userId] = remoteJid;

        // Mark this user for intentional restart to prevent reconnection during shutdown
        intentionalRestarts.add(userId);

        // Close the user's WebSocket connection
        console.log(`❌ Closing connection for user: ${userId}`);
        if (botInstance && botInstance.sock && botInstance.sock.ws) {
            botInstance.disconnectReason = 'intentional';
            await botInstance.sock.ws.close();
            delete botInstances[userId];
        }

        // Start a new session
        const { startNewSession } = require('../users/userSession');
        console.log(`🔄 Starting a new session for user: ${userId}, authId: ${authId}`);
        await startNewSession(userId, null, authId);

        const endTime = Date.now();
        const timeTaken = endTime - startTime;

        console.log(`✅ Bot restarted successfully for user: ${userId} in ${timeTaken}ms.`);
        return true;

    } catch (error) {
        console.error(`❌ Failed to restart bot for user: ${userId}`, error);
        return false;
    }
};

module.exports = { restartUserBot, restartQueue };
