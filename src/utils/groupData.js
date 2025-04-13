const fs = require('fs');
const path = require('path');
const env = require('../utils/loadEnv'); // Import environment variables

/**
 * Fetch group metadata.
 * @param {object} sock - The WhatsApp socket instance.
 * @param {string} groupId - The group ID.
 * @returns {Promise<object>} - The group metadata.
 */
const fetchGroupMetadata = async (sock, groupId) => {
    try {
        const groupMetadata = await sock.groupMetadata(groupId);
        console.log(`✅ Fetched metadata for group: ${groupId}`);
        return groupMetadata;
    } catch (error) {
        console.error(`❌ Failed to fetch metadata for group: ${groupId}`, error);
        throw error;
    }
};

/**
 * Get all participants in a group.
 * @param {object} sock - The WhatsApp socket instance.
 * @param {string} groupId - The group ID.
 * @returns {Promise<string[]>} - An array of participant IDs.
 */
const getGroupParticipants = async (sock, groupId) => {
    try {
        const groupMetadata = await fetchGroupMetadata(sock, groupId);
        const participants = groupMetadata.participants.map((p) => p.id);
        console.log(`✅ Fetched participants for group: ${groupId}`);
        return participants;
    } catch (error) {
        console.error(`❌ Failed to fetch participants for group: ${groupId}`, error);
        throw error;
    }
};

/**
 * Get all admins in a group.
 * @param {object} sock - The WhatsApp socket instance.
 * @param {string} groupId - The group ID.
 * @returns {Promise<string[]>} - An array of admin IDs.
 */
const getGroupAdmins = async (sock, groupId) => {
    try {
        const groupMetadata = await sock.groupMetadata(groupId);
        const admins = groupMetadata.participants
            .filter((participant) => participant.admin) // Filter participants who are admins
            .map((participant) => participant.id); // Return their IDs
        return admins;
    } catch (error) {
        console.error(`❌ Failed to fetch group admins for group ${groupId}:`, error);
        return [];
    }
};

/**
 * Get the group name.
 * @param {object} sock - The WhatsApp socket instance.
 * @param {string} groupId - The group ID.
 * @returns {Promise<string>} - The group name.
 */
const getGroupName = async (sock, groupId) => {
    try {
        const groupMetadata = await fetchGroupMetadata(sock, groupId);
        return groupMetadata.subject; // Group name
    } catch (error) {
        console.error(`❌ Failed to fetch group name for group: ${groupId}`, error);
        throw error;
    }
};

/**
 * Get the bot owner's name using the .env file or the bot_number folder.
 * @param {string} instanceId - The bot instance ID (used to fetch the bot owner's number).
 * @returns {string} - The bot owner's name.
 */

const getBotOwnerName = (instanceId) => {
    // Ensure instanceId is a string
    if (typeof instanceId !== 'string') {
        console.error(`❌ Invalid instanceId: Expected a string but got ${typeof instanceId}. Value:`, instanceId);
        return 'Unknown User';
    }

    // Check if the instance is the admin instance
    if (instanceId === 'admin') {
        const adminName = env.ADMIN_NAME; // Load admin name from .env
        if (adminName) {
            console.log(`✅ Admin name found in .env: ${adminName}`);
            return adminName;
        }
        console.warn(`⚠️ Admin name not found in .env. Falling back to bot_number folder.`);
    }

    // Fallback to the bot_number folder
    const botNumberFilePath = path.join(__dirname, '..', '..', 'bot_number', `${instanceId}.txt`);
    console.log(`🔍 Looking for bot owner file at: ${botNumberFilePath}`);

    if (!fs.existsSync(botNumberFilePath)) {
        console.error(`❌ Bot number file not found for instance: ${instanceId}`);
        return 'Unknown User';
    }

    console.log(`✅ Bot number file found for instance: ${instanceId}`);

    // Read the file and extract the username
    const fileContent = fs.readFileSync(botNumberFilePath, 'utf-8').trim();
    console.log(`📄 File content for instance ${instanceId}:\n${fileContent}`);

    const usernameMatch = fileContent.match(/Username:\s*(.+)/); // Extract the username
    if (usernameMatch && usernameMatch[1]) {
        console.log(`✅ Username extracted from bot_number file: ${usernameMatch[1]}`);
        return usernameMatch[1];
    }

    console.error(`❌ Username not found in bot_number file for instance: ${instanceId}`);
    return 'Unknown User';
};

module.exports = {
    fetchGroupMetadata,
    getGroupParticipants,
    getGroupAdmins,
    getGroupName,
    getBotOwnerName,
};