/**
 * Multiplayer Constants
 */
const MP_CONSTANTS = {
    // Room statuses
    ROOM_STATUS: {
        WAITING: 'waiting',
        GENERATING: 'generating',
        READY: 'ready',
        PLAYING: 'playing',
        FINISHED: 'finished',
        CLOSED: 'closed'
    },

    // Player statuses
    PLAYER_STATUS: {
        ACTIVE: 'active',
        READY: 'ready',
        PLAYING: 'playing',
        FINISHED: 'finished',
        DISCONNECTED: 'disconnected'
    },

    // Limits
    MAX_PLAYERS: 4,
    MIN_PLAYERS_TO_START: 2,
    ROOM_CODE_LENGTH: 4,
    ROOM_EXPIRY_HOURS: 2,

    // Timeouts (ms)
    SYNC_DELAY: 1000,
    COUNTDOWN_DURATION: 3000,
    SCORE_SYNC_THROTTLE: 500
};

// Room code characters (avoid confusing chars like 0/O, 1/I)
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MP_CONSTANTS, ROOM_CODE_CHARS };
}
