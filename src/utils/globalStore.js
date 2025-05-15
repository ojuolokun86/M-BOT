
// Global object to store bot instances
const botInstances = {}; // Store bot instances
const antideleteSettings = {}; // Store antidelete settings for each chat
const groupMessages = {}; // In-memory store for group messages
const pendingUsernameRequests = new Set(); // Store pending username requests
const viewOnceMediaStore = {}; // Store view-once media messages
const mediaStore = new Map(); // Key: message ID, Value: media data
const deletedMessagesByBot = {}; 
const activePolls = new Map(); // Store active polls
const announcementIntervals = {}; // Store announcement intervals
const restartQueue = {}; // Queue to store restart requests
let globalPresenceType = null; // Changed from const to let
const presenceSettings = {};


// Cleanup logic for mediaStore
const MAX_MEDIA_FILES = 100; // Maximum number of files in memory
const MEDIA_EXPIRATION_TIME = 30 * 60 * 1000; // 30 minutes in milliseconds

const cleanupMediaStore = () => {
    const now = Date.now();
    let removedCount = 0;

    // Remove expired files
    for (const [messageId, mediaData] of mediaStore.entries()) {
        if (now - mediaData.timestamp > MEDIA_EXPIRATION_TIME) {
            mediaStore.delete(messageId);
            removedCount++;
        }
    }

    // If the store exceeds the maximum limit, remove the oldest files
    if (mediaStore.size > MAX_MEDIA_FILES) {
        const excessCount = mediaStore.size - MAX_MEDIA_FILES;
        const keysToRemove = Array.from(mediaStore.keys()).slice(0, excessCount);

        for (const key of keysToRemove) {
            mediaStore.delete(key);
            removedCount++;
        }
    }

    console.log(`🗑️ Cleanup completed. Removed ${removedCount} files from memory.`);
};

// Schedule cleanup every 30 minutes
setInterval(cleanupMediaStore, 30 * 60 * 1000); // Run cleanup every 30 minutes

// Export the objects
module.exports = {
    botInstances,
    presenceSettings,
    antideleteSettings,
    groupMessages,
    pendingUsernameRequests,
    viewOnceMediaStore,
    mediaStore,
    deletedMessagesByBot, // Store deleted messages by bot
    activePolls,
    announcementIntervals,
    restartQueue,
    globalPresenceType,
};