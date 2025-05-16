const supabase = require('../supabaseClient');
const path = require('path');
const fs = require('fs');
const { deleteSessionFromMemory } = require('./models/memory');
const { deleteSessionFromSupabase, listSessionsFromSupabase } = require('./models/supabaseAuthState'); // MongoDB session handlers
const sessionsDir = path.join(__dirname, '../../sessions');
const { botInstances } = require('../utils/globalStore'); // Import the bot instances
const { deleteUserMetrics } = require('./models/metrics'); // Import the in-memory metrics map

/**
 * Add or update a user in the `users` table in Supabase.
 * @param {string} userId - The user's ID (phone number).
 * @param {string} name - The user's name.
 * @param {string} lid - The user's WhatsApp LID.
 * @param {string} id - The user's WhatsApp ID.
 * @param {string} dateCreated - The date the user was created.
 * @returns {Promise<void>}
 */
const addUser = async (userId, name, lid, id, dateCreated, authId) => {
    const normalizedLid = lid ? lid.split('@')[0].split(':')[0] : 'N/A'; // Normalize the LID
    const normalizedId = id ? id.split('@')[0].split(':')[0] : 'N/A';   // Normalize the ID

    try {
        // Check if the user already exists
        const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('user_id, is_first_time')
            .eq('user_id', userId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error(`❌ Error checking existing user ${userId}:`, fetchError);
            throw fetchError;
        }

        if (existingUser) {
            console.log(`⚠️ User ${userId} already exists in the database. Skipping is_first_time reset.`);
        }

        // Upsert the user, but only set is_first_time to true for new users
        const { error } = await supabase
            .from('users')
            .upsert(
                {
                    user_id: userId,
                    name: name || 'Unknown', // Default to 'Unknown' if name is not provided
                    lid: normalizedLid,
                    id: normalizedId,
                    date_created: dateCreated || new Date().toISOString(),
                    is_first_time: existingUser ? existingUser.is_first_time : false, // Preserve existing value
                    auth_id: authId || null, // Optional auth_id
                },
                { onConflict: ['user_id'] } // Update if the user already exists
            );

        if (error) {
            console.error(`❌ Error saving user ${userId} to the database:`, error);
            throw error;
        }

        console.log(`✅ User ${userId} saved to the database.`);
    } catch (error) {
        console.error(`❌ Unexpected error saving user ${userId} to the database:`, error);
        throw error;
    }
};

/**
 * Get the user ID from the database.
 * @param {string} userId - The user's ID (phone number).
 * @param {string} lid - The user's WhatsApp LID.
 * @param {string} id - The user's WhatsApp ID.
 * @param {string} authId - The user's Auth ID.
 * @returns {Promise<string|null>} - The user ID if found, or null.
 */
const getUser = async (userId, lid, id, authId) => {
    console.log(`🔍 Fetching user ${userId} from the database...`);

    if (!userId) {
        console.error(`❌ Invalid userId: ${userId}. Cannot fetch user.`);
        return null;
    }

    try {
        // Build the query dynamically to exclude undefined or null values
        let query = supabase.from('users').select('*').eq('user_id', userId);

        if (lid) {
            query = query.eq('lid', lid);
        }
        if (id) {
            query = query.eq('id', id);
        }
        if (authId) {
            query = query.eq('auth_id', authId);
        }

        const { data, error } = await query.single();

       if (error && error.code === 'PGRST116') {
            console.log(`⚠️ User ${userId} not found in the database.`);
            return null;
        }

        if (!data) {
            console.log(`⚠️ User ${userId} not found in the database.`);
            return null;
        }
        return data;
    } catch (error) {
        console.error(`❌ Unexpected error fetching user ${userId}:`, error);
        return null;
    }
};
/**
 * Get all users from the `users` table in Supabase.
 * @returns {Promise<object[]>} - A list of all users.
 */
