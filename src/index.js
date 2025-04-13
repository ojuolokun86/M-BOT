const path = require('path');
const fs = require('fs');
const { fetchWhatsAppWebVersion } = require('./utils/AppWebVersion');
const { loadAllBotInstances, startNewUserSession, loadAllUserSessions } = require('./users/userSessionManager');
const { startAdminSession } = require('./users/adminSession'); // Use WA-JS for admin session
const { botInstances } = require('./utils/globalStore');
require('dotenv').config(); // Ensure dotenv is configured at the top of the file
const ADMIN_NUMBER = process.env.ADMIN_NUMBER; // Load ADMIN_NUMBER from .env
const { initializeUserSessions } = require('./initializeUserSessions')

if (!ADMIN_NUMBER) {
    console.error('❌ ADMIN_NUMBER is not defined in the environment variables.');
    process.exit(1); // Exit the process if ADMIN_NUMBER is missing
}
const MAX_RETRIES = 3; // Maximum number of retries for operations
const RETRY_DELAY = 5000; // Delay between retries in milliseconds

// Helper function to retry an async operation
const retryOperation = async (operation, description, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`🔄 Attempting: ${description} (Attempt ${attempt}/${retries})`);
            return await operation();
        } catch (error) {
            console.error(`❌ Error during: ${description} (Attempt ${attempt}/${retries})`, error);

            if (attempt < retries) {
                console.log(`⏳ Retrying in 5 seconds...`);
                await new Promise((resolve) => setTimeout(resolve, 5000));
            } else {
                console.error(`❌ Maximum retries reached for: ${description}`);
                throw error;
            }
        }
    }
};

const DOCUMENTS_BUCKET = 'documents'; // Replace with your Supabase bucket name
const ONE_HOUR_IN_MS = 60 * 60 * 1000; // 1 hour in milliseconds

// Schedule cleanup every hour
setInterval(() => {
    console.log('🗑️ Starting cleanup of old files in Supabase Storage...');
    deleteOldFilesFromSupabase(DOCUMENTS_BUCKET, ONE_HOUR_IN_MS);
}, ONE_HOUR_IN_MS);


(async () => {
    try {
        // Fetch the latest WhatsApp Web version
        const version = await fetchWhatsAppWebVersion('whiskeysockets');
        console.log(`✅ Using WhatsApp Web version: ${version}`);

        // Start the admin session with retry logic
        await retryOperation(async () => {
            if (!botInstances[ADMIN_NUMBER]) {
                await startAdminSession(version);
            } else {
                console.log(`ℹ️ Admin bot instance already exists. Skipping admin session initialization.`);
            }
        }, 'Starting admin session');
        console.log(`✅ Admin session initialized.`);

        /// Load all bot instances from the database with retry logic
                await retryOperation(async () => {
                    await loadAllBotInstances();
                }, 'Loading all bot instances');
                console.log(`✅ Loaded all bot instances from the database.`);
                        // Start user sessions

        await retryOperation(async () => {
            await initializeUserSessions(); // Load all user sessions from the database or local files
            console.log(`🤖 initialization for User Sessions.`);
        }, 'Loading all user sessions');
        console.log(`✅ All user sessions loaded successfully.`);
        for (const userId in botInstances) {
            if (userId !== ADMIN_NUMBER) {
                try {
                    const sessionPath = path.join('./sessions', userId); // Adjust the path as needed

                    // Check if the session exists locally
                    if (fs.existsSync(sessionPath)) {
                        console.log(`🔄 Loading session for existing user: ${userId}`);
                        
                    } else {
                        console.log(`🔄 Starting session for new user: ${userId}`);
                        await startNewUserSession(userId); // Start new user session
                    }
                } catch (error) {
                    console.error(`❌ Failed to initialize bot for user: ${userId}`, error);
                }
            }
        }
    } catch (error) {
        console.error('❌ Fatal error during bot initialization:', error);
        process.exit(1); // Exit the process if initialization fails
    }
})();