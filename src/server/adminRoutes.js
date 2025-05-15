const express = require('express');
const router = express.Router();
require('dotenv').config();
const crypto = require('crypto');
const { listSessionsFromSupabase, deleteSessionFromSupabase } = require('../database/models/supabaseAuthState'); // Import the session management functions    
const { restartUserBot } = require('../bot/restartBot'); // Import the restartBot function
const { getAllSessionsMemoryUsage, listSessionsFromMemory,  getSessionMemoryUsage } = require('../database/models/memory'); // Import the memory usage function
const { getAllUserMetrics, getGlobalMetrics } = require('../database/models/metrics');
const { deleteAllUsers, deleteUserData } = require('../database/userDatabase'); // Import deleteAllUsers function
const supabase = require('../supabaseClient'); // Import Supabase client
const { getAllComplaints } = require('../database/complaint'); // Import the complaints function
const { addNotification } = require('../database/notification'); // Import the notification function
const { getSocketInstance } = require('./socket'); // Import the socket instance
// Admin login route
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
        return res.json({ success: true, message: 'Login successful' });
        
    }
    
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

router.get('/users', async (req, res) => {
    try {
        
        const users  = listSessionsFromMemory();

        res.json({ success: true, users });
    } catch (error) {
        console.error('Error fetching users:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
    }
});

router.delete('/users/:phoneNumber', async (req, res) => {
    const { phoneNumber } = req.params;
    try {
        console.log(`🗑️ Deleting user: ${phoneNumber}`);
        await deleteUserData(phoneNumber); // Call deleteUserData for the specific user
        res.json({ success: true, message: `User ${phoneNumber} deleted successfully` });
    } catch (error) {
        console.error(`❌ Failed to delete user ${phoneNumber}:`, error.message);
        res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message });
    }
});

// Route to get all user metrics
router.get('/metrics/users', (req, res) => {
    try {
        const metrics = getAllUserMetrics(); // Fetch all user metrics
        res.json({ success: true, metrics }); // Return metrics as JSON
    } catch (error) {
        console.error('❌ Error fetching user metrics:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch user metrics' });
    }
});

router.delete('/users', async (req, res) => {
    try {
        const users = await listSessionsFromSupabase(); // Fetch all sessions from Supabase
        for (const session of users) {
            const phoneNumber = session.phoneNumber; // Extract phoneNumber
            if (!phoneNumber) {
                console.warn('⚠️ Skipping undefined phone number.');
                continue;
            }
            await deleteAllUsers(phoneNumber); // Pass only the phoneNumber string
        }
        res.json({ success: true, message: 'All users deleted successfully' });
    } catch (error) {
        console.error('❌ Failed to delete all users:', error.message);
        res.status(500).json({ success: false, message: 'Failed to delete all users', error: error.message });
    }
});

