const { botInstances, antideleteSettings } = require('../utils/globalStore'); // Import the global botInstances object
const { getUserPrefix, updateUserPrefix } = require('../database/userPrefix'); // Import prefix functions
const { handleSettingsCommand } = require('./settingsCommad'); // Import the settings command handler
const { handleGeneralCommand } = require('./generalCommand'); // Import general command handler
const { sendReaction } = require('../utils/messageUtils'); // Import the sendReaction function
const { handleGroupCommand } = require('./groupCommand'); // Import group command handler
const { sendToChat } = require('../utils/messageUtils'); // Import message utility functions
const env = require('../utils/loadEnv'); // Load environment variables
const { normalizeUserId } = require('../utils/normalizeUserId'); // Import the normalization function
const { getGroupMode, setGroupMode } = require('../bot/groupModeManager'); // Import setGroupMode
const { updateUserMetrics } = require('../database/models/metrics'); // Import the user metrics functions





const ADMIN_NUMBER = env.ADMIN_NUMBER; // Load the admin number from .env

const handleCommand = async (sock, message, userId, authId, messageContent) => {
    const startTime = Date.now(); // Start timing the command
    try {
        const remoteJid = message.key.remoteJid; // Chat ID
        const isGroup = remoteJid.endsWith('@g.us'); // Check if the message is from a group
        const sender = message.key.participant || remoteJid; // Sender's ID
        const normalizedSender = normalizeUserId(sender); // Normalize sender's number
        const normalizedUserId = normalizeUserId(userId); // Normalize bot owner's ID
        const botLid = sock.user?.lid ? sock.user.lid.split(':')[0].split('@')[0] : null; // Fetch and normalize bot's LID
        const botOwnerIds = [normalizedUserId || botLid]; // Include both `id` and `lid`
        if (!botLid) {
            console.error('❌ Bot LID is undefined. Cannot proceed with command handling.');
            return;
        }
        // Correctly identify the real sender
        const realSender = isGroup ? normalizedSender : (message.key.fromMe ? userId : normalizedSender);

        console.log(`🔍 Normalized Sender: ${normalizedSender}, Real Sender: ${realSender}`);
        console.log(`🔍 Bot Owner IDs: ${botOwnerIds}`);

        // Retrieve the correct bot instance
        const botInstance = botInstances[userId];

        if (!botInstance || typeof botInstance.sendMessage !== 'function') {
            console.error(`❌ Invalid botInstance for user: ${userId}. Expected a valid WhatsApp socket instance.`);
            return;
        }

        // Fetch the user's prefix from Supabase
        const userPrefix = await getUserPrefix(userId); // Ensure this is initialized before use
        console.log(`🔍 Current prefix for user ${userId}: "${userPrefix}"`);

        // Extract the command and arguments
        const args = messageContent.slice(userPrefix.length).trim().split(/\s+/); // Split command and arguments
        const command = args.shift().toLowerCase(); // Extract the command
        
        console.log(`⚙️ Command received:
            - Command: ${command}
            - Arguments: ${args.join(' ')}
            - Sender: ${realSender}
            - Receiver (Bot Instance): ${normalizedUserId}
            - Content: ${messageContent}
            - Group: ${isGroup ? remoteJid : 'Direct Message'}
        `);

        // Send a reaction for the command
        await sendReaction(sock, remoteJid, message.key.id, command);
        console.log(`✅ Reaction sent for command "${command}" in ${remoteJid}`);
                        // Restrict all commands to the bot owner
    if (realSender !== normalizedUserId && realSender !== botLid) {
        await sendToChat(botInstance, remoteJid, {
            message: `❌ Only the bot owner can use this command.`,
        });
        return;
    }
    
    // Handle specific commands
    switch (command) {
        case 'poll':
            case 'endpoll':
            case 'announce':
            case 'tagall':
            case 'admin':
            case 'add':
            case 'kick':
            case 'promote':
            case 'demote':
            case 'kickall':
            case 'group':
            case 'antilink':
            case 'welcome':
            case 'setwelcome':
            case 'warn':
            case 'resetwarn':
            case 'listwarn':
            case 'warncount':
            case 'clear':
            case 'mute':
            case 'unmute':
            case 'create':
            case 'destroy':
            case 'delete':
            case 'leave':
                console.log(`📢 Routing "${command}" to groupCommand.js...`);
                const handled = await handleGroupCommand(sock, userId, message, command, args, sender, null, botInstance, true);
                if (handled) {
                    return; // Exit if the command was handled
                } else {
                    console.log(`❌ Command "${command}" was not handled by groupCommand.js.`);
                }
                break;
           // Handle general commands
            case 'ping':
                case 'menu':
                case 'info':
                case 'about':
                case 'prefix':
                case 'restart':
                case 'tagformat':
                case 'setmode':
                case 'antidelete':
                case 'status':
                case 'view':
                    console.log(`📜 Routing "${command}" to generalCommand.js...`);
                    const generalHandled = await handleGeneralCommand(sock, message, command, args, userId, remoteJid, botInstance, realSender, botOwnerIds, normalizedUserId, botLid);
                    if (generalHandled) {
                        return; // Exit if the command was handled
                    } else {
                        console.log(`❌ Command "${command}" was not handled by generalCommand.js.`);
                    }
                    break;
                    
            

            case 'settings':
            case 'setpic': // Route specific settings commands to settingsCommand.js
            case 'setname':
            case 'presence':
            case 'setstatus':
            case 'seen':
        console.log(`⚙️ Routing "${command}" to settingsCommand.js...`);
        await handleSettingsCommand(sock, message, remoteJid, userId, command, args, botInstance, realSender, normalizedUserId, botLid);
        return; // Exit after handling settings commands
            default:
            console.log(`❓ Unknown command: "${command}". Ignoring...`);
            await sendToChat(botInstance, remoteJid, { message: `Unknown command: ${command}` });
            return; // Exit if the command is unknown
    }
        } catch (error) {
            console.error(`❌ Error handling command for user ${userId}:`, error);
        } finally {
            const endTime = Date.now(); // End timing the command
            const timeTaken = endTime - startTime;
    
            console.log(`⏱️ Calculated command processing time for user ${userId}: ${timeTaken}ms.`); // Debug log
    
            // Save the time delay for the user
            updateUserMetrics(userId, authId, { commandProcessingTime: timeTaken });
    
            console.log(`⏱️ Command handling for user ${userId} took ${timeTaken}ms.`); // Debug log
        }};

module.exports = { handleCommand };