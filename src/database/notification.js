const supabase = require('../supabaseClient');

/**
 * Add a notification to the database.
 * @param {string} message - The notification message.
 * @param {string|null} targetAuthId - The target user's Auth ID (null for all users).
 */
const addNotification = async (message, targetAuthId = null, sender = 'Admin') => {
    const { data, error } = await supabase
        .from('notifications')
        .insert([{ message, target_auth_id: targetAuthId, sender }]);

    if (error) {
        console.error('❌ Error adding notification to database:', error.message);
        throw new Error('Failed to add notification.');
    }

    console.log('✅ Notification added to database:', data);
};

/**
 * Get all notifications from the database.
 * @param {string|null} authId - The Auth ID of the user (null to fetch global notifications).
 * @returns {Array} - An array of notifications.
 */
const getNotifications = async (authId = null) => {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('timestamp', { ascending: false })
        .or(`target_auth_id.is.null,target_auth_id.eq.${authId}`); // Fetch global or user-specific notifications

    if (error) {
        console.error('❌ Error fetching notifications from database:', error.message);
        throw new Error('Failed to fetch notifications.');
    }

    return data;
};

module.exports = { addNotification, getNotifications };