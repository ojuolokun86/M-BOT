const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { fetchWhatsAppWebVersion } = require('../utils/AppWebVersion');

const fs = require('fs');
const path = require('path');
const { Resend } = require('resend'); // Import Resend SDK
const { generateQRCodeImage, generateQRCode, deleteQRCodeImage } = require('../utils/qrcodeHandler'); // Import QR code handlers
const { botInstances } = require('../utils/globalStore'); // Import the global botInstances object
const { getAdminSession, saveAdminSession } = require('../database/userDatabase'); // Import database functions
const { loadAllUserSessions, syncUsersToSupabase } = require('./userSessionManager'); // Correct import // Import user session manager
const initializeBot = require('../bot/bot'); // Import bot initialization logic
const { handleCorruptedSession } = require('./sessionErrorHandler'); // Import the session error handler
const env = require('../utils/loadEnv'); // Import environment variables

const ensureSessionDirectoryExists = (sessionPath) => {
    if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
        console.log(`✅ Session directory created at: ${sessionPath}`);
    } else {
        console.log(`ℹ️ Session directory already exists at: ${sessionPath}`);
    }
};


try {
    const crypto = require('crypto');
    console.log('✅ crypto module is available');
  } catch (e) {
    console.error('❌ crypto module is NOT available:', e.message);
    console.log('🔍 Debug: Checking crypto module availability...');
    console.log('🔍 crypto module:', crypto);
  }
  

const resend = new Resend(env.RESEND_API_KEY);
const ADMIN_NUMBER = env.ADMIN_NUMBER; // Load the admin number from .env
const ADMIN_NAME = env.ADMIN_NAME; // Load the admin name from .env
const ADMIN_EMAIL = env.ADMIN_EMAIL; // Load the admin email from .env
const SESSIONS_DIR = path.join(__dirname, '../../sessions'); // Directory for user sessions
const BOT_NUMBERS_DIR = path.join(__dirname, '../../bot_number'); // Directory for bot numbers

// Ensure the sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR);
}

// Ensure the bot_number directory exists
if (!fs.existsSync(BOT_NUMBERS_DIR)) {
    fs.mkdirSync(BOT_NUMBERS_DIR);
}

// Track whether the QR code has already been sent or printed
let qrCodeSentOrPrinted = false;
let qrCodeTimeout; // Timeout reference for closing the QR code
 
/**
 * Save a number and name to a file in the bot_number folder.
 * @param {string} number - The phone number to save.
 * @param {string} name - The name associated with the number.
 */
const saveNumberToFile = (number, name) => {
    const filePath = path.join(BOT_NUMBERS_DIR, `${number}.txt`); // Use the number as the file name

    // Check if the file already exists
    if (fs.existsSync(filePath)) {
        console.log(`ℹ️ Number ${number} is already saved.`);
        return;
    }

    // Save the number, name, and date created
    const dateCreated = new Date().toISOString();
    const fileContent = `User ID: ${number}\nUsername: ${name}\nDate Created: ${dateCreated}\n`;
    fs.writeFileSync(filePath, fileContent);
    console.log(`✅ Number ${number} with name "${name}" saved to ${number}.txt.`);
};

/**
 * Send the QR code to the admin's email using Resend.
 * @param {string} qr - The QR code string.
 * @returns {Promise<boolean>} - Whether the email was sent successfully.
 */
