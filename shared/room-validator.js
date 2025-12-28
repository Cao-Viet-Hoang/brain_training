/**
 * Brain Training Games
 * Author: Cao Viet Hoang
 * Created: 2025
 */

/**
 * Room Validator
 * Validation utilities for multiplayer room operations
 */
class RoomValidator {
    /**
     * Validate room code format
     */
    static validateRoomCode(code) {
        if (!code || typeof code !== 'string') {
            return { valid: false, error: 'Room code is required' };
        }

        const trimmedCode = code.trim();

        if (trimmedCode.length !== 6) {
            return { valid: false, error: 'Room code must be 6 digits' };
        }

        // Check if contains only digits
        const validChars = /^[0-9]{6}$/;
        if (!validChars.test(trimmedCode)) {
            return { valid: false, error: 'Invalid room code format (must be 6 digits)' };
        }

        return { valid: true, code: trimmedCode };
    }

    /**
     * Validate player name
     */
    static validatePlayerName(name) {
        if (!name || typeof name !== 'string') {
            return { valid: false, error: 'Player name is required' };
        }

        const trimmedName = name.trim();

        if (trimmedName.length < 2) {
            return { valid: false, error: 'Name must be at least 2 characters' };
        }

        if (trimmedName.length > 50) {
            return { valid: false, error: 'Name must be 50 characters or less' };
        }

        // Check for inappropriate characters
        const validChars = /^[a-zA-Z0-9\s_-]+$/;
        if (!validChars.test(trimmedName)) {
            return { valid: false, error: 'Name contains invalid characters' };
        }

        return { valid: true, name: trimmedName };
    }

    /**
     * Validate room data structure
     */
    static validateRoomData(roomData) {
        if (!roomData) {
            return { valid: false, error: 'Room data is missing' };
        }

        if (!roomData.meta) {
            return { valid: false, error: 'Room metadata is missing' };
        }

        if (!roomData.meta.status) {
            return { valid: false, error: 'Room status is missing' };
        }

        if (!roomData.players) {
            return { valid: false, error: 'Room players data is missing' };
        }

        return { valid: true };
    }

    /**
     * Check if room can accept new players
     */
    static canJoinRoom(roomData) {
        // Check room status
        if (roomData.meta.status !== MP_CONSTANTS.ROOM_STATUS.WAITING) {
            return { 
                canJoin: false, 
                error: 'Game has already started or finished' 
            };
        }

        // Check player count
        const playerCount = Object.keys(roomData.players || {}).length;
        const maxPlayers = roomData.meta.maxPlayers || MP_CONSTANTS.MAX_PLAYERS;

        if (playerCount >= maxPlayers) {
            return { 
                canJoin: false, 
                error: `Room is full (${playerCount}/${maxPlayers})` 
            };
        }

        return { canJoin: true };
    }

    /**
     * Check if game can be started
     */
    static canStartGame(roomData, playerId) {
        // Check if player is host
        if (roomData.meta.hostId !== playerId) {
            return { 
                canStart: false, 
                error: 'Only the host can start the game' 
            };
        }

        // Check room status
        if (roomData.meta.status !== MP_CONSTANTS.ROOM_STATUS.WAITING) {
            return { 
                canStart: false, 
                error: 'Game already started or finished' 
            };
        }

        // Check player count
        const playerCount = Object.keys(roomData.players || {}).length;
        if (playerCount < MP_CONSTANTS.MIN_PLAYERS_TO_START) {
            return { 
                canStart: false, 
                error: `Need at least ${MP_CONSTANTS.MIN_PLAYERS_TO_START} players to start` 
            };
        }

        // Check if all non-host players are ready
        const allReady = Object.entries(roomData.players).every(([id, player]) => {
            return player.isHost || player.isReady;
        });

        if (!allReady) {
            return { 
                canStart: false, 
                error: 'Not all players are ready' 
            };
        }

        return { canStart: true };
    }

    /**
     * Check if room has expired
     */
    static isRoomExpired(roomData) {
        if (!roomData.meta.createdAt) {
            return false;
        }

        const now = Date.now();
        const createdAt = roomData.meta.createdAt;
        const expiryTime = MP_CONSTANTS.ROOM_EXPIRY_HOURS * 60 * 60 * 1000;

        return (now - createdAt) > expiryTime;
    }

    /**
     * Validate player already in room
     */
    static isPlayerInRoom(roomData, playerId) {
        return roomData.players && roomData.players[playerId] !== undefined;
    }

    /**
     * Validate room config
     */
    static validateRoomConfig(config) {
        if (!config || typeof config !== 'object') {
            return { valid: true, config: {} }; // Empty config is valid
        }

        const validatedConfig = { ...config };

        // Validate max players
        if (config.maxPlayers !== undefined) {
            const maxPlayers = parseInt(config.maxPlayers);
            if (isNaN(maxPlayers) || maxPlayers < 2 || maxPlayers > MP_CONSTANTS.MAX_PLAYERS) {
                return { 
                    valid: false, 
                    error: `Max players must be between 2 and ${MP_CONSTANTS.MAX_PLAYERS}` 
                };
            }
            validatedConfig.maxPlayers = maxPlayers;
        }

        return { valid: true, config: validatedConfig };
    }

    /**
     * Sanitize player data
     */
    static sanitizePlayerData(playerData) {
        return {
            name: playerData.name ? String(playerData.name).substring(0, 20) : 'Unknown',
            isHost: Boolean(playerData.isHost),
            isReady: Boolean(playerData.isReady),
            score: Number(playerData.score) || 0,
            status: playerData.status || MP_CONSTANTS.PLAYER_STATUS.ACTIVE,
            joinedAt: playerData.joinedAt || Date.now()
        };
    }

    /**
     * Get room summary
     */
    static getRoomSummary(roomData) {
        const playerCount = Object.keys(roomData.players || {}).length;
        const maxPlayers = roomData.meta.maxPlayers || MP_CONSTANTS.MAX_PLAYERS;
        const readyCount = Object.values(roomData.players || {})
            .filter(p => p.isReady || p.isHost).length;

        return {
            playerCount,
            maxPlayers,
            readyCount,
            status: roomData.meta.status,
            gameType: roomData.meta.gameType,
            isFull: playerCount >= maxPlayers,
            allReady: readyCount === playerCount,
            canStart: readyCount === playerCount && playerCount >= MP_CONSTANTS.MIN_PLAYERS_TO_START
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoomValidator;
}
