// status can be "online", "idle", "dnd", or "invisible" or "offline"
require('dotenv').config(); // لضمان قراءة التوكن من ملف .env

module.exports = {
    channelId: "1267849340324291000",
    serverId: "1011820688220795020",
    token: process.env.token,
    selfDeaf: false,
    autoReconnect: {
        enabled: true,
        delay: 5, // ثواني
        maxRetries: 5,
    },
    presence: {
        status: "idle",
    },
    selfMute: true,
};
