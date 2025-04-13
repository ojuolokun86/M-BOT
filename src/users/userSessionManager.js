const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { fetchWhatsAppWebVersion } = require('../utils/AppWebVersion');
const fs = require('fs');
const path = require('path');
const { generateQRCodeImage, deleteQRCodeImage } = require('../utils/qrcodeHandler'); // Import QR code handlers
const env = require('../utils/loadEnv'); // Import environment variables
const { botInstances, pendingUsernameRequests } = require('../utils/globalStore'); // Import the global botInstances object
const { addPendingUsernameRequest } = require('../message-controller/handleUserReply'); // Import addPendingUsernameRequest
const { saveGroupMode } = require('../bot/groupModeManager');
const { 
    addUser, 
    getAllUsers, 
    deleteUser, 
    saveUserSession, 
    getAllUserSessions, 
    deleteUserSession, 
    saveBotInstance, 
    getAllBotInstances,
    deleteBotInstance,
    updateUserTagFormat,
} = require('../database/userDatabase'); // Import database handlers
const crypto = require('crypto'); // Import crypto for generating unique IDs

const { deleteUserPrefix, updateUserPrefix  } = require('../database/userPrefix'); // Import deleteUserPrefix function
const supabase = require('../supabaseClient')

try {
    const crypto = require('crypto');
    console.log('✅ crypto module is available');
  } catch (e) {
    console.error('❌ crypto module is NOT available:', e.message);
  }
  


const ADMIN_NUMBER = env.ADMIN_NUMBER;
console.log(`✅ Admin number loaded: ${ADMIN_NUMBER}`);


const SESSIONS_DIR = path.join(__dirname, '../../sessions'); // Directory for user sessions
const BOT_NUMBERS_DIR = path.join(__dirname, '../../bot_number'); // Directory for bot numbers

// Ensure the sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR);
}

// Ensure the bot_number directory exists
if (!fs.existsSync(BOT_NUMBERS_DIR)) {
    fs.mkdirSync(BOT_NUMBERS_DIR);
}

// Dynamic import for initializeBot
let initializeBot;

const loadInitializeBot = () => {
    if (!initializeBot) {
        initializeBot = require('../bot/bot'); // Dynamically load the initializeBot function
        console.log('✅ initializeBot dynamically loaded');
    }
};



/**
 * Add a new user to both the database and local file.
 * @param {string} userId - The user's ID.
 */
const addUserToDatabaseAndFile = async (userId) => {
    const dateCreated = new Date().toISOString();

    // Check if the user already exists in the database
    try {
        const existingUsers = await getAllUsers();
        const userExists = existingUsers.some((user) => user.user_id === userId);

        if (userExists) {
            console.log(`⚠️ User ${userId} already exists in the database. Skipping database insertion.`);
        } else {
            // Save to Supabase
            await addUser(userId, dateCreated);
            console.log(`✅ User ${userId} saved to database.`);

            await updateUserPrefix(userId, '.');
            console.log(`✅ Default prefix (".") added for user ${userId}.`);

            
            // Set tagformat to "off" (false) for the user
            await updateUserTagFormat(userId, true);
            console.log(`✅ Tagformat set to "off" for user ${userId}.`);


            
            // Add default group mode for the user
            await saveGroupMode(userId, 'default_group', 'me'); // Default group ID placeholder
            console.log(`✅ Default group mode ("me") added for user ${userId}.`);
      
        
        }
    } catch (error) {
        console.error(`❌ Failed to check or save user ${userId} to database.`, error);
    }

    // Save to local file
    const userFile = path.join(BOT_NUMBERS_DIR, `${userId}.txt`);
    const fileContent = `User ID: ${userId}\nDate Created: ${dateCreated}\n`;
    fs.writeFileSync(userFile, fileContent);
    console.log(`✅ User ${userId} saved to local file: ${userId}.txt`);
};

