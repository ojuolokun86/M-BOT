/**
 * Get the menu list with the user's prefix.
 * @param {string} prefix - The user's custom prefix.
 * @returns {string} - The menu list as a string.
 */
const getMenu = (prefix = '.') => {
    return `
╭━━━〘 🌟 𝗧𝗲𝗰𝗵𝗶𝘁𝗼𝗼𝗻 𝗔𝗜 - 𝗖𝗼𝗺𝗺𝗮𝗻𝗱 𝗚𝘂𝗶𝗱𝗲 🌟 〙━━━╮

📌 𝗚𝗘𝗡𝗘𝗥𝗔𝗟 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦:
╭───────────────────────╮
┃ ✅ ${prefix}menu - Show this menu  
┃ ℹ️ ${prefix}info - Get bot information  
┃ 🏓 ${prefix}ping - Check bot responsiveness  
┃ 📖 ${prefix}about - Learn about this bot  
┃ 🔄 ${prefix}restart - Restart the bot  
╰───────────────────────╯

📌 𝗖𝗨𝗦𝗧𝗢𝗠𝗜𝗭𝗔𝗧𝗜𝗢𝗡 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦:
╭───────────────────────╮
┃ 🔤 ${prefix}prefix <new_prefix> - Change the command prefix  
┃ 🎨 ${prefix}tagformat - Toggle between formatted and plain tagall messages  
╰───────────────────────╯

📌 𝗚𝗥𝗢𝗨𝗣 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦:
╭───────────────────────╮
┃ 👥 ${prefix}tagall <message> - Tag all members in a group  
┃ ⚙️ ${prefix}setmode <me/admin> - Set the group mode  
┃ 🛡️ ${prefix}antidelete on/off - Enable or disable antidelete  
┃ ⚠️ ${prefix}warn @user <reason> - Warn a user  
┃ ♻️ ${prefix}resetwarn @user - Reset warnings for a user  
┃ 📋 ${prefix}listwarn - List all warnings in the group  
┃ 🔢 ${prefix}warncount <number> - Set the warning threshold  
┃ 👋 ${prefix}welcome on/off - Enable or disable welcome messages  
┃ ✍️ ${prefix}setwelcome <message> - Set a custom welcome message  
┃ 📜 ${prefix}group info <description> - Update the group description  
┃ 🏷️ ${prefix}group name <new_name> - Update the group name  
┃ 🖼️ ${prefix}group pic - Update the group profile picture  
┃ 📊 ${prefix}poll <question>\n<option1>\n<option2> - Create a poll  
┃ 🛑 ${prefix}endpoll - End the current poll  
┃ 🚪 ${prefix}kick <@user> - Remove a member from the group  
┃ ➕ ${prefix}add <number> - Add a member to the group  
┃ ⬆️ ${prefix}promote <@user> - Promote a member to admin  
┃ ⬇️ ${prefix}demote <@user> - Demote an admin to a regular member  
┃ 🧹 ${prefix}clear chat/media - Clear messages in the group  
┃ 🔒 ${prefix}mute - Mute the group (only admins can send messages)  
┃ 🔓 ${prefix}unmute - Unmute the group (all members can send messages)  
┃ 🚪 ${prefix}kickall - Remove all non-admin members from the group  
┃ 📢 ${prefix}announce <interval> <message> - Start announcements  
┃ 🛑 ${prefix}announce stop - Stop announcements  
┃ 🔗 ${prefix}group link - Get the group invite link  
┃ 🔄 ${prefix}group revoke - Revoke the group invite link  
╰───────────────────────╯

📌 𝗨𝗧𝗜𝗟𝗜𝗧𝗬 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦:
╭───────────────────────╮
┃ 🗑️ ${prefix}delete - Delete a message sent by the bot  
┃ 👁️ ${prefix}view - Repost view-once media  
┃ 👀 ${prefix}status on - Enable status viewing  
┃ 🚫 ${prefix}status off - Disable status viewing  
┃ ✏️ ${prefix}setname <name> - Update the bot's display name  
┃ 🖼️ ${prefix}setprofilepic - Set the bot's profile picture  
┃ ✏️ ${prefix}setstatus <status> - Update the bot's "About Me" status  
┃ 🔄 ${prefix}presence <type> - Set the bot's presence (e.g., available, composing)  
╰───────────────────────╯

📌 𝗣𝗥𝗢𝗧𝗘𝗖𝗧𝗜𝗢𝗡 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦:
╭───────────────────────╮
┃ 🔗 ${prefix}antilink on/off - Enable or disable Anti-Link for the group  
┃ 🔗 ${prefix}antilink warncount <number> - Set the warning count for Anti-Link  
┃ 🔗 ${prefix}antilink bypassadmin - Enable bypass for group admins  
┃ 🔗 ${prefix}antilink dbadmin - Disable bypass for group admins  
┃ 🔗 ${prefix}antilink bypass @user - Add a specific user to the bypass list  
┃ 🔗 ${prefix}antilink db @user - Remove a specific user from the bypass list  
┃ 🔗 ${prefix}antilink list - Display the current Anti-Link settings  
╰───────────────────────╯

📌 𝗖𝗢𝗠𝗠𝗨𝗡𝗜𝗧𝗬 & 𝗚𝗥𝗢𝗨𝗣 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦:
╭───────────────────────╮
┃ 👥 ${prefix}create group <name> - Create a new group in the current community  
┃ 🏢 ${prefix}create NG <name> - Create a new group outside any community  
┃ ❌ ${prefix}destroy group - Destroy the current group (remove all users and delete the group)  
┃ 📢 ${prefix}admin - Tag all admins in the group  
╰───────────────────────╯

╰━━━〘 🚀 𝗧𝗲𝗰𝗵𝗶𝘁𝗼𝗼𝗻 - 𝗘𝗻𝗵𝗮𝗻𝗰𝗶𝗻𝗴 𝗬𝗼𝘂𝗿 𝗖𝗵𝗮𝘁𝘀! 🚀 〙━━━╯
    `;
};

module.exports = {
    getMenu,
};