const getAllUsers = async () => {
   const normalizedUserId = normalizeUserId(userId); // Normalize userId
   
       const { data, error } = await supabase
           .from('users')
           .select('*')
           .eq('user_id', normalizedUserId)
           .single();
   
       if (error && error.code !== 'PGRST116') {
           console.error(`❌ Error fetching user from users table for user ID ${normalizedUserId}:`, error);
           throw error;
       }
   
       if (!data) {
           console.log(`⚠️ User with ID ${normalizedUserId} not found in users table.`);
           return null;
       }
   
       console.log(`✅ User fetched from users table:`, data);
       return data;
   };

/**
 * Delete a user from the database.
 * @param {string} userId - The user's ID to delete.
 * @returns {Promise<object>} - The result of the database operation.
 */
const deleteUser = async (userId) => {
    const { data, error } = await supabase
        .from('users') // Replace 'users' with your actual table name
        .delete()
        .eq('user_id', userId);

    if (error) {
        console.error('Error deleting user from database:', error);
        throw error;
    }

    console.log('User deleted from database successfully:', data);
    return data;
};

const getGroupModeFromDatabase = async (userId, groupId) => {
    try {
        const { data, error } = await supabase
            .from('group_modes')
            .select('mode')
            .eq('user_id', userId)
            .eq('group_id', groupId)
            .single(); // Expect a single row

        if (error && error.code === 'PGRST116') {
            console.log(`⚠️ No group mode found for user ${userId} in group ${groupId}.`);
            return null; // Return null if no mode exists
        }

        if (error) {
            console.error(`❌ Error fetching group mode for user ${userId} in group ${groupId}:`, error);
            throw error;
        }
    } catch (error) {
        console.error(`❌ Unexpected error fetching group mode for user ${userId} in group ${groupId}:`, error);
        return null; // Return null in case of an unexpected error
    }
};
/**
 * Save the group mode for a user-group combination in the `group_modes` table in Supabase.
 * If the combination does not exist, it will be inserted with the default mode.
 * @param {string} userId - The user's ID.
 * @param {string} groupId - The group ID.
 * @param {string} mode - The group mode to save.
 * @returns {Promise<void>}
 */
const saveGroupMode = async (userId, groupId, mode) => {
    if (!userId || !groupId) {
        console.error(`❌ Invalid userId (${userId}) or groupId (${groupId}). Cannot save group mode.`);
        return;
    }

    try {
        // Check if the combination already exists
        const { data: existingMode, error: fetchError } = await supabase
            .from('group_modes')
            .select('user_id, group_id')
            .eq('user_id', userId)
            .eq('group_id', groupId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error(`❌ Error checking existing group mode for user ${userId} in group ${groupId}:`, fetchError);
            throw fetchError;
        }

        if (!existingMode) {
            console.log(`⚠️ No existing group mode found for user ${userId} in group ${groupId}. Adding a new record.`);
        }

        // Insert or update the group mode
        const { error } = await supabase
            .from('group_modes')
            .upsert(
                {
                    user_id: userId,
                    group_id: groupId,
                    mode: mode || 'default', // Default mode if none is provided
                    updated_at: new Date().toISOString(),
                },
                { onConflict: ['user_id', 'group_id'] } // Reference the primary key columns
            );

        if (error) {
            console.error(`❌ Error saving group mode for user ${userId} in group ${groupId}:`, error);
            throw error;
        }

        console.log(`✅ Group mode for user ${userId} in group ${groupId} saved to database.`);
    } catch (error) {
        console.error(`❌ Failed to save group mode for user ${userId} in group ${groupId}:`, error);
        throw error;
    }
};
/**
 * Sync all users in the `users` table to the `group_modes` table with a default mode.
 * @returns {Promise<void>}
 */