/**
 * Save a user's session JSON data to both the database and local file.
 * @param {string} userId - The user's ID.
 * @param {object} sessionData - The user's session JSON data.
 */
const saveUserSessionToDatabaseAndFile = async (userId, sessionData) => {
    // Save to Supabase
    try {
        await saveUserSession(userId, sessionData);
    } catch (error) {
        console.error(`❌ Failed to save session for user ${userId} to database.`, error);
    }

    // Save to local file
    const sessionFilePath = path.join(SESSIONS_DIR, `${userId}.json`);
    fs.writeFileSync(sessionFilePath, JSON.stringify(sessionData, null, 2));
    console.log(`✅ Session for user ${userId} saved to local file: ${sessionFilePath}`);
};

/**
 * Start a new user session.
 * @param {string} userId - The user ID for the session.
 * @param {object} adminSock - The admin socket instance.
 */


const startNewUserSession  = async (userId) => {
    try {
        // Retrieve the admin socket instance from botInstance
        const adminSock = botInstances[ADMIN_NUMBER];
        console.log (`🔍 Retrieving admin socket instance for user ${userId}...`);
        if (!adminSock) {
            console.error(`❌ Admin socket instance not found. Cannot start session for user ${userId}.`);
            console.log('🔁 Queuing session initialization for user until admin socket is ready...');
            
            setTimeout(() => startUserSession(userId), 2000); // Retry after 2 seconds
            return;
        }
        loadInitializeBot(); // Load the initializeBot function

        const sessionPath = path.join(SESSIONS_DIR, userId);

        if (!fs.existsSync(sessionPath)) {
            console.log(`⚠️ Session for user ${userId} does not exist locally. Creating a new session folder.`);
        }

        const version = await fetchWhatsAppWebVersion('whiskeysockets');
        console.log(`✅ Using WhatsApp Web version (Whiskey): ${version}`);


        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        const sock = makeWASocket({
            browser: ['Techitoon', 'Chrome', '10.0'], // <== this is important
            version,
            auth: state,
        });

        sock.ev.on('creds.update', saveCreds);

        console.log(`✅ Bot instance created for user: ${userId}, waiting for registration to complete.`);

        let qrSent = false; // Track if the QR code has been sent
        let qrScanned = false; // Track if the QR code has been scanned
        let qrTimeout = null; // Track the QR code expiration timeout


        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            console.log('⚠️ Connection update:', update);

            // Handle QR code generation
            if (qr && !qrSent && !qrScanned) {
                qrSent = true;
                console.log(`📲 Generating QR code for user: ${userId}`);

                const qrImagePath = await generateQRCodeImage(qr, userId);
                const userJid = `${userId}@s.whatsapp.net`;

            
                await adminSock.sendMessage(userJid, {
                    text: `Hello! Please scan the QR code below to log in.`,
                });

                await adminSock.sendMessage(userJid, {
                    image: { url: qrImagePath },
                    caption: `QR Code for user: ${userId}`,
                });

                console.log(`✅ QR code sent to user: ${userId}`);

               // Set a timeout for QR code expiration
               qrTimeout = setTimeout(() => {
                if (!qrScanned) {
                    console.log(`⏳ QR code for user ${userId} has expired.`);
                    deleteQRCodeImage(userId);
                    qrSent = false; // Allow resending the QR code if needed
                }
            }, 20 * 60 * 1000); // 20 minutes
        }

            // Handle successful connection
            if (connection === 'open') {
                qrScanned = true;
                console.log(`✅ User ${userId} is now connected.`);

                // Clear the QR code expiration timeout
                if (qrTimeout) {
                    clearTimeout(qrTimeout);
                    qrTimeout = null;
                }


                try {
                    await saveUserSession(userId, state);
                    console.log(`✅ Session for user ${userId} saved to the database.`);
                } catch (error) {
                    console.error(`❌ Failed to save session for user ${userId} to the database.`, error);
                }

                try {
                    await saveBotInstance(userId, state);
                    console.log(`✅ Bot instance for user ${userId} saved to the database.`);
                } catch (error) {
                    console.error(`❌ Failed to save bot instance for user ${userId} to the database.`, error);
                }

                botInstances[userId] = sock;
                console.log(`✅ Bot instance for user ${userId} is now active.`);

                initializeBot(sock, userId);

                const userFilePath = path.join(BOT_NUMBERS_DIR, `${userId}.txt`);
                if (!fs.existsSync(userFilePath) || !fs.readFileSync(userFilePath, 'utf-8').includes('Username:')) {
                    console.log(`ℹ️ Username for user ${userId} not found. Prompting user for their username.`);

                    if (!pendingUsernameRequests.has(userId)) {
                        pendingUsernameRequests.add(userId);
                        console.log(`✅ User ${userId} added to pending username requests.`);
                    }

                    const userJid = `${userId}@s.whatsapp.net`;
                    await adminSock.sendMessage(userJid, {
                        text: `Welcome! Please reply with your username to complete your registration.`,
                    });

                    console.log(`✅ Username prompt sent from admin to user ${userId}.`);
                } else {
                    console.log(`✅ Username for user ${userId} already exists in ${userFilePath}. Skipping username prompt.`);
                }
            }
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const reason = lastDisconnect?.error?.message || 'Unknown';
            
                console.log(`❌ Connection closed for user ${userId}. Reason: ${reason}`);
                if (statusCode) {
                    console.log(`🔎 Status code: ${statusCode}`);
                }
            
                // Handle user logout
                if (lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut) {
                    console.log(`⚠️ User ${userId} has logged out. Deleting their session...`);
        
                    // Notify the admin
                    const adminJid = `${ADMIN_NUMBER}@s.whatsapp.net`;
                    try {
                        await adminSock.sendMessage(adminJid, {
                            text: `⚠️ User ${userId} has logged out. Their session has been deleted.`,
                        });
                        console.log(`✅ Admin notified about user ${userId} logout.`);
                    } catch (error) {
                        console.error(`❌ Failed to notify admin about user ${userId} logout.`, error);
                    }
        
                    // Delete the user's session
                    await deleteUserFromDatabaseAndFile(userId);
        
                    // Remove the user's bot instance from memory
                    delete botInstances[userId];
                    console.log(`✅ Bot instance for user ${userId} removed from memory.`);
        
                    return; // Stop further reconnection attempts
                }
        
                console.log(`🔄 Reconnecting user ${userId} in 5 seconds...`);
                setTimeout(() => startNewUserSession(userId), 5000);
            }
            
                
        });

        sock.ev.on('history.sync.complete', () => {
            console.log(`✅ History sync complete for user ${userId}. Bot is ready to process new messages.`);
        });

        // Save credentials on update
        sock.ev.on('creds.update', saveCreds);

        return sock;
    } catch (error) {
        console.error(`❌ Error in starting session for user ${userId}:`, error);
        await handleCorruptedSession(userId, error);
    }
};


