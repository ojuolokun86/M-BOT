/**
 * Get the about me.
 * @returns {string} - The about info as a string.
 */
const getInfo = () => {
    return `
*🤖 Bot Information:*
- Name: TECHITOON BOT 
- Version: 1.0.0
- Developer: LASH MAN
- Description: A multi-purpose bot for managing groups and users.
            `;
};

const getAboutMe = () => {
    return `
    *ℹ️ About TECHITOON BOT:*
TECHITOON BOT is a powerful and customizable bot designed to help manage groups and users efficiently. It supports various commands and features to enhance your experience.
            `;
};

module.exports = {
    getAboutMe,
    getInfo,
};