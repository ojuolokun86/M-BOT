const supabase = require('../supabaseClient');

/**
 * Add a user to the `users` table in Supabase.
 * @param {string} userId - The user's ID.
 * @param {string} dateCreated - The date the user was created.
 * @returns {Promise<void>}
 */
const addUser = async (userId, dateCreated) => {
    const { error } = await supabase
        .from('users') // Replace 'users' with your actual table name
        .insert([{ user_id: userId, date_created: dateCreated }]);

    if (error) {
        console.error(`❌ Error adding user ${userId} to Supabase:`, error);
        throw error;
    }

    console.log(`✅ User ${userId} added to Supabase.`);
};

/**
 * Get all users from the `users` table in Supabase.
 * @returns {Promise<object[]>} - A list of all users.
 */
const getAllUsers = async () => {
    const { data, error } = await supabase
        .from('users') // Replace 'users' with your actual table name
        .select('*');

    if (error) {
        console.error('❌ Error fetching users from Supabase:', error);
        throw error;
    }

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

/**
 * Save admin session in the database.
 * @param {string} adminId - The admin's ID (e.g., phone number).
 * @param {string} sessionData - The admin's session data.
 * @returns {Promise<object>} - The result of the database operation.
 */
const saveAdminSession = async (adminId, sessionData) => {
    const { data, error } = await supabase
        .from('admin') // Replace 'admin' with your actual table name
        .upsert([{ admin_id: adminId, session_data: sessionData }]); // Use upsert to update if exists

    if (error) {
        console.error('Error saving admin session to database:', error);
        throw error;
    }

    console.log('Admin session saved to database successfully:', data);
    return data;
};

/**
 * Get admin session from the database.
 * @param {string} adminId - The admin's ID.
 * @returns {Promise<object>} - The admin's session data.
 */
const getAdminSession = async (adminId) => {
    const { data, error } = await supabase
        .from('admin') // Replace 'admin' with your actual table name
        .select('session_data')
        .eq('admin_id', adminId)
        .single();

    if (error) {
        console.error('Error fetching admin session from database:', error);
        throw error;
    }

    return data;
};

/**
 * Delete admin session from the database.
 * @param {string} adminId - The admin's ID.
 * @returns {Promise<object>} - The result of the database operation.
 */
const deleteAdminSession = async (adminId) => {
    const { data, error } = await supabase
        .from('admin') // Replace 'admin' with your actual table name
        .delete()
        .eq('admin_id', adminId);

    if (error) {
        console.error('Error deleting admin session from database:', error);
        throw error;
    }

    console.log('Admin session deleted from database successfully:', data);
    return data;
};

/**
 * Save a user's session JSON data to the database.
 * @param {string} userId - The user's ID.
 * @param {object} sessionData - The user's session JSON data.
 * @returns {Promise<object>} - The result of the database operation.
 */
const saveUserSession = async (userId, sessionData) => {
    console.log(`🔄 Attempting to save session for user ${userId} to database.`);
    const { data, error } = await supabase
        .from('user_sessions') // Replace 'user_sessions' with your actual table name
        .upsert([{ user_id: userId, session_data: sessionData }]); // Use upsert to update if exists

    if (error) {
        console.error(`❌ Error saving session for user ${userId} to database:`, error);
        throw error;
    }

    console.log(`✅ Session for user ${userId} saved to database successfully.`);
    return data;
};

/**
 * Get all user sessions from the database.
 * @returns {Promise<object[]>} - A list of all user sessions.
 */
const getAllUserSessions = async () => {
    const { data, error } = await supabase
        .from('user_sessions') // Replace 'user_sessions' with your actual table name
        .select('*');

    if (error) {
        console.error('❌ Error fetching user sessions from database:', error);
        throw error;
    }

    return data;
};

/**
 * Delete a user's session JSON data from the database.
 * @param {string} userId - The user's ID.
 * @returns {Promise<object>} - The result of the database operation.
 */
const deleteUserSession = async (userId) => {
    const { data, error } = await supabase
        .from('user_sessions') // Replace 'user_sessions' with your actual table name
        .delete()
        .eq('user_id', userId);

    if (error) {
        console.error(`Error deleting session for user ${userId} from database:`, error);
        throw error;
    }

    console.log(`✅ Session for user ${userId} deleted from database successfully.`);
    return data;
};

/**
 * Save a bot instance to the database.
 * @param {string} userId - The user's ID.
 * @param {object} instanceData - The bot instance data.
 * @returns {Promise<object>} - The result of the database operation.
 */
const saveBotInstance = async (userId, instanceData) => {
    console.log(`🔄 Attempting to save bot instance for user ${userId} to database.`);
    const { data, error } = await supabase
        .from('bot_instances') // Replace 'bot_instances' with your actual table name
        .upsert([{ user_id: userId, instance_data: instanceData }]); // Use upsert to update if exists

    if (error) {
        console.error(`❌ Error saving bot instance for user ${userId} to database:`, error);
        throw error;
    }

    console.log(`✅ Bot instance for user ${userId} saved to database successfully.`);
    return data;
};

/**
 * Get all bot instances from the database.
 * @returns {Promise<object[]>} - A list of all bot instances.
 */
const getAllBotInstances = async () => {
    const { data, error } = await supabase
        .from('bot_instances') // Replace 'bot_instances' with your actual table name
        .select('*');

    if (error) {
        console.error('❌ Error fetching bot instances from database:', error);
        throw error;
    }

    return data;
};

/**
 * Delete a bot instance from the database.
 * @param {string} userId - The user's ID.
 * @returns {Promise<object>} - The result of the database operation.
 */
const deleteBotInstance = async (userId) => {
    const { data, error } = await supabase
        .from('bot_instances') // Replace 'bot_instances' with your actual table name
        .delete()
        .eq('user_id', userId);

    if (error) {
        console.error(`Error deleting bot instance for user ${userId} from database:`, error);
        throw error;
    }

    console.log(`✅ Bot instance for user ${userId} deleted from database successfully.`);
    return data;
};

/**
 * Fetch the group mode for a user-group combination from the `group_modes` table in Supabase.
 * If no mode is found, return `null` to indicate that the group mode does not exist.
 * @param {string} userId - The user's ID.
 * @param {string} groupId - The group ID.
 * @returns {Promise<string|null>} - The group mode or `null` if not found.
 */
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

        console.log(`✅ Group mode for user ${userId} in group ${groupId} fetched from database: "${data.mode}".`);
        return data?.mode || null; // Return the mode or null if not found
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
        const { error } = await supabase
            .from('group_modes')
            .upsert({
                user_id: userId,
                group_id: groupId,
                mode,
                updated_at: new Date().toISOString(),
            });

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



module.exports = {
    addUser,
    getAllUsers,
    deleteUser,
    saveAdminSession,
    getAdminSession,
    deleteAdminSession,
    saveUserSession,
    getAllUserSessions,
    deleteUserSession,
    saveBotInstance,
    getAllBotInstances,
    deleteBotInstance,
    saveGroupMode,
    getGroupModeFromDatabase,
    syncUsersToGroupModes,
    getUserTagFormat,
    updateUserTagFormat,
    getUserFromUsersTable,
    getUserStatusSettings,
    updateUserStatusSettings,
};