const sendQRCodeToEmail = async (qr) => {
    if (!ADMIN_EMAIL) {
        console.error('❌ Admin email is not defined in the .env file.');
        return false;
    }

    try {
        console.log('🔍 Generating QR code image...');
        const qrCodeImagePath = await generateQRCodeImage(qr, 'admin'); // Generate QR code image

        const emailData = {
            from: 'Acme <onboarding@resend.dev>', // Verified sender email
            to: ADMIN_EMAIL, // Admin email
            subject: 'Admin QR Code for WhatsApp Login',
            html: '<p>Please scan the attached QR code to log in to the admin session.</p>',
            attachments: [
                {
                    filename: 'admin-qr-code.png',
                    content: fs.readFileSync(qrCodeImagePath).toString('base64'), // Read and encode the QR code image
                    contentType: 'image/png',
                },
            ],
        };

        console.log('📤 Sending QR code email to admin...');
        const response = await resend.emails.send(emailData); // Send the email and capture the response

        // Log the response to confirm delivery
        console.log(`✅ Email delivery response:`, response);
        console.log(`✅ QR code sent to admin email: ${ADMIN_EMAIL}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send QR code to admin email:', error.message);

        // Log additional error details if available
        if (error.response) {
            console.error(`🔍 Resend Response:`, error.response.data);
        }

        return false;
    }
};

/**
 * Send the QR code to the admin's WhatsApp number.
 * @param {object} sock - The WhatsApp socket instance.
 * @param {string} qr - The QR code string.
 * @returns {Promise<boolean>} - Whether the QR code was sent successfully.
 */
const sendQRCodeToWhatsApp = async (sock, qr) => {
    try {
        // Check if the sock object is valid
        if (!sock || !sock.user || !sock.user.id) {
            console.error('❌ Invalid sock object. Cannot send QR code to WhatsApp.');
            return false;
        }

        const qrCodeImagePath = await generateQRCodeImage(qr, 'admin'); // Generate QR code image
        await sock.sendMessage(`${ADMIN_NUMBER}@s.whatsapp.net`, {
            text: 'Please scan the attached QR code to log in to the admin session.',
            image: { url: qrCodeImagePath },
        });
        console.log(`✅ QR code sent to admin WhatsApp number: ${ADMIN_NUMBER}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send QR code to admin WhatsApp number:', error);
        return false;
    }
};



const startAdminSession = async () => {
    if (!ADMIN_NUMBER || !/^\d+$/.test(ADMIN_NUMBER)) {
        console.error('❌ Invalid or missing ADMIN_NUMBER in .env file.');
        return;
    }

    if (botInstances[ADMIN_NUMBER]) {
        console.log(`ℹ️ Admin bot instance already exists for ${ADMIN_NUMBER}. Skipping creation.`);
        return;
    }

    const adminSessionPath = path.join(SESSIONS_DIR, ADMIN_NUMBER);
    console.log(`🔍 Admin session path: ${adminSessionPath}`);

    ensureSessionDirectoryExists(adminSessionPath);

    const version = await fetchWhatsAppWebVersion('whiskeysockets');
    console.log(`✅ Using WhatsApp Web version: ${version}`);

    let sock;

    try {
        const { state, saveCreds } = await useMultiFileAuthState(adminSessionPath);

        sock = makeWASocket({
            auth: state,
            browser: ['Techitoon', 'Chrome', '10.0'],
            version
        });

        sock.ev.on('creds.update', async () => {
            try {
                await saveCreds();
                console.log('✅ Credentials updated and saved to creds.json');
            } catch (error) {
                console.error('❌ Failed to save credentials:', error);
            }
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            console.log('🔍 Connection update:', update);

            if (qr && !qrCodeSentOrPrinted) {
                console.log('⚠️ Admin session needs QR scan. Delivering QR...');
                qrCodeSentOrPrinted = true;

                const emailSent = await sendQRCodeToEmail(qr);
                if (emailSent) {
                    qrCodeTimeout = setTimeout(() => {
                        console.log('⏳ QR code timeout. Cleaning up...');
                        deleteQRCodeImage('admin');
                        qrCodeSentOrPrinted = false;
                    }, 60 * 60 * 1000);
                }
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const reason = lastDisconnect?.error?.message || 'Unknown';

                console.log(`❌ Connection closed. Reason: ${reason}`);
                if (statusCode) {
                    console.log(`🔎 Status code: ${statusCode}`);
                }

                // Handle admin logout
                if (lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut) {
                    console.log(`⚠️ Admin has logged out. Cleaning up and restarting session...`);

                    // Delete all admin-related files and folders
                    await deleteAdminData();

                    // Restart admin session
                    console.log('🔄 Restarting admin session...');
                    setTimeout(startAdminSession, 5000);
                    return;
                }

                console.log('🔁 Reconnecting in 5 seconds...');
                setTimeout(startAdminSession, 5000);
                return;
            }

            if (connection === 'open') {
                console.log('✅ Admin session connected.');
                qrCodeSentOrPrinted = false;
                clearTimeout(qrCodeTimeout);

                botInstances[ADMIN_NUMBER] = sock;
                console.log(`🤖 Admin bot instance initialized for ${ADMIN_NUMBER}.`);

                initializeBot(sock, ADMIN_NUMBER);
                saveNumberToFile(ADMIN_NUMBER, ADMIN_NAME);

                try {
                    await saveAdminSession(ADMIN_NUMBER, sock.authState);
                    console.log('✅ Admin session saved to database.');
                } catch (err) {
                    console.error('⚠️ Could not save session:', err);
                }

                        // Ensure syncUsersToSupabase is defined
                if (typeof syncUsersToSupabase === 'function') {
                    await syncUsersToSupabase();
                } else {
                    console.log('⚠️ syncUsersToSupabase is not defined.');
                }
                await loadAllUserSessions(sock);
                console.log ('✅ All user sessions loaded.');
                console.log('🔄 Loading all bot instances from the database...');
            }
        });

    } catch (err) {
        console.error('❌ Failed to start admin session:', err);
        console.log('🔁 Retrying in 10 seconds...');
        setTimeout(startAdminSession, 10000);
    }
};
const deleteAdminData = async () => {
    try {
        console.log('🗑️ Deleting admin-related files and folders...');

        // Delete admin session folder
        const adminSessionPath = path.join(SESSIONS_DIR, ADMIN_NUMBER);
        if (fs.existsSync(adminSessionPath)) {
            fs.rmSync(adminSessionPath, { recursive: true, force: true });
            console.log(`✅ Deleted admin session folder: ${adminSessionPath}`);
        }

        // Delete admin bot number file
        const adminBotFilePath = path.join(BOT_NUMBERS_DIR, `${ADMIN_NUMBER}.txt`);
        if (fs.existsSync(adminBotFilePath)) {
            fs.unlinkSync(adminBotFilePath);
            console.log(`✅ Deleted admin bot number file: ${adminBotFilePath}`);
        }

        // Delete admin session from the database
        try {
            await deleteUserSession(ADMIN_NUMBER); // Ensure this function is implemented in your database logic
            console.log(`✅ Deleted admin session from the database.`);
        } catch (error) {
            console.error(`❌ Failed to delete admin session from the database:`, error);
        }
    } catch (error) {
        console.error('❌ Failed to delete admin data:', error);
    }
};



module.exports = { startAdminSession, ensureSessionDirectoryExists };