const handleUserReply = async (sock, message) => {
    const userId = message.key.remoteJid.split('@')[0]; // Extract the user's ID
    const userReply = message.message?.conversation?.trim(); // Get the user's reply

    if (!userReply) {
        console.log(`⚠️ No reply received from user ${userId}.`);
        return;
    }

    console.log(`✅ Received username from user ${userId}: ${userReply}`);

    // Save the username to the bot_number folder
    const userFilePath = path.join(BOT_NUMBERS_DIR, `${userId}.txt`);
    const fileContent = `User ID: ${userId}\nUsername: ${userReply}\nDate Created: ${new Date().toISOString()}\n`;
    fs.writeFileSync(userFilePath, fileContent);
    console.log(`✅ Username for user ${userId} saved to ${userFilePath}.`);

    // Update the username in Supabase
    try {
        await supabase
            .from('users')
            .update({ username: userReply })
            .eq('user_id', userId);
        console.log(`✅ Username for user ${userId} updated in Supabase.`);
    } catch (error) {
        console.error(`❌ Failed to update username for user ${userId} in Supabase.`, error);
    }

    // Send a confirmation message to the user
    const userJid = `${userId}@s.whatsapp.net`;
    await sock.sendMessage(userJid, {
        text: `Thank you, ${userReply}! Your username has been saved.`,
    });

    // Remove the user from the pending username requests
    pendingUsernameRequests.delete(userId);
    console.log(`✅ User ${userId} removed from pending username requests.`);
};

