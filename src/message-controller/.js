 // Detect view-once media
 const viewOnceMedia = detectViewOnceMedia(message);
 if (viewOnceMedia) {
     console.log('📸 View-once media detected. Processing...');
 
     try {
         const downloadsDir = path.join(__dirname, '../../downloads');
         if (!fs.existsSync(downloadsDir)) {
             fs.mkdirSync(downloadsDir, { recursive: true });
         }
 
        
 
         // Properly extract data
         const { mediaType, fullMessage } = viewOnceMedia;
         const mediaContent = fullMessage.message?.viewOnceMessage?.message?.[mediaType];
 
         if (!mediaContent?.directPath || !mediaContent?.mediaKey) {
             console.error('❌ View-once media is missing required fields (directPath or mediaKey).');
             return;
         }
 
         const buffer = await downloadMediaMessage(
    { message: { [mediaType]: mediaContent }, key: fullMessage.key },
    'buffer',
    { logger: console }
);

if (!buffer) {
    console.error('❌ Failed to download view-once media.');
    return;
}

// Send the media back to the same chat
const safeSender = sender.replace(/[^0-9]/g, "");
await sock.sendMessage(
  remoteJid,
  {
    image: buffer,
    caption: `👁️ View-once media from @${safeSender}`,
    mentions: [sender]
  },
  { quoted: message }
);

console.log(`✅ View-once media sent to chat instead of being saved.`);


     } catch (error) {
         console.error('❌ Failed to download view-once media:', error);
     }
 
     return;
 }

   // Handle commands in DMs
   if (!isGroup && messageContent.startsWith(userPrefix)) {
    console.log(`✅ Processing command from ${realSender} in DM.`);
    await handleCommand(sock, message, userId, messageContent); // Pass messageContent to cmdHandler.js
    return;
}

// Handle group commands
if (isGroup && messageContent.startsWith(userPrefix)) {
console.log(`✅ Processing command from ${realSender} in group ${remoteJid}.`);

// Fetch the group mode
const groupMode = await getGroupMode(remoteJid);
console.log(`🔍 Group mode for ${remoteJid}: ${groupMode}`);

// Define bot owner IDs (both id and lid)
const botOwnerIds = [
    userId, // The bot's user ID
    sock.user?.id.split(':')[0].split('@')[0], // The bot's ID
    sock.user?.lid?.split(':')[0].split('@')[0], // The bot's LID
].filter(Boolean); // Filter out undefined or null values
console.log(`🔍 Bot owner IDs: ${botOwnerIds}`);

// Check if the command is from the admin bot instance
if (userId === ADMIN_NUMBER) {
    console.log(`✅ Command is being processed by the admin bot instance (${ADMIN_NUMBER}).`);
    await handleCommand(sock, message, userId, messageContent); // Pass messageContent to cmdHandler.js
    return;
}

// Check if the command is from the owner of the new user's bot instance
if (!botOwnerIds.includes(realSender)) {
    console.log(`❌ Command denied: Sender ${realSender} is not the bot owner in group ${remoteJid}.`);
    return;
}

// Allow the bot owner to bypass restrictions
if (realSender === userId) {
    console.log(`✅ Command from bot owner (${realSender}) is allowed.`);
    await handleCommand(sock, message, userId, messageContent); // Pass messageContent to cmdHandler.js
    return;
}

// Check if the group mode is "admin"
if (groupMode === 'admin') {
    const groupMetadata = await sock.groupMetadata(remoteJid);
    const isAdmin = groupMetadata.participants.some(
        (participant) => participant.id === `${realSender}@s.whatsapp.net` && participant.admin
    );

    if (!isAdmin) {
        console.log(`❌ Command denied: Sender ${realSender} is not an admin in group ${remoteJid}.`);
        await sock.sendMessage(remoteJid, {
            text: '❌ Only group admins can use commands in this group.',
        });
        return;
    }

    console.log(`✅ Command from ${realSender} in group ${remoteJid} is allowed (mode: "admin").`);
    await handleCommand(sock, message, userId, messageContent); // Pass messageContent to cmdHandler.js
    return;
}

// Check if the group mode is "me"
if (groupMode === 'me') {
    console.log(`🔍 Group mode for ${remoteJid}: ${groupMode}`);

    // Check if the sender is the bot owner
    if (!botOwnerIds.includes(realSender)) {
        console.log(`❌ Command denied: Sender ${realSender} is not the bot owner in group ${remoteJid}.`);
        return;
    }

    console.log(`✅ Command from bot owner (${realSender}) is allowed in group ${remoteJid} (mode: "me").`);
    await handleCommand(sock, message, userId, messageContent); // Pass messageContent to cmdHandler.js
    return;
}

// If the group mode is unsupported, log and ignore the command
console.log(`❌ Ignoring command from ${realSender} in group ${remoteJid} (unsupported mode: "${groupMode}").`);
return;
}

// ✅ User registered successfully with uuid_auth_id: 5fbff99f-25bd-4ae1-be31-957acd720a0e

// the auth id i want it as four or six digit not this long auth id

//  Saving user to user_auth table...
// ✅ User registered successfully with uuid_auth_id: 5fbff99f-25bd-4ae1-be31-957acd720a0e
// 📥 Received request to fetch bot info for authId: undefined
// 🔍 Checking if user exists in user_auth table...
// 📥 Received request for analytics with authId: undefined
// ⚠️ No analytics data found for authId: undefined
// 📥 Received request for activity log with authId: undefined
// ⚠️ No activity log found for authId: undefined
// 🔗 New WebSocket connection: HGMLZtE6yOO3I6ZwAAAD
// 🔗 A client connected to WebSocket.
// 📥 Received authId: undefined for socket: HGMLZtE6yOO3I6ZwAAAD
// ❌ Error fetching user from user_auth table: invalid input syntax for type uuid: "undefined"
// ❌ Error fetching user email from Supabase: invalid input syntax for type uuid: "undefined"
// ❌ Error in getUserSummary: Failed to fetch user email.
// ❌ Error fetching user summary: Failed to fetch user email.
// ❌ WebSocket disconnected: HGMLZtE6yOO3I6ZwAAAD
// ❌ A client disconnected from WebSocket.
// 📥 Received request to fetch bot info for authId: undefined
// 🔍 Checking if user exists in user_auth table...
// 📥 Received request for analytics with authId: undefined
// ⚠️ No analytics data found for authId: undefined
// 📥 Received request for activity log with authId: undefined
// ⚠️ No activity log found for authId: undefined
// 🔗 New WebSocket connection: 3VPaBvoIAbFEI-DUAAAF
// 🔗 A client connected to WebSocket.
// 📥 Received authId: undefined for socket: 3VPaBvoIAbFEI-DUAAAF
// ❌ Error fetching user from user_auth table: invalid input syntax for type uuid: "undefined"
// ❌ Error fetching user email from Supabase: invalid input syntax for type uuid: "undefined"
// ❌ Error in getUserSummary: Failed to fetch user email.
// ❌ Error fetching user summary: Failed to fetch user email.
