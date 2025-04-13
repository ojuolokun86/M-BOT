const initializeUserSessions = async () => {
    try {
        console.log('🔄 Initializing all user sessions...');
        const allSessions = await loadAllUserSessions(); // Load all user sessions from the database or local files
        console.log ('✅ All user sessions loaded.');
        for (const session of allSessions) {
            const { userId, sessionData } = session;

            try {
                console.log(`🔄 Starting session for user: ${userId}`);
                await startLoadedUserSession(userId, sessionData); // Start the session for each user
                console.log(`✅ Session started for user: ${userId}`);
            } catch (error) {
                console.error(`❌ Failed to start session for user: ${userId}`, error);
            }
        }

        console.log('✅ All user sessions initialized successfully.');
    } catch (error) {
        console.error('❌ Failed to initialize user sessions:', error);
    }
};

module.exports = { initializeUserSessions };