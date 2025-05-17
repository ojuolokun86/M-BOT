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
    'announce stop': '🛑',
    'group link': '🔗',
    'group revoke': '🔄',
    leave: '🚪',

    // Utility Commands
    delete: '🗑️',
    view: '👁️',
    'status on': '👀',
    'status off': '🚫',
    setname: '✏️',
    setpic: '🖼️',
    setstatus: '✏️',
    presence: '🔄',
    'presence dynamic': '🔄',
    'seen on': '👁️',
    'seen off': '👁️',
    'antidelete chaton': '🛡️',
    'antidelete chatoff': '🛡️',

    // Protection Commands
    antilink: '🔗',
    'antilink on': '🔗',
    'antilink off': '🔗',
    'antilink warncount': '🔢',
    'antilink bypassadmin': '🛡️',
    'antilink dbadmin': '🛡️',
    'antilink bypass': '🛡️',
    'antilink db': '🛡️',
    'antilink list': '📋',

    // Community & Group Commands
    'create group': '👥',
    'create NG': '🏢',
    'destroy group': '❌',
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