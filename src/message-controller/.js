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