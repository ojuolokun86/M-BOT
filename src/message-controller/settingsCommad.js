const { downloadMediaMessage } = require('@whiskeysockets/baileys'); // Import media download function
const { sendToChat } = require('../utils/messageUtils'); // Import the sendToChat function
const { generateProfilePicture } = require('@whiskeysockets/baileys'); // Import the function
const globalStore = require('../utils/globalStore'); // Import the global store


/**
 * Handle settings-related commands.
 * @param {object} sock - The WhatsApp socket instance.
 * @param {object} message - The incoming message object.
 * @param {string} remoteJid - The chat ID.
 * @param {string} userId - The bot owner's ID.
 * @param {string} command - The settings command.
 * @param {string[]} args - The command arguments.
 * @returns {Promise<void>}
 */
const handleSettingsCommand = async (sock, message, remoteJid, userId, command, args, botInstance, realSender, normalizedUserId, botLid) => {
    try {
            // Restrict all commands to the bot owner
            if (realSender !== normalizedUserId && realSender !== botLid) {
            await sendToChat(botInstance, remoteJid, {
                message: `❌ Only the bot owner can use this command.`,
            });
            return;
        }
    
        
        switch (command) {
            case 'setpic':
                console.log('🖼️ Executing "setprofilepic" command...');
                try {
                    // Check if the message is a reply to an image
                    const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                    const quotedMessageType = quotedMessage ? Object.keys(quotedMessage)[0] : null;
            
                    if (quotedMessageType !== 'imageMessage') {
                        console.error('❌ No image found in the quoted message.');
                        await sendToChat(sock, remoteJid, {
                            message: '❌ Please reply to an image message to set it as the profile picture.',
                        });
                        return;
                    }
            
                    // Download the image from the quoted message
                    const imageMessage = quotedMessage.imageMessage;
                    const imageBuffer = await downloadMediaMessage(
                        { message: { imageMessage } },
                        'buffer',
                        {}
                    );
            
                    if (!imageBuffer || imageBuffer.length === 0) {
                        console.error('❌ Failed to download the image. Buffer is empty or corrupted.');
                        await sendToChat(sock, remoteJid, {
                            message: '❌ Failed to download the image. Please try again later.',
                        });
                        return;
                    }
            
                    // Debug the buffer size
                    console.log(`🔍 Image buffer size: ${imageBuffer.length} bytes`);
            
                    // Generate the profile picture using the downloaded buffer
                    let img;
                    try {
                        const result = await generateProfilePicture(imageBuffer);
                        img = result.img;
                        console.log('🔍 Generated profile picture successfully:', result);
                    } catch (error) {
                        console.error('❌ Failed to generate profile picture:', error);
                        await sendToChat(sock, remoteJid, {
                            message: '❌ Failed to process the image. Please try again later.',
                        });
                        return;
                    }
            
                    // Debug the generated image
                    console.log('🔍 Generated image object:', img);
                    // Ensure userId is in JID format
                        const userJid = userId.includes('@s.whatsapp.net') ? userId : `${userId}@s.whatsapp.net`;
                        console.log('🔍 JID to update profile picture for:', userJid);

                        // Set the profile picture
                    try {
                        await sock.updateProfilePicture(userJid, img);
                        console.log('✅ Profile picture updated successfully.');
            
                        await sendToChat(sock, remoteJid, {
                            message: '✅ Profile picture updated successfully!',
                        });
                    } catch (error) {
                        console.error('❌ Failed to update profile picture:', error);
                        await sendToChat(sock, remoteJid, {
                            message: '❌ Failed to update profile picture. Please try again later.',
                        });
                    }
                } catch (error) {
                    console.error('❌ An unexpected error occurred:', error);
                    await sendToChat(sock, remoteJid, {
                        message: '❌ An unexpected error occurred. Please try again later.',
                    });
                }
                break;
                case 'setname':
                    console.log('✏️ Executing "setname" command...');
                    try {
                        // Check if a name is provided
                        const newName = args.join(' ').trim();
                        if (!newName) {
                            console.error('❌ No name provided.');
                            await sendToChat(sock, remoteJid, {
                                message: '❌ Please provide a name to set. Usage: `.setname <name>`',
                            });
                            return;
                        }

                        // Update the bot's display name
                        await sock.updateProfileName(newName);
                        console.log(`✅ Profile name updated successfully to: ${newName}`);

                        await sendToChat(sock, remoteJid, {
                            message: `✅ Profile name updated successfully to: *${newName}*`,
                        });
                    } catch (error) {
                        console.error('❌ Failed to update profile name:', error);
                        await sendToChat(sock, remoteJid, {
                            message: '❌ Failed to update profile name. Please try again later.',
                        });
                    }
                    break;
                    case 'presence':
                        console.log('🔄 Executing "setpresence" command...');
                        try {
                            const presenceType = args[0]; // Assume the first argument is the type (e.g., available, unavailable, etc.)
                            const botInstanceId = userId; // Use the bot owner's ID as the instance ID
                    
                            // List of valid presence types
                            const validPresenceTypes = ['available', 'unavailable', 'composing', 'recording', 'dynamic'];
                    
                            if (!validPresenceTypes.includes(presenceType)) {
                                console.error('❌ Invalid presence type.');
                                await sendToChat(sock, remoteJid, {
                                    message: '❌ Invalid presence type. Please use: available, unavailable, composing, recording, or dynamic.',
                                });
                                return;
                            }
                    
                            if (presenceType === 'dynamic') {
                                // Enable global dynamic presence updates for the bot instance
                                globalStore.presenceSettings[botInstanceId] = {
                                    globalPresenceType: args[1] || 'available', // Default to "available" if no type is provided
                                };
                                console.log(`✅ Global dynamic presence updates enabled with type: ${globalStore.presenceSettings[botInstanceId].globalPresenceType}`);
                                await sendToChat(sock, remoteJid, {
                                    message: `✅ Global dynamic presence updates enabled with type: *${globalStore.presenceSettings[botInstanceId].globalPresenceType}*`,
                                });
                                return;
                            }
                    
                            if (presenceType === 'unavailable') {
                                // Disable global dynamic presence updates for the bot instance
                                delete globalStore.presenceSettings[botInstanceId];
                                console.log('✅ Global dynamic presence updates disabled.');
                                await sendToChat(sock, remoteJid, {
                                    message: '✅ Global dynamic presence updates disabled.',
                                });
                                return;
                            }
                    
                            // Update presence for the specific chat or group
                            try {
                                await botInstance.sendPresenceUpdate(presenceType, remoteJid);
                                console.log(`🔄 Updated presence for: ${remoteJid}`);
                                await sendToChat(sock, remoteJid, {
                                    message: `✅ Presence set to "${presenceType}" for this chat.`,
                                });
                            } catch (err) {
                                console.error(`❌ Failed to update presence for ${remoteJid}:`, err);
                                await sendToChat(sock, remoteJid, {
                                    message: '❌ Failed to update presence. Please try again later.',
                                });
                            }
                        } catch (error) {
                            console.error('❌ An error occurred while updating presence:', error);
                            await sendToChat(sock, remoteJid, {
                                message: '❌ Failed to update presence. Please try again later.',
                            });
                        }
                        break;
                                            

                        case 'setstatus':
                        console.log('✏️ Executing "setstatus" command...');
                        try {
                            // Check if a status message is provided
                            const newStatus = args.join(' ').trim();
                            if (!newStatus) {
                                console.error('❌ No status provided.');
                                await sendToChat(sock, remoteJid, {
                                    message: '❌ Please provide a status to set. Usage: `.setstatus <status>`',
                                });
                                return;
                            }

                            // Update the bot's "About Me" status
                            await sock.updateProfileStatus(newStatus);
                            console.log(`✅ Status updated successfully to: ${newStatus}`);

                            await sendToChat(sock, remoteJid, {
                                message: `✅ Status updated successfully to: *${newStatus}*`,
                            });
                        } catch (error) {
                            console.error('❌ Failed to update status:', error);
                            await sendToChat(sock, remoteJid, {
                                message: '❌ Failed to update status. Please try again later.',
                            });
                        }
                        break;

                        case 'seen':
                        console.log('👁️ Executing "seen" command...');
                        try {
                            const option = args[0]?.toLowerCase(); // Get the first argument (on/off)

                            if (!['on', 'off'].includes(option)) {
                                console.error('❌ Invalid option for "seen" command.');
                                await sendToChat(sock, remoteJid, {
                                    message: '❌ Invalid option. Usage: `.seen on` or `.seen off`',
                                });
                                return;
                            }

                            if (option === 'on') {
                                // Enable "last seen" visibility
                                await sock.sendPresenceUpdate('available', remoteJid);
                                console.log('✅ Last seen visibility enabled.');
                                await sendToChat(sock, remoteJid, {
                                    message: '✅ Last seen visibility has been enabled.',
                                });
                            } else if (option === 'off') {
                                // Disable "last seen" visibility
                                await sock.sendPresenceUpdate('unavailable', remoteJid);
                                console.log('✅ Last seen visibility disabled.');
                                await sendToChat(sock, remoteJid, {
                                    message: '✅ Last seen visibility has been disabled.',
                                });
                            }
                        } catch (error) {
                            console.error('❌ Failed to update last seen visibility:', error);
                            await sendToChat(sock, remoteJid, {
                                message: '❌ Failed to update last seen visibility. Please try again later.',
                            });
                        }
                        break;
        }
    } catch (error) {
        console.error('❌ An error occurred while handling the settings command:', error);
        await sendToChat(sock, remoteJid, {
            message: '❌ An error occurred while processing your request. Please try again later.',
        });
    }
};

module.exports = { handleSettingsCommand };