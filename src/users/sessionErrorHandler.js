const { botInstances } = require('../utils/globalStore'); // Import global botInstances
const env = require('../utils/loadEnv'); // Import environment variables
const ADMIN_NUMBER = env.ADMIN_NUMBER; // Load admin number from .env

/**
 * Handle a corrupted session for a user.
 * @param {string} userId - The user's ID whose session is corrupted.
 * @param {Error} error - The error object for the corrupted session.
 */
const handleCorruptedSession = async (userId, error) => {
    console.error(`❌ Corrupted session detected for user: ${userId}`, error);

    // Log the error to a file
    const fs = require('fs');
    const path = require('path');
    const logFilePath = path.join(__dirname, '../../logs/sessionErrors.log');
    const logMessage = `[${new Date().toISOString()}] User ID: ${userId}, Error: ${error.message}\n`;
    fs.appendFileSync(logFilePath, logMessage);
    console.log(`📄 Logged corrupted session for user ${userId} to sessionErrors.log.`);

    // Notify the admin about the corrupted session
    // Retrieve the admin socket instance from botInstances
     const adminSock = botInstances[ADMIN_NUMBER];
         if (!adminSock) {
            console.error(`❌ Admin socket instance not found. Cannot start session for user ${userId}.`);
            return;
         }
    if (adminSock) {
        const adminJid = `${ADMIN_NUMBER}@s.whatsapp.net`;
        await adminSock.sendMessage(adminJid, {
            text: `⚠️ Corrupted session detected for user: ${userId}. Please check the logs for more details.`,
        });
        console.log(`✅ Notified admin about the corrupted session for user: ${userId}.`);
    } else {
        console.error(`❌ Admin bot instance is not available. Unable to notify admin about the corrupted session.`);
    }
};

module.exports = { handleCorruptedSession };