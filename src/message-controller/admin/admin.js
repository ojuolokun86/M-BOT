const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode-terminal');
const env = require('../../utils/loadEnv'); // Use the loadEnv utility
const { botInstances } = require('../../utils/globalStore'); // Import botInstances
const { getAdminMenu } = require('../../utils/menu')

const { 
    startNewUserSession,
    addUserToDatabaseAndFile, 
    deleteUserFromDatabaseAndFile, 
    manualSyncSupabaseToLocal 
} = require('../../users/userSessionManager'); // Import the required functions


const { 
    getAllBotInstances, 
    getAllUserSessions // Correctly import this function
} = require('../../database/userDatabase');

const ADMIN_NUMBER = env.ADMIN_NUMBER; // Load admin number from .env
const SESSIONS_DIR = path.join(__dirname, '../../../sessions'); // Correct path to the sessions directory
const BOT_NUMBERS_DIR = path.join(__dirname, '../../../bot_number'); // Directory for bot numbers
const LOGS_DIR = path.join(__dirname, '../../../logs'); // Path to the logs directory
const SESSION_ERRORS_LOG = path.join(LOGS_DIR, 'sessionErrors.log'); // Path to the sessionErrors.log file

// Ensure the sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR);
}

// Ensure the bot_number directory exists
if (!fs.existsSync(BOT_NUMBERS_DIR)) {
    fs.mkdirSync(BOT_NUMBERS_DIR);
}

// Ensure the logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR);
}

module.exports = async (sock, message) => {
    const remoteJid = message.key.remoteJid; // Chat ID
    const sender = message.key.participant || remoteJid; // Extract sender's ID
    const normalizedSender = sender.split('@')[0]; // Normalize sender's number
    const messageContent = message.message?.conversation || ''; // Message content



    console.log(`🔍 Extracted message content: "${messageContent}"`);
    // Debugging logs to compare normalizedSender and ADMIN_NUMBER
    console.log(`🔍 Debugging Admin Check:
        - Extracted Sender: ${sender}
        - Normalized Sender: ${normalizedSender}
        - Admin Number from .env: ${ADMIN_NUMBER}
        - Comparison Result: ${normalizedSender === ADMIN_NUMBER}
    `);

    // Compare normalized sender with ADMIN_NUMBER
    if (normalizedSender !== ADMIN_NUMBER) {
        console.log(`❌ Unauthorized command from: ${normalizedSender}`);
        await sock.sendMessage(remoteJid, { text: 'You are not authorized to use this command.' });
        return;
    }

    console.log(`✅ Authorized admin command from: ${normalizedSender}`);

    if (messageContent && messageContent.trim().toLowerCase().startsWith('cmd')) {
        const args = messageContent.trim().split(/\s+/); // Split the command into parts
        const subCommand = args[1]?.toLowerCase(); // Subcommand (e.g., "add", "delete", etc.)
        const subCommandArgs = args.slice(2); // Arguments for the subcommand
    
        console.log(`⚙️ Command received:
            - Command: ${args[0]}
            - Subcommand: ${subCommand}
            - Arguments: ${subCommandArgs.join(' ')}
        `);

        
        // Handle subcommands
        switch (subCommand) {
            case 'add':
                await handleAddUserCommand(sock, remoteJid, subCommandArgs);
                break;

            case 'delete':
                await handleDeleteCommand(sock, remoteJid, subCommandArgs);
                break;

            case 'list':
                await handleListCommand(sock, remoteJid);
                break;

            case 'status':
                await handleStatusCommand(sock, remoteJid);
                break;

            case 'pause':
                await handlePauseCommand(sock, remoteJid, subCommandArgs);
                break;

            case 'resume':
                await handleResumeCommand(sock, remoteJid, subCommandArgs);
                break;

            case 'menu':
                const menu = getAdminMenu();
                await sock.sendMessage(remoteJid, { text: menu });
                break;

            case 'instances':
                await handleInstancesCommand(sock, remoteJid);
                break;

            case 'sync':
                await handleSyncCommand(sock, remoteJid);
                break;

            case 'log':
                await handleLogCommand(sock, remoteJid);
                break;

            case 'clearall': // Add the new subcommand here
            await handleClearAllCommand(sock, remoteJid);
            break;

            default:
                console.log(`Unknown subcommand: ${subCommand}`);
                await sock.sendMessage(remoteJid, { text: `Unknown subcommand: ${subCommand}. Available subcommands: add, delete, list, status, pause, resume, menu, instances, sync, log.` });
                break;
        }
    } else {
        console.log('Invalid admin command.');
        await sock.sendMessage(remoteJid, { text: 'Invalid admin command. Use "cmd <subcommand>".' });
    }
};

