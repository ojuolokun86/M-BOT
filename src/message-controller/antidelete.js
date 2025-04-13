const { mediaStore } = require('../utils/globalStore'); // Import the mediaStore
const { downloadMediaMessage } = require('@whiskeysockets/baileys'); // Import media download function
const { deleteFileFromSupabase } = require('../utils/supabaseStorage'); // Import delete function
const DOCUMENTS_BUCKET = 'documents'; // Replace with your Supabase bucket name
const { deletedMessagesByBot } = require('../utils/globalStore');
const supabase = require('../supabaseClient'); // Import the Supabase client

/**
 * Save a text message to the database if antidelete is enabled.
 * @param {string} chatId - The group or chat ID.
 * @param {string} messageId - The unique message ID.
 * @param {string} messageContent - The content of the text message.
 * @param {string} botInstanceId - The bot instance ID.
 * @param {number} timestamp - The timestamp of the message.
 */
const saveTextMessageToDatabase = async (chatId, messageId, messageContent, botInstanceId, timestamp) => {
    const isGroup = chatId.endsWith('@g.us'); // Check if the chat is a group
    const antideleteKey = isGroup ? chatId : 'dm'; // Use 'dm' for direct messages

    // Fetch antidelete settings
    const { data: antideleteSetting, error: fetchError } = await supabase
        .from('antidelete_settings')
        .select('is_enabled, is_global')
        .eq('group_id', antideleteKey)
        .eq('bot_instance_id', botInstanceId)
        .single();

    if (fetchError || (!antideleteSetting?.is_enabled && !(antideleteSetting?.is_global && !isGroup))) {
        console.log(`❌ Antidelete is disabled for chat ${chatId} and bot instance ${botInstanceId}. Skipping save.`);
        return;
    }

    let formattedTimestamp;
    try {
        formattedTimestamp = new Date(timestamp).toISOString();
    } catch (error) {
        console.error(`❌ Failed to format timestamp for message ${messageId}:`, error);
        return;
    }

    console.log(`🔄 Attempting to save text message to database:
        - Chat ID: ${chatId}
        - Message ID: ${messageId}
        - Message Content: ${messageContent}
        - Bot Instance ID: ${botInstanceId}
        - Timestamp: ${formattedTimestamp}
    `);

    try {
        const { error } = await supabase
            .from('text_messages')
            .upsert(
                {
                    chat_id: chatId,
                    message_id: messageId,
                    message_content: messageContent,
                    bot_instance_id: botInstanceId,
                    timestamp: formattedTimestamp,
                },
                { onConflict: ['chat_id', 'message_id', 'bot_instance_id'] }
            );

        if (error) {
            console.error(`❌ Error saving text message to database for message ${messageId}:`, error);
            return;
        }

        console.log(`✅ Text message successfully saved to database for message ${messageId}.`);
    } catch (error) {
        console.error(`❌ Error saving text message to database for message ${messageId}:`, error);
    }
};

/**
 * Handle restoring deleted text messages.
 * @param {object} sock - The WhatsApp socket instance.
 * @param {object} message - The deleted message object.
 * @param {string} botInstanceId - The bot instance ID.
 */