router.post('/restart-bot/:phoneNumber', async (req, res) => {
    const { phoneNumber } = req.params;
    const { authId } = req.body; // Get authId from body
    try {
        await restartUserBot(phoneNumber, authId); // Call the restartBot function
        console.log(`Restarting bot for user: ${phoneNumber}, authId: ${authId}`);
        res.json({ success: true, message: `Bot for ${phoneNumber} restarted successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to restart bot', error: error.message });
    }
});

// Route to get memory usage for all sessions
router.get('/users/memory-usage', (req, res) => {
    try {
        const memoryUsage = getAllSessionsMemoryUsage();
        console.log('Memory usage data:', memoryUsage); // Debug log
        res.json({ success: true, memoryUsage });
    } catch (error) {
        console.error('Error fetching memory usage:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch memory usage', error: error.message });
    }
});




const emitLiveMetricsToAdmin = () => {
    const io = getSocketInstance(); // Get the WebSocket instance

    setInterval(() => {
        try {
            const metrics = getAllUserMetrics(); // Fetch all user metrics

            // Flatten the metrics structure for easier processing in the frontend
            const formattedMetrics = metrics.map((metric) => ({
                authId: metric.authId,
                phoneNumber: metric.phoneNumber,
                messageProcessingTime: metric.messageProcessingTime || 'N/A',
                queueProcessingTime: metric.queueProcessingTime || 'N/A',
                commandProcessingTime: metric.commandProcessingTime || 'N/A',
            }));

            io.emit('metrics-update', formattedMetrics); // Emit formatted metrics to all connected clients
        } catch (error) {
            console.error('❌ Error emitting live metrics:', error.message);
        }
    }, 5000); // Emit every 5 seconds
};

router.put('/users/:phoneNumber/memory-limits', async (req, res) => {
    const { phoneNumber } = req.params;
    const { maxRam, maxRom } = req.body;

    try {
        const { error } = await supabase
            .from('users')
            .update({ max_ram: maxRam, max_rom: maxRom })
            .eq('user_id', phoneNumber);

        if (error) {
            throw new Error(error.message);
        }

        // Fetch the updated user data
        const { data: updatedUser, error: fetchError } = await supabase
            .from('users')
            .select('user_id, max_ram, max_rom')
            .eq('user_id', phoneNumber)
            .single();

        if (fetchError) {
            throw new Error(fetchError.message);
        }

        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error(`❌ Failed to update memory limits for user ${phoneNumber}:`, error.message);
        res.status(500).json({ success: false, message: 'Failed to update memory limits', error: error.message });
    }
});
// Endpoint to fetch all users
router.get('/users-info', async (req, res) => {
    console.log('Fetching all users from Supabase...'); // Debug log
    try {
        const { data: users, error } = await supabase
            .from('user_auth') // Replace 'users' with your actual table name
            .select('email, auth_id');

        if (error) {
            console.error('❌ Error fetching users:', error.message);
            return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
        }

        res.status(200).json({ success: true, users });
    } catch (err) {
        console.error('❌ Unexpected error fetching users:', err.message);
        res.status(500).json({ success: false, message: 'Unexpected error occurred.' });
    }
});

router.post('/send-notification', async (req, res) => {
    const { message, targetAuthId } = req.body;

    if (!message) {
        return res.status(400).json({ success: false, message: 'Notification message is required.' });
    }

    try {
        // Add the notification to the database with sender as 'Admin'
        await addNotification(message, targetAuthId || null, 'Admin');

        // Broadcast the notification to all connected users via WebSocket
        const io = require('./socket').getSocketInstance();
        io.emit('admin-notification', { message, targetAuthId, sender: 'Admin' });

        res.status(200).json({ success: true, message: 'Notification sent successfully.' });
    } catch (error) {
        console.error('❌ Error sending notification:', error.message);
        res.status(500).json({ success: false, message: 'Failed to send notification.' });
    }
});


router.get('/complaints', async (req, res) => {
    try {
        const complaints = await getAllComplaints(); // Fetch complaints from the database
        res.status(200).json({ success: true, complaints });
    } catch (error) {
        console.error('❌ Error fetching complaints:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch complaints.' });
    }
});

router.delete('/delete-user', async (req, res) => {
    const { authId } = req.body;

    if (!authId) {
        return res.status(400).json({ success: false, message: 'Auth ID is required.' });
    }

    try {
        console.log(`🗑️ Deleting user with Auth ID: ${authId}`);

        // Step 1: Delete the user from the `user_auth` table
        const { error: authError } = await supabase
            .from('user_auth')
            .delete()
            .eq('auth_id', authId);

        if (authError) {
            console.error(`❌ Error deleting user from user_auth table:`, authError.message);
            throw new Error(authError.message);
        }
        console.log(`✅ Deleted user from user_auth table with Auth ID: ${authId}`);

        // Step 2: Fetch all users associated with the `auth_id` from the `users` table
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('user_id')
            .eq('auth_id', authId);

        if (usersError) {
            console.error(`❌ Error fetching users from users table:`, usersError.message);
            throw new Error(usersError.message);
        }

        if (!users || users.length === 0) {
            console.log(`ℹ️ No users found for Auth ID: ${authId}`);
        } else {
            // Step 3: Delete all users and their bots
            for (const user of users) {
                const phoneNumber = user.user_id;
                console.log(`🗑️ Deleting data for user: ${phoneNumber}`);
                await deleteUserData(phoneNumber); // Delete user data and bots
            }
        }

        res.status(200).json({ success: true, message: `User with Auth ID ${authId} and all associated data deleted successfully.` });
    } catch (error) {
        console.error(`❌ Error deleting user with Auth ID ${authId}:`, error.message);
        res.status(500).json({ success: false, message: 'Failed to delete user.', error: error.message });
    }
});

router.get('/all-bots', async (req, res) => {
    try {
        const bots = listSessionsFromMemory(); // Fetch all bots from memory

        // Map the bots to include additional fields like memory usage and status
        const botData = bots.map((bot) => ({
            authId: bot.authId || 'N/A', // Ensure authId is provided
            phoneNumber: bot.phoneNumber || 'N/A', // Ensure phoneNumber is provided
            status: bot.active ? 'Active' : 'Inactive', // Add status based on the active field
            memoryUsage: getSessionMemoryUsage(bot.phoneNumber), // Add memory usage
        }));

        res.json({ success: true, bots: botData });
    } catch (error) {
        console.error('❌ Error fetching bots:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch bots.' });
    }
});

router.post('/send-user-notification', async (req, res) => {
    const { authId, message } = req.body;

    if (!authId || !message) {
        return res.status(400).json({ success: false, message: 'Auth ID and message are required.' });
    }

    try {
        const io = require('./socket').getSocketInstance();
        console.log(`📤 Sending notification to authId: ${authId}, message: ${message}`);
        io.to(authId).emit('user-notification', { message }); // Emit to the specific authId

        res.status(200).json({ success: true, message: 'Notification sent successfully.' });
    } catch (error) {
        console.error('❌ Error sending notification:', error.message);
        res.status(500).json({ success: false, message: 'Failed to send notification.' });
    }
});



// Generate or renew a token for a user
router.post('/generate-token', async (req, res) => {
    const { authId, subscriptionLevel } = req.body;

    if (!authId || !subscriptionLevel) {
        return res.status(400).json({ success: false, message: 'Auth ID and subscription level are required.' });
    }

    try {
        // Check if the user exists with the given six-digit authId
        const { data: user, error: userError } = await supabase
            .from('user_auth')
            .select('email')
            .eq('auth_id', authId)
            .single();

        if (userError || !user) {
            return res.status(404).json({ success: false, message: 'User with this Auth ID does not exist.' });
        }

        // Generate a unique token ID
        const tokenId = crypto.randomBytes(16).toString('hex');
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 1); // Token expires in 1 month

        // Insert or update the token in the database
        const { error: tokenError } = await supabase
            .from('subscription_tokens')
            .upsert({
                token_id: tokenId,
                user_auth_id: authId,
                subscription_level: subscriptionLevel,
                expiration_date: expirationDate.toISOString(),
            }, { onConflict: ['user_auth_id'] });

        if (tokenError) {
            throw new Error(tokenError.message);
        }

        // Update the user's subscription status
        const { error: updateError } = await supabase
            .from('user_auth')
            .update({ subscription_status: subscriptionLevel })
            .eq('auth_id', authId);

        if (updateError) {
            throw new Error(updateError.message);
        }

       // Send the token to the user's notifications
        await addNotification(
            `Your new subscription token: ${tokenId}. Expires on ${expirationDate.toISOString()}`,
            authId,
            'Admin'
        );
        console.log(`🔔 Notification sent to user ${authId} about new token.`);


        res.status(200).json({ success: true, message: 'Token generated successfully.', tokenId, expirationDate: expirationDate.toISOString() });
    } catch (error) {
        console.error('❌ Error generating token:', error.message);
        res.status(500).json({ success: false, message: 'Failed to generate token.' });
    }
});
const validateToken = async (req, res, next) => {
    const { authId, tokenId } = req.body;

    if (!authId || !tokenId) {
        return res.status(400).json({ success: false, message: 'Auth ID and token ID are required.' });
    }

    try {
        const { data: token, error } = await supabase
            .from('subscription_tokens')
            .select('*')
            .eq('user_auth_id', authId)
            .eq('token_id', tokenId)
            .single();

        if (error || !token) {
            return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
        }

        const now = new Date();
        if (new Date(token.expiration_date) < now) {
            return res.status(401).json({ success: false, message: 'Token has expired.' });
        }

        next();
    } catch (error) {
        console.error('❌ Error validating token:', error.message);
        res.status(500).json({ success: false, message: 'Failed to validate token.' });
    }
};

const deleteExpiredBots = async () => {
    try {
        const now = new Date().toISOString();

        // Fetch expired tokens
        const { data: expiredTokens, error } = await supabase
            .from('subscription_tokens')
            .select('user_auth_id')
            .lt('expiration_date', now);

        if (error) {
            throw new Error(error.message);
        }

        for (const token of expiredTokens) {
            const { user_auth_id: authId } = token;

            // Delete bots associated with the expired token
            const { data: users } = await supabase
                .from('users')
                .select('user_id')
                .eq('auth_id', authId);

            for (const user of users) {
                await deleteUserData(user.user_id);
            }

            console.log(`🗑️ Deleted bots for expired token: ${authId}`);
        }
    } catch (error) {
        console.error('❌ Error deleting expired bots:', error.message);
    }
};


// Endpoint to fetch all bots/users with phoneNumber and authI

// Schedule the task to run daily
setInterval(deleteExpiredBots, 24 * 60 * 60 * 1000); // Every 24 hours

module.exports = { router,  emitLiveMetricsToAdmin };