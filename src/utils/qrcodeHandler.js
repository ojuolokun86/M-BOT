const QRCodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const QR_CODES_DIR = path.join(__dirname, '../../qr_codes'); // Directory for QR code images
const TEMP_DIR = path.join(__dirname, '../../temp'); // Directory for temporary QR code images

// Ensure the QR codes directory exists
if (!fs.existsSync(QR_CODES_DIR)) {
    fs.mkdirSync(QR_CODES_DIR);
    console.log(`✅ QR codes directory created at: ${QR_CODES_DIR}`);
}


// Ensure the temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
    console.log(`✅ Temp directory created at: ${TEMP_DIR}`);
}

/**
 * Generates and displays a QR code in the terminal.
 * @param {string} qr - The QR code string to be displayed.
 * @param {string} userId - The user ID or session name for which the QR code is generated.
 */
const generateQRCode = (qr, userId = 'unknown') => {
    console.log(`📲 Scan the QR code below to log in for user: ${userId}`);
    QRCodeTerminal.generate(qr, { small: true });
};

/**
 * Generates and saves a QR code as an image file.
 * @param {string} qr - The QR code string to be converted to an image.
 * @param {string} userId - The user ID or session name for which the QR code is generated.
 * @returns {string} - The file path of the generated QR code image.
 */
const generateQRCodeImage = async (qr, userId = 'unknown') => {
    const filePath = path.join(TEMP_DIR, `${userId}.png`);
    await QRCode.toFile(filePath, qr, { width: 300 });
    console.log(`📸 QR code image saved for user: ${userId} at ${filePath}`);
    return filePath;
};

/**
 * Deletes a QR code image from the temp directory.
 * @param {string} userId - The user ID or session name for which the QR code was generated.
 */
const deleteQRCodeImage = (userId) => {
    const filePath = path.join(TEMP_DIR, `${userId}.png`);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ QR code image deleted for user: ${userId}`);
    }
};

module.exports = {
    generateQRCode,
    generateQRCodeImage,
    deleteQRCodeImage,
};