// Handle the "add" subcommand
async function handleAddUserCommand(sock, remoteJid, args) {
    if (args.length !== 1) {
        await sock.sendMessage(remoteJid, { text: 'Usage: cmd add <phone_number>' });
        return;
    }

    const userNumber = args[0];
    const userSessionPath = path.join(SESSIONS_DIR, userNumber);

    // Check if the session already exists locally
    if (fs.existsSync(userSessionPath)) {
        await sock.sendMessage(remoteJid, { text: `⚠️ Session for ${userNumber} already exists locally.` });
        return;
    }

    // Check if the session already exists in the database
    try {
        const supabaseSessions = await getAllUserSessions();
        console.log('✅ Fetched user sessions from database:', supabaseSessions);

        const sessionExistsInDatabase = supabaseSessions.some((session) => session.user_id === userNumber);

        if (sessionExistsInDatabase) {
            await sock.sendMessage(remoteJid, { text: `⚠️ Session for ${userNumber} already exists in the database.` });
            return;
        }
    } catch (error) {
        console.error(`⚠️ Failed to check session existence in the database for user ${userNumber}.`, error);
    }

    console.log(`✅ Adding new user: ${userNumber}`);
    const adminSock = botInstances['admin']; // Get the admin socket instance

    // Save user to database and local file
    await addUserToDatabaseAndFile(userNumber);

    // Start a new user session
    await startNewUserSession(userNumber, adminSock);

    await sock.sendMessage(remoteJid, { text: `A QR code has been sent to ${userNumber}'s DM for login.` });
}

// Handle the "delete" subcommand
async function handleDeleteCommand(sock, remoteJid, args) {
    if (args.length !== 1) {
        await sock.sendMessage(remoteJid, { text: 'Usage: cmd delete <phone_number>' });
        return;
    }

    const userNumber = args[0];

    console.log(`✅ Deleting user: ${userNumber}`);

    // Delete user from database and local file
    await deleteUserFromDatabaseAndFile(userNumber);

    await sock.sendMessage(remoteJid, { text: `User ${userNumber} has been deleted from the system.` });
}

// Handle the "list" subcommand
async function handleListCommand(sock, remoteJid) {
    const sessionFolders = fs.readdirSync(SESSIONS_DIR);
    if (sessionFolders.length === 0) {
        await sock.sendMessage(remoteJid, { text: 'No active sessions found.' });
        return;
    }

    const sessionList = sessionFolders.join('\n');
    await sock.sendMessage(remoteJid, { text: `Active sessions:\n${sessionList}` });
}

