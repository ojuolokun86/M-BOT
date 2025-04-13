const handleMessage = require('../message-controller/msgHandler'); // Import the message handler
const { handleNewUserJoin } = require('../utils/groupUser'); // Import the function to handle new user joins
const { botInstances } = require('../utils/globalStore'); // Import the global botInstances object
const { viewUnseenStatuses } = require('../message-controller/statusView'); // Import the function


const fs = require('fs');
const path = require('path');




module.exports = (sock, userId, version) => {
    if (!sock || !sock.ev) {
        console.error(`❌ Invalid sock object for user: ${userId}`);
        return;
    }
    
    console.log(`🤖🤖 Bot instance initialized for user: ${userId} using WhatsApp Web version: ${version}`);

    // Listen for incoming messages
    sock.ev.on('messages.upsert', async (messageUpdate) => {
        const message = messageUpdate.messages[0];
        const remoteJid = message.key.remoteJid; // Chat ID (e.g., group or individual chat)
        const sender = message.key.participant || remoteJid; // Sender's ID (for group chats, use participant)
        const normalizedSender = sender.split('@')[0]; // Normalize sender's number
        const isFromMe = message.key.fromMe; // Whether the message is from the bot itself
        const isGroup = remoteJid.endsWith('@g.us'); // Check if the message is from a group
        const messageId = message.key.id; // Unique message ID
        const messageContent = message.message?.conversation || message.message?.extendedTextMessage?.text || ''; // Message content
        const messageType = Object.keys(message.message?.viewOnceMessage?.message || {})[0]; // Get the type of the media
        // Correctly identify the sender and receiver in DMs
        const realSender = isGroup ? normalizedSender : (isFromMe ? userId : normalizedSender);
        const realReceiver = isGroup ? remoteJid : userId;

       // Log detailed information about the message
       console.log(`📩 New message received:
        - Message ID: ${messageId}
        - Sender: ${realSender}
        - Receiver (Bot Instance): ${realReceiver}
        - From Bot: ${isFromMe}
        - Chat ID: ${remoteJid}
        - Is Group: ${isGroup}
        - Bot Instance: ${userId}
        - Message Type: ${messageType}
        - Content: ${messageContent}
    `);

 

        // Pass the message to the message handler
        await handleMessage(sock, message, userId);
    });

    // Listen for group participant updates
    sock.ev.on('group-participants.update', async (update) => {
        const { id: groupId, participants, action } = update;

        if (action === 'add') {
            console.log(`🔍 New participants added to group ${groupId}:`, participants);

            for (const userJid of participants) {
                console.log(`👤 Handling new user join: ${userJid}`);
                await handleNewUserJoin(sock, groupId, userJid, botInstances[userId]);
            }
        } else if (action === 'remove') {
            console.log(`👋 Participants removed from group ${groupId}:`, participants);
            // Handle user removal if needed
        }
    });
};