/**
 * Load all bot instances from the database into memory.
 */
const loadAllBotInstances = async () => {
    try {
        const instances = await getAllBotInstances();
        for (const instance of instances) {
            const { user_id, instance_data } = instance;

            // Recreate the bot instance using the saved session data
            const { state, saveCreds } = await useMultiFileAuthState(path.join(SESSIONS_DIR, user_id));
            const sock = makeWASocket({
                version: (await fetchWhatsAppWebVersion()).version,
                auth: state,
            });

            // Store the bot instance in memory
            botInstances[user_id] = sock;
            console.log(`✅ Bot instance for user ${user_id} loaded into memory.`);

            // Save credentials on update
            sock.ev.on('creds.update', saveCreds);
        }
    } catch (error) {
        console.error('⚠️ Failed to load bot instances from database.', error);
    }
};
/**
 * Load all user sessions from the database or fallback to local files.
 * Sync any local sessions that are missing in the database.
 * @param {object} adminSock - The admin socket instance.
 * @returns {Promise<object[]>} - A list of all user sessions.
 */
const loadAllUserSessions = async (adminSock) => {
    let databaseSessions = [];
    try {
        const sessions = await getAllUserSessions();
        databaseSessions = sessions.map((session) => ({
            userId: session.user_id,
            sessionData: session.session_data,
        }));
        console.log(`✅ Loaded ${databaseSessions.length} user sessions from the database.`);
    } catch (error) {
        console.error('⚠️ Failed to load user sessions from database. Falling back to local files.', error);
    }

    // Load sessions from local files (including subfolders)
    const localSessions = [];
    const sessionFolders = fs.readdirSync(SESSIONS_DIR).filter((folder) => {
        const folderPath = path.join(SESSIONS_DIR, folder);
        return fs.statSync(folderPath).isDirectory(); // Check if it's a directory
    });

    for (const folder of sessionFolders) {
        const sessionFilePath = path.join(SESSIONS_DIR, folder, 'auth_info.json'); // Adjust file name if needed
        if (fs.existsSync(sessionFilePath)) {
            const sessionData = JSON.parse(fs.readFileSync(sessionFilePath, 'utf-8'));
            localSessions.push({ userId: folder, sessionData });
        }
    }

    // Check for users in Supabase but missing in local files
    const missingInLocal = databaseSessions.filter(
        (dbSession) => !localSessions.some((localSession) => localSession.userId === dbSession.userId)
    );

    if (missingInLocal.length > 0) {
        console.log(`⚠️ Found ${missingInLocal.length} users in Supabase but missing in local files.`);

        // // Send a log message to the admin's DM
        // const adminJid = `${ADMIN_NUMBER}@s.whatsapp.net`;
        // const missingUsersList = missingInLocal.map((session) => `- ${session.userId}`).join('\n');
        // const message = `⚠️ The following users are in Supabase but missing in local files:\n${missingUsersList}\n\nYou can sync them manually using the command:\n*cmd sync*`;

        // await adminSock.sendMessage(adminJid, { text: message });
    }

    // Sync local files to Supabase
    for (const localSession of localSessions) {
        if (!databaseSessions.some((dbSession) => dbSession.userId === localSession.userId)) {
            console.log(`🔄 Syncing session for user ${localSession.userId} from local file to database.`);
            await saveUserSession(localSession.userId, localSession.sessionData);
        }
    }

    // Send a log message to the admin's DM after auto-sync
    const syncedUsersList = localSessions
        .filter((localSession) => !databaseSessions.some((dbSession) => dbSession.userId === localSession.userId))
        .map((session) => `- ${session.userId}`)
        .join('\n');

    if (syncedUsersList.length > 0) {
        const adminJid = `${ADMIN_NUMBER}@s.whatsapp.net`;
        const syncMessage = `✅ Auto-sync completed. The following users were synced from local files to Supabase:\n${syncedUsersList}`;
        await adminSock.sendMessage(adminJid, { text: syncMessage });
    }

    // Combine database and local sessions
    const allSessions = [...databaseSessions, ...localSessions];

    // Start sessions for all loaded users
    for (const session of allSessions) {
        const { userId, sessionData } = session;
        await startLoadedUserSession(userId, sessionData);
    }

    console.log('✅ All user sessions loaded and started successfully.');
    return allSessions;

};

