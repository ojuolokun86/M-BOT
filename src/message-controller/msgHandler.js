const { botInstances, antideleteSettings } = require('../utils/globalStore'); // Import the global botInstances object
const { handleCommand } = require('./cmdHandler'); // Import the command handler
const { getGroupMode } = require('../bot/groupModeManager'); // Import the group mode manager
const { getUserPrefix } = require('../database/userPrefix'); // Import the prefix functions
const env = require('../utils/loadEnv'); // Import environment variables
const { handleMediaFile } = require('../utils/mediaFile'); // Correctly import the media file handler
const { handleUserReply, } = require('./handleUserReply'); // Import user reply handler
const {  handleAntidelete, setChatAntidelete  } = require('./antidelete'); // Import antidelete functions
const { groupMessages, pendingUsernameRequests } = require('../utils/globalStore'); // Import the global group messages object
const { handleAntiLink } = require('./antilink'); // Import anti-link handler
const { normalizeUserId } = require('../utils/normalizeUserId'); // Import the normalize function
const { handleViewOnceMessage } = require('./viewonce'); // Import view once message handler
const { handleStatusUpdate } = require('./statusView'); // Import the status update handler
const { handlePollVote } = require('./poll');
const { addUser } = require('../database/userDatabase'); // Import the user database functions
const globalStore = require('../utils/globalStore');
const { updateUserMetrics } = require('../database/models/metrics'); // Import the user metrics functions
const { updateLastActive } = require('../database/models/memory'); // Import the user database functions
const  { handleAntideleteSave } = require('./antidelete'); // Import the antidelete functions




const ADMIN_NUMBER = env.ADMIN_NUMBER; // Load the admin number from .env

module.exports = async (sock, message, userId, authId) => {
    const startTime = Date.now(); // Start timing
    try {
    const remoteJid = message.key.remoteJid; // Chat ID (e.g., group or individual chat)
    const sender = (message.key.participant || remoteJid).split('@')[0]; // Normalize sender ID
    const isFromMe = message.key.fromMe; // Whether the message is from the bot itself
    const isGroup = remoteJid.endsWith('@g.us'); // Check if the message is from a group
    const messageType = Object.keys(message.message || {})[0]; // Get the type of the message (e.g., conversation)
    const messageContent = message.message?.conversation || message.message?.extendedTextMessage?.text || ''; // Message content
    const isStatus = remoteJid === 'status@broadcast'; // Check if the message is a status update
    const botLid = sock.user?.lid ? sock.user.lid.split(':')[0].split('@')[0] : null;
    const botId = sock.user?.id ? sock.user.id.split(':')[0].split('@')[0] : null;
    const senderId = sender; // Already normalized (no @)
    const isFromBotUser = senderId === botLid || senderId === botId;
        
    const botInstanceId = userId; // Use the bot owner's ID as the instance ID
    

    // Dynamically update presence if globalPresenceType is set for this bot instance
    const presenceSettings = globalStore.presenceSettings[botInstanceId];
    if (presenceSettings) {
        try {
            await sock.sendPresenceUpdate(presenceSettings.globalPresenceType, remoteJid);
            console.log(`🔄 Global dynamic presence updated to "${presenceSettings.globalPresenceType}" for: ${remoteJid}`);
        } catch (error) {
            console.error(`❌ Failed to update global dynamic presence for ${remoteJid}:`, error);
        }
    }

    // Correctly identify the sender and receiver in DMs
    const realSender = isGroup ? sender : (isFromMe ? userId : remoteJid.split('@')[0]);
    const realReceiver = isGroup ? remoteJid : userId;
    console.log(`👹 ${sender}`)

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

     updateLastActive(userId);
    console.log(`🔍 Processing message:
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

if (messageType === 'conversation' || messageType === 'extendedTextMessage') {
    await handleAntideleteSave(remoteJid, userId, messageType, message.key.id, messageContent, isGroup, isFromMe || isFromBotUser);
    console.log(`🔍 Message content: "${messageContent}"`);
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

     if (isGroup && messageContent.startsWith(`${userPrefix}`)) {
        console.log(`✅ Processing group command: ${messageContent}`);
        await handleCommand(sock, message, userId, authId, messageContent); // Pass messageContent to cmdHandler.js
    } else if (!isGroup && messageContent.startsWith(`${userPrefix}`)) {
        console.log(`✅ Processing DM command: ${messageContent}`);
        await handleCommand(sock, message, userId, authId, messageContent); // Pass messageContent to cmdHandler.js
    }

  

    // Handle anti-link detection
    if (isGroup) {
        console.log('🔍 Checking for Anti-Link...');
        const normalizedUserId = normalizeUserId(userId);
        await handleAntiLink(sock, message, normalizedUserId);
    }

    
} catch (error) {
    console.error(`❌ Error handling message for user ${userId}:`, error);
}
const endTime = Date.now(); // End timing
const timeTaken = endTime - startTime;

// Save the time delay for the user
updateUserMetrics(userId, authId, { messageProcessingTime: timeTaken });

console.log(`⏱️ Message handling for user ${userId} & ${authId} took ${timeTaken}ms.`);
};

