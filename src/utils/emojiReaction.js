const commandEmojis = {
    // General Commands
    menu: '📜',
    info: 'ℹ️',
    ping: '🏓',
    about: '📖',
    restart: '🔄',

    // Customization Commands
    prefix: '🔤',
    tagformat: '🎨',

    // Group Commands
    tagall: '📢',
    setmode: '⚙️',
    antidelete: '🛡️',
    warn: '⚠️',
    resetwarn: '♻️',
    listwarn: '📋',
    warncount: '🔢',
    welcome: '👋',
    setwelcome: '✍️',
    groupinfo: '📜',
    groupname: '🏷️',
    grouppic: '🖼️',
    poll: '📊',
    endpoll: '🛑',
    kick: '🚪',
    add: '➕',
    promote: '⬆️',
    demote: '⬇️',
    clear: '🧹',
    mute: '🔒',
    unmute: '🔓',
    kickall: '🚪',
    announce: '📢',
    group: '🏡',
    group: '🔄',

    // Utility Commands
    delete: '🗑️',
    view: '👁️', 
    status: '👀',
    statusoff: '🚫',
    setname: '✏️',
    setprofilepic: '🖼️',
    setstatus: '✏️',
    presence: '⏮️',

    // Protection Commands
    antilink: '🔗',
    

    // Community & Group Commands
    create: '👥',
    create: '🏢',
    destroy: '❌',
    admin: '📢',
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