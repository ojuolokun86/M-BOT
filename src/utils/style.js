/**
 * Generate a random emoji from a predefined list.
 * @returns {string} - A random emoji.
 */
const getRandomEmoji = () => {
    const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚'];
    return emojis[Math.floor(Math.random() * emojis.length)];
};

/**
 * Generate a formatted tagall message.
 * @param {string} groupName - The name of the group.
 * @param {string} sender - The sender's WhatsApp ID.
 * @param {string} botOwnerName - The bot owner's name.
 * @param {string} messageContent - The message content (or "No message" if empty).
 * @param {string[]} mentions - An array of user mentions.
 * @returns {object} - The formatted tagall message object with text and mentions.
 */
const generateTagAllMessage = (groupName, sender, botOwnerName, messageContent, mentions) => {
    let text = `🚀 Techitoon AI Assistant 🚀\n\n`;
    text += `│👥 Group : ${groupName}\n`;
    text += `│👤 Hey${getRandomEmoji()} : @${(sender || '').split('@')[0]}\n`; // Use random emoji for "Hey"
    text += `│🤖 Bot Owner : ${botOwnerName}\n`;
    text += `│📜 Message : *${messageContent || 'No message'}*\n`;
    text += `╰─────────────━┈⊷\n\n`;

    // Add mentions with random emojis
    text += mentions.map((id) => `${getRandomEmoji()} @${id.split('@')[0]}`).join('\n');

    return { text, mentions };
};

module.exports = {
    generateTagAllMessage,
};