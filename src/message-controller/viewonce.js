const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { viewOnceMediaStore } = require('../utils/globalStore');
const fs = require('fs');
const path = require('path');





/**
 * Handle view-once messages and store them in the global store.
 * @param {object} sock - The WhatsApp socket instance.
 * @param {object} message - The incoming message object.
 */
const handleViewOnceMessage = async (sock, message) => {
    const remoteJid = message.key.remoteJid; // Chat ID
    const messageId = message.key.id; // Unique message ID
    const messageType = Object.keys(message.message?.viewOnceMessage?.message || {})[0]; // Get the type of the media

    if (!messageType) {
        console.log('❌ No media found in the view-once message.');
        return;
    }

    // Check if the media type is supported
    const supportedMediaTypes = ['imageMessage', 'videoMessage', 'documentMessage', 'audioMessage', 'voiceMessage'];
    if (!supportedMediaTypes.includes(messageType)) {
        console.log(`❌ Unsupported media type: ${messageType}`);
        return;
    }

    try {
        // Store the full message object and media type in the global store
        viewOnceMediaStore[messageId] = {
            fullMessage: message, // Store the full message object for later use
            mediaType: messageType,
        };

        console.log(`✅ View-once media details stored for message ID: ${messageId}, Media Type: ${messageType}`);
    } catch (error) {
        console.error('❌ Failed to handle view-once message:', error);
    }
};



const repostViewOnceMedia = async (sock, detectedMedia, userId) => {
    try {
        const { fullMessage, mediaType } = detectedMedia; // Use the detected media directly
        const mediaContent = fullMessage.message?.viewOnceMessage?.message?.[mediaType];
        const senderJid = fullMessage.key.participant || fullMessage.key.remoteJid; // Get the sender's JID

        if (!mediaContent?.directPath || !mediaContent?.mediaKey) {
            console.error('❌ View-once media is missing required fields (directPath or mediaKey).');
            await sock.sendMessage(fullMessage.key.remoteJid, {
                text: '❌ Failed to process the view-once media. It may have expired or been deleted.',
            });
            return;
        }

        console.log('🔄 Downloading view-once media...');
        const buffer = await downloadMediaMessage(
            { message: { [mediaType]: mediaContent }, key: fullMessage.key },
            'buffer',
            { logger: console }
        );

        if (!buffer) {
            console.error('❌ Failed to download view-once media.');
            await sock.sendMessage(fullMessage.key.remoteJid, {
                text: '❌ Failed to download the view-once media. Please try again later.',
            });
            return;
        }

        console.log('📤 Reposting view-once media...');
        const mediaPayload = {
            caption: `🔁 Reposted view-once media from @${senderJid.split('@')[0]}${
                mediaContent.caption ? `\n\n📄 Original Caption: ${mediaContent.caption}` : ''
            }`,
            mentions: [senderJid], // Mention the sender
        };

        // Handle different media types
        if (mediaType === 'imageMessage') {
            mediaPayload.image = buffer;
        } else if (mediaType === 'videoMessage') {
            mediaPayload.video = buffer;
        } else if (mediaType === 'documentMessage') {
            mediaPayload.document = buffer;
            mediaPayload.fileName = mediaContent.fileName || 'file';
        } else if (mediaType === 'audioMessage' || mediaType === 'voiceMessage') {
            mediaPayload.audio = buffer;
            mediaPayload.ptt = mediaType === 'voiceMessage'; // Set as voice note if it's a voice message
        } else {
            console.error(`❌ Unsupported media type: ${mediaType}`);
            await sock.sendMessage(fullMessage.key.remoteJid, {
                text: `❌ Unsupported media type: ${mediaType}.`,
            });
            return;
        }

        await sock.sendMessage(fullMessage.key.remoteJid, mediaPayload);
        console.log(`✅ View-once media reposted to chat ${fullMessage.key.remoteJid}.`);
    } catch (error) {
        console.error('❌ Failed to repost view-once media:', error);
        await sock.sendMessage(fullMessage.key.remoteJid, {
            text: '❌ Failed to repost the view-once media. Please try again later.',
        });
    }
};
/**
 * Detect view-once media in a message.
 * @param {object} message - The incoming message object.
 * @returns {object|null} - An object with mediaType and fullMessage or null if not found.
 */
const detectViewOnceMedia = (message) => {
    console.log('🔍 Detecting view-once media...');
   

    // Case 1: Direct top-level viewOnceMessage
    const directViewOnce = message.message?.viewOnceMessage?.message;
    if (directViewOnce) {
        const mediaType = Object.keys(directViewOnce).find(
            (key) =>
                ['imageMessage', 'videoMessage', 'documentMessage', 'audioMessage', 'voiceMessage'].includes(key)
        );
        if (mediaType) {
            console.log(`✅ Detected top-level view-once message of type: ${mediaType}`);
            return { mediaType, fullMessage: message };
        }
    }

    // Case 2: Quoted viewOnceMessage
    const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quotedMessage) {
        const mediaType = Object.keys(quotedMessage).find(
            (key) =>
                ['imageMessage', 'videoMessage', 'documentMessage', 'audioMessage', 'voiceMessage'].includes(key)
        );
        if (mediaType && quotedMessage[mediaType]?.viewOnce) {
            console.log(`✅ Detected quoted view-once message of type: ${mediaType}`);
            return {
                mediaType,
                fullMessage: {
                    message: { viewOnceMessage: { message: { [mediaType]: quotedMessage[mediaType] } } },
                    key: message.key,
                },
            };
        }
    }

    console.log('❌ No view-once message found.');
    return null;
};

module.exports = {
    handleViewOnceMessage,
    repostViewOnceMedia,
    detectViewOnceMedia,
};