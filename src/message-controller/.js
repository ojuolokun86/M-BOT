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

