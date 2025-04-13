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
╰───────────────────────╯

📌 𝗖𝗢𝗠𝗠𝗨𝗡𝗜𝗧𝗬 & 𝗚𝗥𝗢𝗨𝗣 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦:
╭───────────────────────╮
┃ 👥 ${prefix}create group <name> - Create a new group in the current community  
┃ 🏢 ${prefix}create NG <name> - Create a new group outside any community  
┃ ❌ ${prefix}destroy group - Destroy the current group (remove all users and delete the group)  
╰───────────────────────╯

📌 𝗔𝗗𝗠𝗜𝗡 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦:
╭───────────────────────╮
┃ 🚪 ${prefix}kick <@user> - Remove a member from the group  
┃ ➕ ${prefix}add <number> - Add a member to the group  
┃ ⬆️ ${prefix}promote <@user> - Promote a member to admin  
┃ ⬇️ ${prefix}demote <@user> - Demote an admin to a regular member  
╰───────────────────────╯

📌 𝗨𝗧𝗜𝗟𝗜𝗧𝗬 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦:
╭───────────────────────╮
┃ 🗑️ ${prefix}delete - Delete a message sent by the bot  
┃ 👁️ ${prefix}view - Repost view-once media  
┃ 👀 ${prefix}status on - Enable status viewing  
┃ 🚫 ${prefix}status off - Disable status viewing  
╰───────────────────────╯

📌 𝗣𝗥𝗢𝗧𝗘𝗖𝗧𝗜𝗢𝗡 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦:
╭───────────────────────╮
┃ 🔗 ${prefix}antilink on/off - Enables or disables Anti-Link for the group  
┃ 🔗 ${prefix}antilink warncount <number> - Sets the warning count for Anti-Link  
┃ 🔗 ${prefix}antilink bypassadmin - Enables bypass for group admins  
┃ 🔗 ${prefix}antilink dbadmin - Disables bypass for group admins  
┃ 🔗 ${prefix}antilink bypass @user - Adds a specific user to the bypass list  
┃ 🔗 ${prefix}antilink db @user - Removes a specific user from the bypass list  
┃ 🔗 ${prefix}antilink list - Displays the current Anti-Link settings  
╰───────────────────────╯

╰━━━〘 🚀 𝗧𝗲𝗰𝗵𝗶𝘁𝗼𝗼𝗻 - 𝗘𝗻𝗵𝗮𝗻𝗰𝗶𝗻𝗴 𝗬𝗼𝘂𝗿 𝗖𝗵𝗮𝘁𝘀! 🚀 〙━━━╯
    `;
};



const getAdminMenu = () => {
    return `
╭━━━〘 🌟 𝗔𝗗𝗠𝗜𝗡 𝗠𝗘𝗡𝗨 🌟 〙━━━╮

📌 𝗔𝗗𝗠𝗜𝗡 𝗦𝗘𝗦𝗦𝗜𝗢𝗡 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦:
╭───────────────────────╮
┃ ➕ *cmd add <phone_number>* - Add a new user session  
┃ ❌ *cmd delete <phone_number>* - Delete a user's session  
┃ 📋 *cmd list* - List all active sessions  
┃ 📊 *cmd status* - Check the connection status of all sessions  
┃ ⏸️ *cmd pause <phone_number>* - Pause a user's session  
┃ ▶️ *cmd resume <phone_number>* - Resume a paused session  
┃ 📜 *cmd menu* - Show the admin menu  
┃ 🔄 *cmd sync* - Perform manual sync from Supabase to local files  
╰───────────────────────╯

╰━━━〘 🚀 𝗧𝗲𝗰𝗵𝗶𝘁𝗼𝗼𝗻 - 𝗘𝗻𝗵𝗮𝗻𝗰𝗶𝗻𝗴 𝗬𝗼𝘂𝗿 𝗖𝗵𝗮𝘁𝘀! 🚀 〙━━━╯
    `;

};
module.exports = {
    getMenu,
    getAdminMenu,
};