const handleAntidelete = async (sock, message, botInstanceId) => {
    const remoteJid = message.key.remoteJid; // Chat ID
    const isGroup = remoteJid.endsWith('@g.us'); // Check if the chat is a group
    const deletedMessageId = message.message?.protocolMessage?.key?.id; // ID of the deleted message
    const protocolMessageType = message.message?.protocolMessage?.type;

    if (protocolMessageType !== 0) {
        console.log(`ℹ️ Message is not a deleted message. Ignoring.`);
        return;
    }

    console.log(`🗑️ Detected deleted message in chat: ${remoteJid}`);
    console.log(`🔍 Deleted Message ID: ${deletedMessageId}`);

     
     // Check if the message was deleted by the same bot instance
     if (deletedMessagesByBot[botInstanceId] && deletedMessagesByBot[botInstanceId].has(deletedMessageId)) {
         console.log(`⚠️ Ignoring message ${deletedMessageId} deleted by bot instance ${botInstanceId}.`);
         return; // Skip restoring the message
     }

    // Determine who deleted the message
    let deletedBy;
    if (isGroup) {
        deletedBy = message.key.participant || remoteJid; // In groups, use the participant field
    } else {
        // In DMs, check if the message was deleted by the bot or the user
        deletedBy = message.key.fromMe ? `${botInstanceId}@s.whatsapp.net` : remoteJid;
    }

    console.log(`🔍 Deleted By: ${deletedBy}`);

    // Check if the message was deleted by the bot instance itself
    const botInstanceJid = `${botInstanceId}@s.whatsapp.net`;
    if (deletedBy === botInstanceJid) {
        console.log(`⚠️ Message deleted by the bot instance (${botInstanceJid}). Skipping restore.`);
        return;
    }
    // Fetch antidelete settings
    const antideleteKey = isGroup ? remoteJid : 'dm'; // Use 'dm' for direct messages
    const { data: antideleteSetting, error: fetchError } = await supabase
        .from('antidelete_settings')
        .select('is_enabled, is_global')
        .eq('group_id', antideleteKey)
        .eq('bot_instance_id', botInstanceId)
        .single();

    if (fetchError || (!antideleteSetting?.is_enabled && !(antideleteSetting?.is_global && !isGroup))) {
        console.log(`❌ Antidelete is disabled for chat ${remoteJid} and bot instance ${botInstanceId}. Skipping restore.`);
        return;
    }

    // Log the query parameters
    console.log(`🔍 Query Parameters:
        - Chat ID: ${remoteJid}
        - Message ID: ${deletedMessageId}
        - Bot Instance ID: ${botInstanceId}
    `);

    
    
   
    // Check if the deleted message exists in the media store
    const mediaData = mediaStore.get(deletedMessageId);
    if (mediaData) {
        console.log(`✅ Media file found in memory for message ID: ${deletedMessageId}`);

        // Map the `messageType` to valid types for `sendMessage`
        const validMediaTypes = {
            imageMessage: 'image',
            videoMessage: 'video',
            documentMessage: 'document',
            audioMessage: 'audio', // Add support for audio files
            voiceMessage: 'audio', // Add support for voice notes
        };

       
        const resolvedMediaType = validMediaTypes[mediaData.messageType];
        if (!resolvedMediaType) {
            console.error(`❌ Unsupported media type: ${mediaData.messageType}`);
            return;
        }

        // Format the deletion time
        const deletionTime = new Date().toLocaleString(); // Current time when the message was deleted
        const deletedByUser = deletedBy.split('@')[0]; // Extract the user ID
        
        // Restore the media file
        try {
            await sock.sendMessage(remoteJid, {
                text: `♻️ Restored deleted file:\n\n*File Content:* ${mediaData.caption || 'No caption'}\n\n*Deleted By:* @${deletedByUser}\n*Deleted At:* ${deletionTime}`,
                mentions: [deletedBy],
            });

            await sock.sendMessage(remoteJid, {
                [resolvedMediaType]: mediaData.buffer,
                caption: mediaData.caption || '',
            });

            console.log(`✅ Restored media file for message ID: ${deletedMessageId}`);
        } catch (error) {
            console.error(`❌ Failed to restore media file for message ID: ${deletedMessageId}`, error);
        }

        // Remove the restored media from the store to free memory
        mediaStore.delete(deletedMessageId);
        console.log(`✅ Media file removed from memory for message ID: ${deletedMessageId}`);
   return;
}
    // Retrieve the deleted message from the database
    console.log(`🔍 Attempting to retrieve deleted message from database for message ID: ${deletedMessageId}`);
    const { data: deletedMessage, error } = await supabase
        .from('text_messages')
        .select('message_content, timestamp')
        .eq('chat_id', remoteJid)
        .eq('message_id', deletedMessageId)
        .eq('bot_instance_id', botInstanceId)
        .single();

    if (error || !deletedMessage) {
        console.log(`❌ Deleted message not found in database for message ID: ${deletedMessageId}`);
        console.error(`🔍 Supabase Error:`, error);
        return;
    }

    console.log(`✅ Deleted message retrieved from database for message ID: ${deletedMessageId}`);

    // Format the deletion time
    const deletionTime = new Date().toLocaleString(); // Current time when the message was deleted
    const deletedByUser = deletedBy.split('@')[0]; // Extract the user ID

    // Restore the deleted text message
    try {
        await sock.sendMessage(remoteJid, {
            text: `♻️ Restored deleted message:\n\n*Message Content:* ${deletedMessage.message_content}\n\n*Deleted By:* @${deletedByUser}\n*Deleted At:* ${deletionTime}`,
            mentions: [deletedBy],
        });
        console.log(`✅ Restored deleted message for message ID: ${deletedMessageId}`);

        
        // Delete the restored message from the database
        const { error: deleteError } = await supabase
            .from('text_messages')
            .delete()
            .eq('chat_id', remoteJid)
            .eq('message_id', deletedMessageId)
            .eq('bot_instance_id', botInstanceId);

        if (deleteError) {
            console.error(`❌ Failed to delete restored message from database for message ID: ${deletedMessageId}`, deleteError);
        } else {
            console.log(`✅ Restored message deleted from database for message ID: ${deletedMessageId}`);
        }


    } catch (error) {
        console.error(`❌ Failed to restore deleted message for message ID: ${deletedMessageId}`, error);
    }
};

