const { botInstances, antideleteSettings } = require('../utils/globalStore'); // Import the global botInstances object
const { handleCommand } = require('./cmdHandler'); // Import the command handler
const handleAdminCommand = require('./admin/admin'); // Import the admin command handler
const { getGroupMode } = require('../bot/groupModeManager'); // Import the group mode manager
const { getUserPrefix } = require('../database/userPrefix'); // Import the prefix functions
const env = require('../utils/loadEnv'); // Import environment variables
const { handleMediaFile } = require('../utils/mediaFile'); // Correctly import the media file handler
const { handleUserReply, pendingUsernameRequests } = require('./handleUserReply'); // Import user reply handler
const { saveTextMessageToDatabase, handleAntidelete, setChatAntidelete  } = require('./antidelete'); // Import antidelete functions
const { groupMessages } = require('../utils/globalStore'); // Import the global group messages object
const { handleAntiLink } = require('./antilink'); // Import anti-link handler
const { normalizeUserId } = require('../utils/normalizeUserId'); // Import the normalize function
const { handleViewOnceMessage } = require('./viewonce'); // Import view once message handler
const { handleStatusUpdate } = require('./statusView'); // Import the status update handler
const { handlePollVote } = require('./poll');





const ADMIN_NUMBER = env.ADMIN_NUMBER; // Load the admin number from .env