const manualSyncSupabaseToLocal = async (adminSock) => {
    console.log('🔄 Starting manual sync from Supabase to local files...');
    try {
        const databaseSessions = await getAllUserSessions();
        console.log('✅ Fetched sessions from Supabase:', databaseSessions);

        for (const session of databaseSessions) {
            const sessionFilePath = path.join(SESSIONS_DIR, `${session.user_id}.json`);
            if (!fs.existsSync(sessionFilePath)) {
                fs.writeFileSync(sessionFilePath, JSON.stringify(session.session_data, null, 2));
                console.log(`✅ Synced user ${session.user_id} to local file.`);
            } else {
                console.log(`ℹ️ Session for user ${session.user_id} already exists locally.`);
            }
        }

        console.log('✅ Manual sync completed successfully.');
    } catch (error) {
        console.error('❌ Error during manual sync:', error);
        throw error;
    }
};

/**
 * Delete a user from both the database and local files.
 * @param {string} userId - The user's ID to delete.
 */
const deleteUserFromDatabaseAndFile = async (userId) => {
    try {
        // Delete the user from the `users` table
        await deleteUser(userId);
        console.log(`✅ User ${userId} deleted from the database.`);

        // Delete the user's session from the `user_sessions` table
        await deleteUserSession(userId);
        console.log(`✅ Session for user ${userId} deleted from the database.`);

        // Delete the user's bot instance from the `bot_instances` table
        await deleteBotInstance(userId);
        console.log(`✅ Bot instance for user ${userId} deleted from the database.`);

        
        // Delete the user's prefix from the `user_prefixes` table
        await deleteUserPrefix(userId);
        console.log(`✅ Prefix for user ${userId} deleted from the database.`);
        
        // Delete all group modes associated with the user
        const { data, error } = await supabase
            .from('group_modes')
            .delete()
            .eq('user_id', userId);

        if (error) {
            console.error(`❌ Failed to delete group modes for user ${userId}:`, error);
        } else {
            console.log(`✅ Group modes for user ${userId} deleted from the database.`);
        }
 
    } catch (error) {
        console.error(`❌ Failed to delete user ${userId} from the database.`, error);
    }

    // Delete the user's session folder
    const sessionFolderPath = path.join(SESSIONS_DIR, userId);
    if (fs.existsSync(sessionFolderPath)) {
        fs.rmSync(sessionFolderPath, { recursive: true, force: true }); // Delete the entire folder
        console.log(`✅ Session folder for user ${userId} deleted.`);
    } else {
        console.log(`⚠️ Session folder for user ${userId} does not exist.`);
    }

    // Delete the user's local file
    const userFilePath = path.join(BOT_NUMBERS_DIR, `${userId}.txt`);
    if (fs.existsSync(userFilePath)) {
        fs.unlinkSync(userFilePath);
        console.log(`✅ Local file for user ${userId} deleted.`);
    } else {
        console.log(`⚠️ Local file for user ${userId} does not exist.`);
    }
};

