const supabase = require('../supabaseClient');
const { warnUser, getWarningThreshold,  resetWarnings } = require('../database/warning');
const { sendToChat } = require('../utils/messageUtils');
const path = require('path');
const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|wa\.me\/[^\s]+|chat\.whatsapp\.com\/[^\s]+|t\.me\/[^\s]+|bit\.ly\/[^\s]+|[\w-]+\.(com|net|org|info|biz|xyz|live|tv|me|link)(\/\S*)?)/gi;
const { normalizeUserId } = require('../utils/normalizeUserId'); // Import the normalize function
const { deletedMessagesByBot } = require('../utils/globalStore');


/**
 * Fetch a user from the `users` table by user ID.
 * @param {string} userId - The user's ID.
 * @returns {Promise<object|null>} - The user data or null if not found.
 */
const getUserFromUsersTable = async (userId) => {
    const normalizedUserId = normalizeUserId(userId); // Normalize userId
    console.log(`🔍 Fetching user from users table for user ID: ${normalizedUserId}...`);

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', normalizedUserId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error(`❌ Error fetching user from users table for user ID ${normalizedUserId}:`, error);
        throw error;
    }

    if (!data) {
        console.log(`⚠️ User with ID ${normalizedUserId} not found in users table.`);
        return null;
    }

    console.log(`✅ User fetched from users table:`, data);
    return data;
};

/**
 * Update Anti-Link settings for a group and user.
 * Handles the `admin` bot instance as a special case.
 * @param {string} groupId - The group ID.
 * @param {string} userId - The user's ID.
 * @param {object} settings - The new Anti-Link settings.
 * @returns {Promise<void>}
 */
const updateAntiLinkSettings = async (groupId, userId, settings) => {
    const normalizedUserId = userId === 'admin' ? 'admin' : normalizeUserId(userId); // Normalize userId
    console.log(`🔄 Updating Anti-Link settings for group ${groupId} and user ${normalizedUserId}:`, settings);

    const { error } = await supabase
        .from('antilink_settings')
        .upsert(
            { group_id: groupId, user_id: normalizedUserId, ...settings },
            { onConflict: ['group_id', 'user_id'] }
        );

    if (error) {
        console.error(`❌ Error updating Anti-Link settings for group ${groupId} and user ${normalizedUserId}:`, error);
        throw error;
    }

    console.log(`✅ Anti-Link settings updated for group ${groupId} and user ${normalizedUserId}.`);
};
/**
 * Fetch Anti-Link settings for a group and user.
 * Handles the `admin` bot instance as a special case.
 * @param {string} groupId - The group ID.
 * @param {string} userId - The user's ID.
 * @returns {Promise<object>} - The Anti-Link settings.
 */
const getAntiLinkSettings = async (groupId, userId) => {
    const normalizedUserId = userId === 'admin' ? 'admin' : normalizeUserId(userId); // Normalize userId
    console.log(`🔍 Fetching Anti-Link settings for group ${groupId} and user ${normalizedUserId}...`);

    const { data, error } = await supabase
        .from('antilink_settings')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', normalizedUserId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error(`❌ Error fetching Anti-Link settings for group ${groupId} and user ${normalizedUserId}:`, error);
        throw error;
    }

    console.log(`✅ Fetched Anti-Link settings:`, data);
    return data || { antilink_enabled: false, warning_count: 3, bypass_admin: false, bypass_users: [] }; // Default settings
};
/**
 * Handle Anti-Link detection in a group.
 * @param {object} sock - The WhatsApp socket instance.
 * @param {object} message - The incoming message object.
 * @param {string} userId - The user's ID.
 */