/**
 * Enable or disable antidelete globally for DMs.
 * @param {string} botInstanceId - The bot instance ID.
 * @param {boolean} isEnabled - Whether to enable or disable antidelete globally for DMs.
 */
const setGlobalAntideleteForDMs = async (botInstanceId, isEnabled) => {
    try {
        const { error } = await supabase
            .from('antidelete_settings')
            .upsert(
                { group_id: 'dm', bot_instance_id: botInstanceId, is_global: isEnabled },
                { onConflict: ['group_id', 'bot_instance_id'] }
            );

        if (error) {
            console.error(`❌ Failed to set global antidelete for DMs for bot instance ${botInstanceId}:`, error);
            throw error;
        }

        console.log(`✅ Global antidelete for DMs for bot instance ${botInstanceId} set to ${isEnabled ? 'enabled' : 'disabled'}.`);
    } catch (error) {
        console.error(`❌ Error setting global antidelete for DMs for bot instance ${botInstanceId}:`, error);
    }
};

/**
 * Enable or disable antidelete for a specific chat.
 * @param {string} chatId - The group or chat ID.
 * @param {string} botInstanceId - The bot instance ID.
 * @param {boolean} isEnabled - Whether to enable or disable antidelete for the chat.
 */
const setChatAntidelete = async (chatId, botInstanceId, isEnabled) => {
    try {
        const { error } = await supabase
            .from('antidelete_settings')
            .upsert(
                { group_id: chatId, bot_instance_id: botInstanceId, is_enabled: isEnabled },
                { onConflict: ['group_id', 'bot_instance_id'] }
            );

        if (error) {
            console.error(`❌ Failed to set antidelete for chat ${chatId} and bot instance ${botInstanceId}:`, error);
            throw error;
        }

        console.log(`✅ Antidelete for chat ${chatId} and bot instance ${botInstanceId} set to ${isEnabled ? 'enabled' : 'disabled'}.`);
    } catch (error) {
        console.error(`❌ Error setting antidelete for chat ${chatId} and bot instance ${botInstanceId}:`, error);
    }
};

/**
 * Delete messages older than 20 minutes from the database.
 */
const cleanUpOldMessages = async () => {
    try {
        const twentyMinutesAgo = new Date();
        twentyMinutesAgo.setMinutes(twentyMinutesAgo.getMinutes() - 20); // Subtract 20 minutes from the current time

        console.log(`🔄 Cleaning up messages older than: ${twentyMinutesAgo.toISOString()}`);

        const { error } = await supabase
            .from('text_messages')
            .delete()
            .lt('timestamp', twentyMinutesAgo.toISOString()); // Delete messages older than 20 minutes

        if (error) {
            console.error('❌ Error cleaning up old messages:', error);
        } else {
            console.log('✅ Old messages cleaned up successfully.');
        }
    } catch (error) {
        console.error('❌ Failed to clean up old messages:', error);
    }
};

// Schedule cleanup every 20 minutes
setInterval(cleanUpOldMessages, 20 * 60 * 1000); // Run cleanup every 20 minutes




// Periodically clear the deletedMessagesByBot store to prevent memory overflow
setInterval(() => {
    for (const botId in deletedMessagesByBot) {
        deletedMessagesByBot[botId].clear();
    }
    console.log('🧹 Cleared deletedMessagesByBot store.');
}, 60 * 60 * 1000); // Clear every hour

module.exports = {
    saveTextMessageToDatabase,
    handleAntidelete,
    setGlobalAntideleteForDMs,
    setChatAntidelete,
};