// Handle the "status" subcommand
async function handleStatusCommand(sock, remoteJid) {
    console.log('📋 Executing "cmd status" subcommand...');
    const sessionFolders = fs.readdirSync(SESSIONS_DIR);

    if (sessionFolders.length === 0) {
        await sock.sendMessage(remoteJid, { text: 'No active sessions found.' });
        return;
    }

    let statusList = '';
    for (const userNumber of sessionFolders) {
        console.log(`🔍 Checking status for user: ${userNumber}`);

        // Fetch the bot instance for the user
        const botInstance = botInstances[userNumber];
        console.log(`🔍 Bot instance for ${userNumber}:`, botInstance ? 'Exists' : 'Does not exist');

        // Check if the bot instance exists and is connected
        const isConnected =
            botInstance &&
            botInstance.user && // Check if the bot instance has a valid user property
            botInstance.ev && // Check if the bot instance is actively handling events
            typeof botInstance.ev.emit === 'function'; // Ensure the event emitter is functional

        // Log detailed connection state
        if (botInstance) {
            console.log(`🔍 Bot instance details for ${userNumber}:`);
            console.log(`    - User: ${botInstance.user ? botInstance.user.id : 'No user'}`);
            console.log(`    - WebSocket State: ${botInstance.ws ? botInstance.ws.readyState : 'No WebSocket'}`);
        }

        statusList += `${userNumber}: ${isConnected ? 'Connected' : 'Logged Out'}\n`;
    }

    console.log('📋 Session statuses:', statusList);
    await sock.sendMessage(remoteJid, { text: `Session statuses:\n${statusList}` });
}
// Handle the "pause" subcommand
async function handlePauseCommand(sock, remoteJid, args) {
    if (args.length !== 1) {
        await sock.sendMessage(remoteJid, { text: 'Usage: cmd pause <phone_number>' });
        return;
    }

    const userNumber = args[0];
    const botInstance = botInstances[userNumber];

    if (!botInstance) {
        await sock.sendMessage(remoteJid, { text: `No active session found for ${userNumber}.` });
        return;
    }

    console.log(`🔄 Pausing session for ${userNumber}...`);

    // Close the WebSocket connection
    try {
        await botInstance.ws.close(); // Close the WebSocket connection
        console.log(`✅ WebSocket connection for ${userNumber} closed.`);
    } catch (error) {
        console.error(`❌ Failed to close WebSocket for ${userNumber}:`, error);
    }

    // Remove the bot instance from memory
    delete botInstances[userNumber];
    console.log(`✅ Bot instance for ${userNumber} removed from memory.`);

    // Rename the session folder to indicate it is paused
    const userSessionPath = path.join(SESSIONS_DIR, userNumber);
    const pausedSessionPath = `${userSessionPath}_paused`;

    if (fs.existsSync(userSessionPath)) {
        try {
            fs.renameSync(userSessionPath, pausedSessionPath);
            console.log(`✅ Session folder for ${userNumber} renamed to indicate pause.`);
        } catch (error) {
            console.error(`❌ Failed to rename session folder for ${userNumber}:`, error);
            await sock.sendMessage(remoteJid, { text: `Failed to pause session for ${userNumber}. Please try again later.` });
            return;
        }
    }

    await sock.sendMessage(remoteJid, { text: `Session for ${userNumber} has been paused.` });
}
// Handle the "resume" subcommand
async function handleResumeCommand(sock, remoteJid, args) {
    if (args.length !== 1) {
        await sock.sendMessage(remoteJid, { text: 'Usage: cmd resume <phone_number>' });
        return;
    }

    const userNumber = args[0];
    const pausedSessionPath = path.join(SESSIONS_DIR, `${userNumber}_paused`);
    const userSessionPath = path.join(SESSIONS_DIR, userNumber);

    // Check if the paused session exists
    if (!fs.existsSync(pausedSessionPath)) {
        await sock.sendMessage(remoteJid, { text: `Paused session for ${userNumber} does not exist.` });
        return;
    }

    console.log(`🔄 Resuming session for ${userNumber}...`);

    // Ensure no process is using the folder
    try {
        fs.accessSync(pausedSessionPath, fs.constants.R_OK | fs.constants.W_OK);
    } catch (error) {
        console.error(`❌ Folder ${pausedSessionPath} is in use or inaccessible:`, error);
        await sock.sendMessage(remoteJid, { text: `Failed to access paused session folder for ${userNumber}. Ensure it is not in use.` });
        return;
    }

    // Retry the rename operation if it fails
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            fs.renameSync(pausedSessionPath, userSessionPath);
            console.log(`✅ Session folder for ${userNumber} renamed back to its original name.`);
            break; // Exit the loop if the rename is successful
        } catch (error) {
            console.error(`❌ Failed to rename session folder (Attempt ${attempt}/${MAX_RETRIES}):`, error);

            if (attempt < MAX_RETRIES) {
                console.log(`⏳ Retrying in ${RETRY_DELAY / 1000} seconds...`);
                await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
            } else {
                await sock.sendMessage(remoteJid, { text: `Failed to resume session for ${userNumber}. Please try again later.` });
                return;
            }
        }
    }

    // Reinitialize the bot instance
    try {
        const { startNewUserSession } = require('../../users/userSessionManager'); // Import the function to start a new session
        const newBotInstance = await startNewUserSession(userNumber, sock);

        // Add the new bot instance to memory
        botInstances[userNumber] = newBotInstance;
        console.log(`✅ Bot instance for ${userNumber} reinitialized and added to memory.`);
    } catch (error) {
        console.error(`❌ Failed to reinitialize bot instance for ${userNumber}:`, error);
        await sock.sendMessage(remoteJid, { text: `Failed to resume session for ${userNumber}. Please try again later.` });
        return;
    }

    await sock.sendMessage(remoteJid, { text: `Session for ${userNumber} has been resumed.` });
}