const handleAntiLink = async (sock, message, botInstanceId) => {
    const normalizedUserId = botInstanceId === 'admin' ? 'admin' : normalizeUserId(botInstanceId); // Normalize userId
    console.log(`🔍 Handling Anti-Link for user ${normalizedUserId}...`);
    const chatId = message.key.remoteJid; // Group ID
    const sender = message.key.participant || message.key.remoteJid; // Sender's ID
    const messageId = message.key.id; // Extract the message ID

    // Extract message content for all message types
    const msgText =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        message.message?.imageMessage?.caption ||
        message.message?.videoMessage?.caption ||
        message.message?.documentMessage?.caption ||
        message.message?.senderKeyDistributionMessage?.text || // Add support for senderKeyDistributionMessage
        ''; // Default to an empty string if no text is found

    // Log the extracted message content for debugging
    console.log(`🔍 Extracted message content for Anti-Link: "${msgText}"`);

    const groupSettings = await getAntiLinkSettings(chatId, normalizedUserId);
    console.log(`🔍 Anti-Link enabled: ${groupSettings.antilink_enabled}`);

    if (!groupSettings.antilink_enabled) {
        console.log(`ℹ️ Anti-Link is disabled for group ${chatId}.`);
        return; // Anti-Link is disabled
    }

    // Check if the sender is the bot instance itself
    const botJid = `${normalizedUserId}@s.whatsapp.net`;
    if (sender === botJid) {
        console.log(`ℹ️ Ignoring message from bot instance (${botJid}) in group ${chatId}.`);
        return; // Do not process messages sent by the bot instance
    }

    // Check if the sender is bypassed
    if (groupSettings.bypass_users?.includes(sender)) {
        console.log(`ℹ️ Sender ${sender} is in the bypass list for Anti-Link in group ${chatId}.`);
        return;
    }

    // Check if the sender is an admin and bypass_admin is enabled
    const groupMetadata = await sock.groupMetadata(chatId);
    const isAdmin = groupMetadata.participants.some(
        (participant) => participant.id === sender && participant.admin
    );

    if (isAdmin && groupSettings.bypass_admin) {
        console.log(`ℹ️ Sender ${sender} is an admin and bypass is enabled. Skipping Anti-Link action.`);
        return;
    }

    // Detect links
    if (linkRegex.test(msgText)) {
        console.log(`✅ Link detected in message: "${msgText}"`);
        // Delete the message
        await sock.sendMessage(chatId, { delete: message.key });
        console.log(`⚠️ Message from ${sender} deleted in group: ${chatId} (link detected)`);

        // Warn the user for posting a link
        try {
            const reason = 'Posting a prohibited link';
            const warningCount = await warnUser(chatId, sender, reason, normalizedUserId);
            console.log(`⚠️ User ${sender} warned for posting a link. Current warning count: ${warningCount}`);

            // Fetch the group's warning threshold
            const warningThreshold = await getWarningThreshold(chatId, normalizedUserId);
            console.log(`🔍 Warning threshold for group ${chatId}: ${warningThreshold}`);

            // Check if the user has exceeded the warning threshold
            if (warningCount >= warningThreshold) {
                console.log(`🚨 User ${sender} has exceeded the warning threshold. Kicking from group ${chatId}...`);

                // Kick the user from the group
                await sock.groupParticipantsUpdate(chatId, [sender], 'remove');
                console.log(`✅ User ${sender} removed from group ${chatId}.`);

                // Reset the user's warnings after kicking
                await resetWarnings(chatId, sender, normalizedUserId);
                console.log(`♻️ Warnings for user ${sender} reset after removal.`);
            } else {
                // Warn the user in the group
                const warningMessage = `⚠️ @${sender.split('@')[0]}, sharing links is not allowed in this group. You have ${warningCount}/${warningThreshold} warnings.`;
                await sock.sendMessage(chatId, { text: warningMessage, mentions: [sender] });
                console.log(`✅ Warning message sent to ${sender} in group ${chatId}.`);
            }
        } catch (error) {
            console.error(`❌ Failed to warn user ${sender} in group ${chatId}:`, error);
        }
    } else {
        console.log(`ℹ️ No link detected in message: "${msgText}"`);
    }


    // Track the deleted message
    if (!deletedMessagesByBot[botInstanceId]) {
        deletedMessagesByBot[botInstanceId] = new Set();
    }
    deletedMessagesByBot[botInstanceId].add(messageId);

    console.log(`✅ Message ${messageId} deleted by bot instance ${botInstanceId}.`);
};





module.exports = {
    getUserFromUsersTable,
    getAntiLinkSettings,
    updateAntiLinkSettings,
    handleAntiLink,
};