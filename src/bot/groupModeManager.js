const supabase = require('../supabaseClient'); // Import the Supabase client

/**
 * Function to get the mode for a group from the database.
 * @param {string} groupId - The group ID.
 * @returns {Promise<string>} - The mode for the group ("me" or "admin").
 */
const getGroupMode = async (groupId) => {
    if (!groupId) {
        console.error(`❌ Group ID is undefined. Cannot fetch group mode.`);
        return 'me'; // Default to "me" if groupId is invalid
    }

    console.log(`🔍 Fetching group mode for group ${groupId} from database...`);

    try {
        const { data, error } = await supabase
            .from('group_modes')
            .select('mode')
            .eq('group_id', groupId)
            .single();

        if (error && error.code === 'PGRST116') {
            console.log(`⚠️ No group mode found for group ${groupId}. Defaulting to "me".`);
            return 'me'; // Default to "me" if no mode exists
        }

        if (error) {
            console.error(`❌ Failed to fetch group mode for group ${groupId}:`, error);
            return 'me'; // Default to "me" if an error occurs
        }

        console.log(`✅ Group mode for group ${groupId} is "${data.mode || 'me'}".`);
        return data.mode || 'me'; // Default to "me" if no mode is set
    } catch (error) {
        console.error(`❌ Unexpected error fetching group mode for group ${groupId}:`, error);
        return 'me'; // Default to "me" if an unexpected error occurs
    }
};

/**
 * Set the group mode for a user-group combination in the `group_modes` table in Supabase.
 * @param {string} userId - The user's ID.
 * @param {string} groupId - The group ID.
 * @param {string} mode - The new group mode ("me" or "admin").
 */
const setGroupMode = async (userId, groupId, mode) => {
    if (!['me', 'admin'].includes(mode)) {
        console.error(`❌ Invalid mode "${mode}" for group ${groupId}`);
        throw new Error(`Invalid mode "${mode}"`);
    }

    console.log(`🔍 Setting group mode for user ${userId} in group ${groupId} to "${mode}"...`);

    try {
        const { data, error } = await supabase
            .from('group_modes')
            .upsert(
                {
                    user_id: userId, // Include the user ID
                    group_id: groupId,
                    mode,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: ['user_id', 'group_id'] } // Reference the primary key columns
            );

        if (error) {
            console.error(`❌ Failed to save group mode for user ${userId} in group ${groupId}:`, error);
            throw error;
        }

        console.log(`✅ Group mode for user ${userId} in group ${groupId} saved as "${mode}".`);
    } catch (error) {
        console.error(`❌ Unexpected error saving group mode for user ${userId} in group ${groupId}:`, error);
        throw error;
    }
};

/**
 * Update the group mode when the bot performs an action in a group.
 * Only update if the group mode does not already exist in the database.
 * @param {string} userId - The user's ID.
 * @param {string} groupId - The group ID.
 */
const updateGroupModeOnAction = async (userId, groupId) => {
    if (!groupId) {
        console.error(`❌ Group ID is undefined. Cannot update group mode for user ${userId}.`);
        return;
    }

    console.log(`🔍 Updating group mode. User ID: ${userId}, Group ID: ${groupId}`);

    try {
        // Check if the group mode already exists
        const existingMode = await getGroupMode(groupId);
        if (existingMode) {
            console.log(`ℹ️ Group mode for user ${userId} in group ${groupId} is already set to "${existingMode}". No update needed.`);
            return; // Do not overwrite the existing mode
        }

        // If no mode exists, set the default mode to "me"
        await setGroupMode(userId, groupId, 'me');
        console.log(`✅ Group mode for user ${userId} in group ${groupId} initialized to "me".`);
    } catch (error) {
        console.error(`❌ Failed to update group mode for user ${userId} in group ${groupId}:`, error);
    }
};

/**
 * Save the group mode for a user.
 * @param {string} userId - The user's ID.
 * @param {string} groupId - The group ID.
 * @param {string} mode - The group mode ("me", "admin", "all").
 * @returns {Promise<void>}
 */
const saveGroupMode = async (userId, groupId, mode) => {
    try {
        const { error } = await supabase
            .from('group_modes')
            .upsert({ user_id: userId, group_id: groupId, mode }, { onConflict: ['user_id', 'group_id'] });

        if (error) {
            console.error(`❌ Failed to save group mode for user ${userId} in group ${groupId}:`, error);
            throw error;
        }

        console.log(`✅ Group mode "${mode}" saved for user ${userId} in group ${groupId}.`);
    } catch (error) {
        console.error(`❌ Error saving group mode for user ${userId}:`, error);
        throw error;
    }
};

module.exports = { getGroupMode, setGroupMode, updateGroupModeOnAction, saveGroupMode};