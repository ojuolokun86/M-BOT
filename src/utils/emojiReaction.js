const commandEmojis = {
    ping: '🏓',
    add: '➕',
    kick: '🚪',
    delete: '🗑️',
    tagall: '📢',
    info: 'ℹ️',
    menu: '📜',
    about: '📖',
    view: '👁️',
    prefix: '🔤',
    tagformat: '🎨',
    setmode: '⚙️',
    antidelete: '🛡️',
    welcome: '👋',
    setwelcome: '✍️',
    warn: '⚠️',
    resetwarn: '♻️',
    listwarn: '📋',
    warncount: '🔢',
    promote: '⬆️',
    demote: '⬇️',
};

/**
 * Get an emoji for a specific command.
 * If the command doesn't have a predefined emoji, return a random emoji.
 * @param {string} command - The command name.
 * @returns {string} - The emoji for the command.
 */
const getEmojiForCommand = (command) => {
    const randomEmojis = ['👍', '🎉', '✨', '🔥', '✅', '💡', '🎯'];
    return commandEmojis[command] || randomEmojis[Math.floor(Math.random() * randomEmojis.length)];
};

module.exports = { getEmojiForCommand };