const syncUsersToGroupModes = async () => {
    try {
        // Fetch all users from the `users` table
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('user_id');

        if (usersError) {
            console.error('❌ Error fetching users from Supabase:', usersError);
            throw usersError;
        }

        // Fetch all existing group modes
        const { data: groupModes, error: groupModesError } = await supabase
            .from('group_modes')
            .select('user_id');

        if (groupModesError) {
            console.error('❌ Error fetching group modes from Supabase:', groupModesError);
            throw groupModesError;
        }

        const existingUserIds = groupModes.map((groupMode) => groupMode.user_id);

        // Add missing users to the `group_modes` table with a default mode
        for (const user of users) {
            if (!existingUserIds.includes(user.user_id)) {
                await saveGroupMode(user.user_id, 'default_group', 'me'); // Default group ID placeholder
                console.log(`✅ User ${user.user_id} added to group_modes with default mode "me".`);
            }
        }
    } catch (error) {
        console.error('❌ Failed to sync users to group_modes:', error);
    }
};



/**
 * Get the tagformat setting for a user.
 * @param {string} userId - The user's ID.
 * @returns {Promise<boolean>} - The tagformat setting (true for formatted, false for plain).
 */
const getUserTagFormat = async (userId) => {
    const { data, error } = await supabase
        .from('users')
        .select('tagformat')
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error(`❌ Error fetching tagformat for user ${userId}:`, error);
        throw error;
    }

    return data?.tagformat ?? true; // Default to true (formatted) if not found
};

/**
 * Update the tagformat setting for a user.
 * @param {string} userId - The user's ID.
 * @param {boolean} tagFormat - The new tagformat setting (true for formatted, false for plain).
 * @returns {Promise<void>}
 */
const updateUserTagFormat = async (userId, tagFormat) => {
    const { error } = await supabase
        .from('users')
        .update({ tagformat: tagFormat })
        .eq('user_id', userId);

    if (error) {
        console.error(`❌ Error updating tagformat for user ${userId}:`, error);
        throw error;
    }

    console.log(`✅ Tagformat for user ${userId} updated to "${tagFormat ? 'on' : 'off'}".`);
};

/**
 * Fetch a user from the `users` table by user ID.
 * @param {string} userId - The user's ID.
 * @returns {Promise<object|null>} - The user data or null if not found.
 */
const getUserFromUsersTable = async (userId) => {
    console.log(`🔍 Fetching user from users table for user ID: ${userId}...`);

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error(`❌ Error fetching user from users table for user ID ${userId}:`, error);
        throw error;
    }

    if (!data) {
        console.log(`⚠️ User with ID ${userId} not found in users table.`);
        return null;
    }

    console.log(`✅ User fetched from users table:`, data);
    return data;
};

/**
 * Get the status settings for a user.
 * @param {string} userId - The user's ID.
 * @returns {Promise<object>} - The user's status settings.
 */
const getUserStatusSettings = async (userId) => {
    const { data, error } = await supabase
        .from('users')
        .select('status_seen, status_react')
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error(`❌ Error fetching status settings for user ${userId}:`, error);
        return { status_seen: false, status_react: false }; // Default settings
    }

    return data || { status_seen: false, status_react: false };
};

/**
 * Update the status settings for a user.
 * @param {string} userId - The user's ID.
 * @param {object} settings - The new status settings.
 * @returns {Promise<void>}
 */
const updateUserStatusSettings = async (userId, settings) => {
    const { error } = await supabase
        .from('users')
        .update(settings)
        .eq('user_id', userId);

    if (error) {
        console.error(`❌ Error updating status settings for user ${userId}:`, error);
        throw error;
    }

    console.log(`✅ Status settings for user ${userId} updated to:`, settings);
};

function getPossibleUserKeys(phoneNumber) {
    const normalized = String(phoneNumber).replace(/\D/g, '');
    return [
        normalized,
        normalized + '@s.whatsapp.net',
        normalized + '@lid',
        String(phoneNumber),
    ];
}