// Handle the "instances" subcommand
async function handleInstancesCommand(sock, remoteJid) {
    console.log('📋 Fetching active bot instances...');
    try {
        // Fetch bot instances from the database
        const botInstancesFromDatabase = await getAllBotInstances();

        if (botInstancesFromDatabase.length === 0) {
            await sock.sendMessage(remoteJid, { text: 'No active bot instances found in the database.' });
            return;
        }

        // Format the list of bot instances
        const instanceList = botInstancesFromDatabase
            .map((instance) => `- User ID: ${instance.user_id}`)
            .join('\n');

        await sock.sendMessage(remoteJid, { text: `📋 Active Bot Instances:\n${instanceList}` });
        console.log('✅ Bot instances list sent.');
    } catch (error) {
        console.error('❌ Failed to fetch bot instances from the database.', error);
        await sock.sendMessage(remoteJid, { text: '❌ Failed to fetch bot instances from the database.' });
    }
}

// Handle the "sync" subcommand
async function handleSyncCommand(sock, remoteJid) {
    console.log('🔄 Performing manual sync from Supabase to local files...');
    try {
        await manualSyncSupabaseToLocal(sock);
        await sock.sendMessage(remoteJid, { text: '✅ Manual sync from Supabase to local files completed.' });
    } catch (error) {
        console.error('❌ Manual sync failed:', error);
        await sock.sendMessage(remoteJid, { text: '❌ Manual sync failed. Please check the logs for details.' });
    }
}

// Handle the "log" subcommand
async function handleLogCommand(sock, remoteJid) {
    console.log('📋 Fetching corrupted session logs...');
    try {
        // Check if the log file exists
        if (!fs.existsSync(SESSION_ERRORS_LOG)) {
            await sock.sendMessage(remoteJid, { text: '❌ No corrupted session logs found.' });
            console.log('❌ No sessionErrors.log file found.');
            return;
        }

        // Read the log file content
        const logContent = fs.readFileSync(SESSION_ERRORS_LOG, 'utf-8').trim();

        if (!logContent) {
            await sock.sendMessage(remoteJid, { text: 'ℹ️ The corrupted session log is empty.' });
            console.log('ℹ️ The sessionErrors.log file is empty.');
            return;
        }

        // Send the log content to the admin
        await sock.sendMessage(remoteJid, { text: `📋 Corrupted Session Logs:\n\n${logContent}` });
        console.log('✅ Corrupted session logs sent to the admin.');
    } catch (error) {
        console.error('❌ Failed to fetch corrupted session logs:', error);
        await sock.sendMessage(remoteJid, { text: '❌ Failed to fetch corrupted session logs. Please check the logs for details.' });
    }
}

async function handleClearAllCommand(sock, remoteJid) {
    console.log('⚠️ Executing "cmd clearall" subcommand...');
    const sessionFolders = fs.readdirSync(SESSIONS_DIR);

    if (sessionFolders.length === 0) {
        await sock.sendMessage(remoteJid, { text: 'No active sessions found to clear.' });
        return;
    }

    let deletedSessions = [];
    for (const userNumber of sessionFolders) {
        if (userNumber === ADMIN_NUMBER) {
            console.log(`⚠️ Skipping admin session: ${userNumber}`);
            continue;
        }

        console.log(`🗑️ Deleting session for user: ${userNumber}`);
        const userSessionPath = path.join(SESSIONS_DIR, userNumber);

        if (fs.existsSync(userSessionPath)) {
            fs.rmSync(userSessionPath, { recursive: true, force: true });
            console.log(`✅ Session folder for ${userNumber} deleted.`);
        }

        if (botInstances[userNumber]) {
            delete botInstances[userNumber];
            console.log(`✅ Bot instance for ${userNumber} removed from memory.`);
        }

        deletedSessions.push(userNumber);
    }

    await sock.sendMessage(remoteJid, { text: `✅ Cleared all user sessions except the admin's.\nDeleted sessions:\n${deletedSessions.join('\n')}` });
}