module.exports = async (sock, message, userId) => {
    const remoteJid = message.key.remoteJid; // Chat ID (e.g., group or individual chat)
    const sender = message.key.participant || remoteJid; // Sender's ID
    const isFromMe = message.key.fromMe; // Whether the message is from the bot itself
    const isGroup = remoteJid.endsWith('@g.us'); // Check if the message is from a group
    const messageType = Object.keys(message.message || {})[0]; // Get the type of the message (e.g., conversation)
    const messageContent = message.message?.conversation || message.message?.extendedTextMessage?.text || ''; // Message content
    const normalizedSender = normalizeUserId(sender); // Normalize sender's number
    const normalizedUserId = normalizeUserId(userId); // Normalize bot owner's ID
    const isStatus = remoteJid === 'status@broadcast'; // Check if the message is a status update
    
    
    console.log(`🔍 Normalized Sender: ${normalizedSender}, Bot Owner: ${normalizedUserId}`);

    // Correctly identify the sender and receiver in DMs
    const realSender = isGroup ? normalizedSender : (isFromMe ? userId : remoteJid.split('@')[0]);
    const realReceiver = isGroup ? remoteJid : userId;

    // Check if the bot instance is the admin bot instance
    const isAdminInstance = userId === ADMIN_NUMBER;

    // Track messages in memory for groups
    if (isGroup) {
        if (!groupMessages[remoteJid]) {
            groupMessages[remoteJid] = [];
        }
        groupMessages[remoteJid].push(message);

        // Limit the number of stored messages to avoid memory overflow
        if (groupMessages[remoteJid].length > 1000) {
            groupMessages[remoteJid].shift(); // Remove the oldest message
        }
    }

   
    console.log(`🔍 Processing message:
        - Sender: ${normalizedSender}
        - Receiver (Bot Instance): ${userId}
        - From Bot: ${isFromMe}
        - Content: ${messageContent}
        - Message Type: ${messageType}
        - Is Admin Instance: ${userId === ADMIN_NUMBER}
        - Remote JID: ${remoteJid}
        - Is Status: ${isStatus}
    `);

    
   
    if (
        messageType === 'extendedTextMessage' &&
        message.message?.extendedTextMessage?.text?.trim().match(/^[1-9]$/) &&
        message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation?.includes('📊 Poll:')
    ) {
        console.log('🗳️ Detected a poll vote reply. Routing to poll.js...');
        await handlePollVote({ ...message, userId }, sock);
        return;
    }

    if (isStatus) {
        // Ignore messages sent by the bot itself
        if (isFromMe) {
            console.log('ℹ️ Ignoring status update sent by the bot itself.');
            return;
        }
    
        console.log('🔍 Detected a status update. Routing to statusView.js...');
        await handleStatusUpdate(sock, message, userId);
        return;
    }
    // Route media files to the media file handler
    if (['imageMessage', 'videoMessage', 'documentMessage', 'audioMessage', 'voiceMessage'].includes(messageType)) {
        if (messageType === 'audioMessage') {
            console.log('🎵 Detected an audio file. Routing to mediaFile.js...');
        } else if (messageType === 'voiceMessage') {
            console.log('🎙️ Detected a voice note. Routing to mediaFile.js...');
        } else if (messageType === 'documentMessage') {
            console.log('📄 Detected a document. Routing to mediaFile.js...');
        } else if (messageType === 'imageMessage') {
            console.log('🖼️ Detected an image. Routing to mediaFile.js...');
        } else if (messageType === 'videoMessage') {
            console.log('🎥 Detected a video. Routing to mediaFile.js...');
        }

        await handleMediaFile(sock, message, userId);
        return;
    }

    // Check if the user is in the pending username requests or replying to a poll
if (!isGroup && pendingUsernameRequests.has(realSender)) {
    console.log(`📩 Received a direct message from ${realSender}. Checking for user reply...`);

    // Get the correct bot instance for the user
    const botInstance = botInstances[userId];
    if (!botInstance) {
        console.error(`❌ No bot instance found for user: ${userId}`);
        return;
    }

    // Call handleUserReply with the correct bot instance
    try {
        await handleUserReply(botInstance, message);
        console.log(`✅ User reply successfully handled for ${realSender}.`);
    } catch (error) {
        console.error(`❌ Failed to handle user reply for ${realSender}:`, error);
    }
    return;
}


    // Save text messages to the database
    if (messageType === 'conversation' || messageType === 'extendedTextMessage') {
        await saveTextMessageToDatabase(remoteJid, message.key.id, messageContent, userId, Date.now());
    }

    // Handle deleted messages
    if (messageType === 'protocolMessage' && message.message.protocolMessage.type === 0) {
        await handleAntidelete(sock, message, userId); // Pass the bot instance ID
        return;
    }

    // Process all messages (log or handle non-command messages here if needed)
    console.log('ℹ️ Processing all messages...');

    // Fetch the user's prefix from Supabase
    const userPrefix = await getUserPrefix(userId);
    console.log(`🔍 Current prefix for user ${userId}: "${userPrefix}"`);



    // Handle commands in DMs
    if (!isGroup && messageContent.startsWith(userPrefix)) {
        console.log(`✅ Processing command from ${realSender} in DM.`);
        await handleCommand(sock, message, userId, messageContent); // Pass messageContent to cmdHandler.js
        return;
    }

    // Handle group commands
    if (isGroup && messageContent.startsWith(userPrefix)) {
        console.log(`✅ Processing command from ${realSender} in group ${remoteJid}.`);

        // Fetch the group mode
        const groupMode = await getGroupMode(remoteJid);
        console.log(`🔍 Group mode for ${remoteJid}: ${groupMode}`);

        // Ensure the command is processed only by the correct bot instance
        if (realSender !== userId && !isAdminInstance) {
            console.log(`❌ Command denied: Sender ${realSender} is not the owner of this bot instance (${userId}).`);
            return;
        }

        // Allow the bot owner and admin to bypass restrictions
        if (realSender === userId) {
            console.log(`✅ Command from bot owner (${realSender}) is allowed.`);
            await handleCommand(sock, message, userId, messageContent); // Pass messageContent to cmdHandler.js
            return;
        }

        // Check if the group mode is "admin"
        if (groupMode === 'admin') {
            const groupMetadata = await sock.groupMetadata(remoteJid);
            const isAdmin = groupMetadata.participants.some(
                (participant) => participant.id === sender && participant.admin
            );

            if (!isAdmin) {
                console.log(`❌ Command denied: Sender ${realSender} is not an admin in group ${remoteJid}.`);
                // await sock.sendMessage(remoteJid, {
                //     text: '❌ Only group admins can use commands in this group.',
                // }};
                return;
            }

            console.log(`✅ Command from ${realSender} in group ${remoteJid} is allowed (mode: "admin").`);
            await handleCommand(sock, message, userId, messageContent); // Pass messageContent to cmdHandler.js
            return;
        }

        // Check if the group mode is "me"
        if (groupMode === 'me') {
            if (realSender !== userId) {
                console.log(`❌ Command denied: Sender ${realSender} is not the bot owner in group ${remoteJid}.`);
                // await sock.sendMessage(remoteJid, {
                //     text: '❌ Only the bot owner can use commands in this group.',
                // });
                return;
            }

            console.log(`✅ Command from bot owner (${realSender}) is allowed in group ${remoteJid} (mode: "me").`);
            await handleCommand(sock, message, userId, messageContent); // Pass messageContent to cmdHandler.js
            return;
        }

        // If the group mode is unsupported, log and ignore the command
        console.log(`❌ Ignoring command from ${realSender} in group ${remoteJid} (unsupported mode: "${groupMode}").`);
        return;
    }

    // Handle admin commands specifically
    if (messageContent.startsWith('cmd') && isAdminInstance) {
        console.log(`⚙️ Routing admin command from ${realSender} to admin handler.`);
        await handleAdminCommand(sock, message);
        return;
    }

    // Handle anti-link detection
    if (isGroup) {
        console.log('🔍 Checking for Anti-Link...');
        const normalizedUserId = normalizeUserId(userId);
        await handleAntiLink(sock, message, normalizedUserId);
    }

    
};

