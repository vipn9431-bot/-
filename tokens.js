// status can be "online", "idle", "dnd", or "invisible" or "offline"
import 'dotenv/config';
export default {
    channelId: "1557772584781746288",
    serverId: "1486763846151438456",
    token: process.env.token1,
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