/**
 * Sync users from local files (bot_number) to the Supabase `users` table.
 */
const syncUsersToSupabase = async () => {
    console.log('🔄 Starting sync of users from local files to Supabase...');

    // Fetch all users from Supabase
    let databaseUsers = [];
    try {
        databaseUsers = await getAllUsers();
        console.log(`✅ Loaded ${databaseUsers.length} users from Supabase.`);
    } catch (error) {
        console.error('❌ Failed to fetch users from Supabase.', error);
        return;
    }

    // Get user IDs from local files
    const localUsers = [];
    const userFiles = fs.readdirSync(BOT_NUMBERS_DIR).filter((file) => file.endsWith('.txt')); // Get all .txt files
    for (const file of userFiles) {
        const userId = path.basename(file, '.txt'); // Extract user ID from file name
        localUsers.push(userId);
    }

    // Check for users in local files but missing in Supabase
    const missingUsers = localUsers.filter(
        (localUserId) => !databaseUsers.some((dbUser) => dbUser.user_id === localUserId)
    );

    if (missingUsers.length > 0) {
        console.log(`⚠️ Found ${missingUsers.length} users in local files but missing in Supabase.`);

        for (const userId of missingUsers) {
            const filePath = path.join(BOT_NUMBERS_DIR, `${userId}.txt`);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const dateCreatedMatch = fileContent.match(/Date Created: (.+)/); // Extract date created from file
            const dateCreated = dateCreatedMatch ? dateCreatedMatch[1] : new Date().toISOString();

            // Add the user to Supabase
            try {
                await addUser(userId, dateCreated);
                console.log(`✅ User ${userId} synced to Supabase.`);
            } catch (error) {
                console.error(`❌ Failed to sync user ${userId} to Supabase.`, error);
            }
        }
    } else {
        console.log('✅ All users in local files are already synced with Supabase.');
    }
};

const startLoadedUserSession = async (userId, sessionData) => {
    try {
        console.log(`🔄 Starting session for loaded user: ${userId}`);
         // Dynamically load initializeBot
         loadInitializeBot();

        const sessionPath = path.join(SESSIONS_DIR, userId);
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        const sock = makeWASocket({
            browser: ['Techitoon', 'Chrome', '10.0'],
            version: await fetchWhatsAppWebVersion('whiskeysockets'),
            auth: state,
        });

        // Save credentials on update
        sock.ev.on('creds.update', saveCreds);

        console.log(`✅ Bot instance created for user: ${userId}`);

        // Attach event listeners
        initializeBot(sock, userId);
        console.log(`✅ Event listeners attached for user: ${userId}`);

        // Save the bot instance in memory
        botInstances[userId] = sock;

        // Handle connection updates
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                console.log(`✅ User ${userId} is now connected.`);
            }

            if (connection === 'close') {
                const reason = lastDisconnect?.error?.message || 'Unknown';
                console.log(`❌ Connection closed for user ${userId}. Reason: ${reason}`);

                // Handle user logout
                if (lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut) {
                    console.log(`⚠️ User ${userId} has logged out. Deleting their session...`);
                    await deleteUserFromDatabaseAndFile(userId);
                    delete botInstances[userId];
                    console.log(`✅ Bot instance for user ${userId} removed from memory.`);
                    return;
                }

                console.log(`🔄 Reconnecting user ${userId} in 5 seconds...`);
                setTimeout(() => startLoadedUserSession(userId, sessionData), 5000);
            }
        });

        console.log(`✅ Session started for user: ${userId}`);
    } catch (error) {
        console.error(`❌ Failed to start session for user ${userId}:`, error);
    }
};

module.exports = {
    startNewUserSession,
    loadAllBotInstances,
    loadAllUserSessions,
    addUserToDatabaseAndFile,
    saveUserSessionToDatabaseAndFile,
    manualSyncSupabaseToLocal,
    deleteUserFromDatabaseAndFile,
    syncUsersToSupabase,
    handleUserReply,
};