const deleteUserData = async (phoneNumber) => {
    try {
        console.log(`🗑️ Deleting all data for user: ${phoneNumber}`);

        // Get all possible keys for this user
        const keys = getPossibleUserKeys(phoneNumber);

        // 1. Stop and remove the bot instance for all possible keys
        for (const key of keys) {
            if (botInstances[key]) {
                console.log(`🔄 Stopping bot instance for user: ${key}`);
                try {
                    const botInstance = botInstances[key];
                    if (botInstance.sock && botInstance.sock.ws) {
                        botInstance.disconnectReason = 'intentional';
                        await botInstance.sock.ws.close();
                        console.log(`✅ Bot instance for user ${key} stopped successfully.`);
                    } else {
                        console.warn(`⚠️ Bot instance for user ${key} does not have a valid WebSocket connection.`);
                    }
                    delete botInstances[key];
                } catch (error) {
                    console.error(`❌ Failed to stop bot instance for user ${key}:`, error.message);
                }
            } else {
                console.log(`⚠️ No active bot instance found for user: ${key}`);
            }

            // 2. Delete the user's session from memory for all keys
            deleteSessionFromMemory(key);
            console.log(`✅ Deleted session from memory for user: ${key}`);

            // 3. Delete metrics for the user for all keys
            deleteUserMetrics(key);
            console.log(`✅ Deleted metrics for user: ${key}`);

            // 4. Delete the user's session folder (if applicable)
            const userSessionPath = path.join(sessionsDir, key);
            if (fs.existsSync(userSessionPath)) {
                fs.rmSync(userSessionPath, { recursive: true, force: true });
                console.log(`✅ Deleted session folder for user: ${key}`);
            } else {
                console.log(`⚠️ Session folder for user ${key} does not exist.`);
            }
        }

        // 5. Delete the user's session from Supabase (only needs to be done once)
        await deleteSessionFromSupabase(phoneNumber);
        console.log(`✅ Deleted session from Supabase for user: ${phoneNumber}`);

        // 6. Delete the user's data from the `users` table in Supabase
        const { error: userError } = await supabase
            .from('users')
            .delete()
            .eq('user_id', phoneNumber);

        if (userError) {
            console.error(`❌ Error deleting user ${phoneNumber} from the database:`, userError);
        } else {
            console.log(`✅ Deleted user ${phoneNumber} from the database.`);
        }

        // 7. Delete the user's group modes from the `group_modes` table in Supabase
        const { error: groupModesError } = await supabase
            .from('group_modes')
            .delete()
            .eq('user_id', phoneNumber);

        if (groupModesError) {
            console.error(`❌ Error deleting group modes for user ${phoneNumber}:`, groupModesError);
        } else {
            console.log(`✅ Deleted group modes for user ${phoneNumber}.`);
        }

        console.log(`✅ All data for user ${phoneNumber} deleted successfully.`);
    } catch (error) {
        console.error(`❌ Failed to delete data for user ${phoneNumber}:`, error);
    }
};


/**
 * Delete all users and their data.
 */
const deleteAllUsers = async () => {
    try {
        console.log('🔄 Fetching all users from Supabase...');
        const sessions = await listSessionsFromSupabase(); // Fetch all sessions from Supabase

        for (const session of sessions) {
            const phoneNumber = session.phoneNumber; // Extract phoneNumber
            if (!phoneNumber) {
                console.warn('⚠️ Skipping undefined phone number.');
                continue;
            }

            console.log(`🗑️ Deleting all data for user: ${phoneNumber}`);
            await deleteUserData(phoneNumber); // Pass only the phoneNumber string
        }

        console.log('✅ All users deleted successfully.');
    } catch (error) {
        console.error('❌ Failed to delete all users:', error.message);
        throw error;
    }
};


module.exports = {
    getUser,
    addUser,
    getAllUsers,
    deleteUser,
    saveGroupMode,
    getGroupModeFromDatabase,
    syncUsersToGroupModes,
    getUserTagFormat,
    updateUserTagFormat,
    getUserFromUsersTable,
    getUserStatusSettings,
    updateUserStatusSettings,
    deleteUserData,
    deleteAllUsers,
};
