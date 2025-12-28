/**
 * Brain Training Games
 * Author: Cao Viet Hoang
 * Created: 2025
 */

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
    MAX_PLAYERS: 10,
    MIN_PLAYERS_TO_START: 2,
    ROOM_CODE_LENGTH: 6,
    ROOM_EXPIRY_HOURS: 2,

    // Timeouts (ms)
    SYNC_DELAY: 1000,
    COUNTDOWN_DURATION: 3000,
    SCORE_SYNC_THROTTLE: 500,

    // Game type to file mapping (add new games here)
    GAME_FILES: {
        'math-game': 'math-game.html',
        'pixel-game': 'pixel-game.html',
        'expression-puzzle': 'expression-puzzle.html',
        'dual-n-back': 'dual-n-back.html',
        'memory-matrix': 'memory-matrix.html',
        'word-recall': 'word-recall.html',
        'maze-game': 'maze-game.html',
        'number-hunt': 'number-hunt.html'
    }
};

// Room code characters (6-digit numeric code)
const ROOM_CODE_CHARS = '0123456789';

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MP_CONSTANTS, ROOM_CODE_CHARS };
}
