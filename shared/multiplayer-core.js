/**
 * Multiplayer Core
 * Handles Firebase connection, authentication, and room operations
 */
class MultiplayerCore {
    constructor() {
        this.roomId = null;
        this.playerId = null;
        this.playerName = null;
        this.isHost = false;
        this.roomRef = null;
        this.listeners = {};
        this.callbacks = {};
    }

    // ==================== AUTHENTICATION ====================

    async initAuth() {
        if (!auth) {
            throw new Error('Firebase auth not initialized. Please check firebase-config.js');
        }

        return new Promise((resolve, reject) => {
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    this.playerId = user.uid;
                    console.log('✅ User authenticated:', user.uid);
                    resolve(user);
                } else {
                    try {
                        const result = await auth.signInAnonymously();
                        this.playerId = result.user.uid;
                        console.log('✅ Anonymous auth successful:', result.user.uid);
                        resolve(result.user);
                    } catch (error) {
                        console.error('❌ Auth error:', error);
                        reject(error);
                    }
                }
            });
        });
    }

    // ==================== ROOM MANAGEMENT ====================

    generateRoomCode() {
        let code = '';
        for (let i = 0; i < MP_CONSTANTS.ROOM_CODE_LENGTH; i++) {
            code += ROOM_CODE_CHARS.charAt(
                Math.floor(Math.random() * ROOM_CODE_CHARS.length)
            );
        }
        return code;
    }

    async createRoom(gameType, config, playerName) {
        if (!database) {
            throw new Error('Firebase database not initialized. Please check firebase-config.js');
        }

        // Validate player name
        if (typeof RoomValidator !== 'undefined') {
            const nameValidation = RoomValidator.validatePlayerName(playerName);
            if (!nameValidation.valid) {
                throw new Error(nameValidation.error);
            }
            playerName = nameValidation.name;
        }

        // Validate config
        if (typeof RoomValidator !== 'undefined' && config) {
            const configValidation = RoomValidator.validateRoomConfig(config);
            if (!configValidation.valid) {
                throw new Error(configValidation.error);
            }
            config = configValidation.config;
        }

        await this.initAuth();
        this.playerName = playerName;

        // Generate unique room code
        let roomCode = this.generateRoomCode();
        let exists = true;
        let attempts = 0;

        while (exists && attempts < 10) {
            const snapshot = await database.ref(`rooms/${roomCode}`).once('value');
            exists = snapshot.exists();
            if (exists) {
                roomCode = this.generateRoomCode();
                attempts++;
            }
        }

        if (exists) {
            throw new Error('Could not generate unique room code');
        }

        // Create room
        this.roomRef = database.ref(`rooms/${roomCode}`);
        
        // Determine game URL based on game type (use centralized mapping from constants.js)
        const gameFile = MP_CONSTANTS.GAME_FILES[gameType] || `${gameType}.html`;
        const gameUrl = gameFile ? `games/${gameFile}` : '';
        
        await this.roomRef.set({
            meta: {
                gameType: gameType || 'generic',
                gameUrl: gameUrl,  // NEW - URL for navigation
                hostId: this.playerId,
                status: MP_CONSTANTS.ROOM_STATUS.WAITING,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                config: config || {},
                maxPlayers: config?.maxPlayers || MP_CONSTANTS.MAX_PLAYERS
            },
            players: {
                [this.playerId]: {
                    name: playerName,
                    isHost: true,
                    isReady: false,
                    score: 0,
                    status: MP_CONSTANTS.PLAYER_STATUS.ACTIVE,
                    joinedAt: firebase.database.ServerValue.TIMESTAMP
                }
            }
        });

        this.roomId = roomCode;
        this.isHost = true;
        this.setupRoomListeners();
        this.setupDisconnectHandler();
        this.startHeartbeat();

        console.log('✅ Room created:', roomCode);
        return roomCode;
    }

    async joinRoom(roomCode, playerName) {
        if (!database) {
            throw new Error('Firebase database not initialized. Please check firebase-config.js');
        }

        // Validate room code
        if (typeof RoomValidator !== 'undefined') {
            const codeValidation = RoomValidator.validateRoomCode(roomCode);
            if (!codeValidation.valid) {
                throw new Error(codeValidation.error);
            }
            roomCode = codeValidation.code;
        }

        // Validate player name
        if (typeof RoomValidator !== 'undefined') {
            const nameValidation = RoomValidator.validatePlayerName(playerName);
            if (!nameValidation.valid) {
                throw new Error(nameValidation.error);
            }
            playerName = nameValidation.name;
        }

        await this.initAuth();
        this.playerName = playerName;

        const roomRef = database.ref(`rooms/${roomCode}`);
        const snapshot = await roomRef.once('value');

        if (!snapshot.exists()) {
            throw new Error('Room not found');
        }

        const roomData = snapshot.val();

        // Use RoomValidator for comprehensive validation
        if (typeof RoomValidator !== 'undefined') {
            const joinValidation = RoomValidator.canJoinRoom(roomData);
            if (!joinValidation.canJoin) {
                throw new Error(joinValidation.error);
            }

            // Check if player already in room
            if (RoomValidator.isPlayerInRoom(roomData, this.playerId)) {
                throw new Error('You are already in this room');
            }
        } else {
            // Fallback validations
            if (roomData.meta.status !== MP_CONSTANTS.ROOM_STATUS.WAITING) {
                throw new Error('Game already in progress');
            }

            const playerCount = Object.keys(roomData.players || {}).length;
            if (playerCount >= roomData.meta.maxPlayers) {
                throw new Error('Room is full');
            }

            if (roomData.players[this.playerId]) {
                throw new Error('You are already in this room');
            }
        }

        // Add player
        await roomRef.child(`players/${this.playerId}`).set({
            name: playerName,
            isHost: false,
            isReady: false,
            score: 0,
            status: MP_CONSTANTS.PLAYER_STATUS.ACTIVE,
            joinedAt: firebase.database.ServerValue.TIMESTAMP
        });

        this.roomId = roomCode;
        this.roomRef = roomRef;
        this.isHost = false;
        this.setupRoomListeners();
        this.setupDisconnectHandler();
        this.startHeartbeat();

        console.log('✅ Joined room:', roomCode);
        return roomData;
    }

    async leaveRoom() {
        if (!this.roomId || !this.roomRef) {
            console.warn('⚠️ No room to leave');
            return;
        }

        console.log('👋 Leaving room:', this.roomId);

        const roomRef = this.roomRef;
        const roomId = this.roomId;

        // Stop heartbeat
        this.stopHeartbeat();

        // If host leaves, try to transfer host to another player
        if (this.isHost) {
            console.log('👑 Host is leaving - attempting to transfer host');

            // Get all players
            const playersSnapshot = await roomRef.child('players').once('value');
            const players = playersSnapshot.val() || {};

            // Find another player to be the new host
            const otherPlayers = Object.keys(players).filter(id => id !== this.playerId);

            if (otherPlayers.length > 0) {
                // Transfer host to the first available player
                const newHostId = otherPlayers[0];
                console.log('👑 Transferring host to:', newHostId);

                // Update host flags
                await roomRef.child(`players/${this.playerId}/isHost`).set(false);
                await roomRef.child(`players/${newHostId}/isHost`).set(true);
                await roomRef.child('meta/hostId').set(newHostId);

                // Remove current player
                await roomRef.child(`players/${this.playerId}`).remove();

                console.log('✅ Host transferred successfully');
            } else {
                // No other players, close the room
                console.log('🗑️ No other players - closing room');

                // Set room status to closed to notify other players
                await roomRef.child('meta/status').set('closed');
                await roomRef.child('meta/closedReason').set('Host left the room');

                // Give a moment for other clients to receive the status change
                await new Promise(resolve => setTimeout(resolve, 500));

                // Delete the entire room
                await roomRef.remove();
            }
        } else {
            // Non-host removes themselves
            await roomRef.child(`players/${this.playerId}`).remove();

            // Check if room is now empty after removal
            const remainingSnapshot = await roomRef.child('players').once('value');
            const remainingPlayers = remainingSnapshot.val();
            const remainingCount = remainingPlayers ? Object.keys(remainingPlayers).length : 0;

            if (remainingCount === 0) {
                console.log('🗑️ Room is now empty after player left - deleting room:', roomId);
                await roomRef.remove();
            }
        }

        this.cleanup();
    }

    // ==================== PLAYER STATE ====================

    async setPlayerReady(ready) {
        if (!this.roomRef) {
            console.warn('⚠️ No room reference');
            return;
        }
        await this.roomRef.child(`players/${this.playerId}/isReady`).set(ready);
        console.log('✅ Player ready state:', ready);
    }

    async updatePlayerState(state) {
        if (!this.roomRef) {
            console.warn('⚠️ No room reference');
            return;
        }
        const updates = {};
        Object.keys(state).forEach(key => {
            updates[`players/${this.playerId}/${key}`] = state[key];
        });
        await this.roomRef.update(updates);
        console.log('✅ Player state updated:', state);
    }

    // ==================== GAME STATE ====================

    async updateGameState(state) {
        if (!this.roomRef || !this.isHost) {
            console.warn('⚠️ Only host can update game state');
            return;
        }
        await this.roomRef.child('gameState').update(state);
        console.log('✅ Game state updated:', state);
    }

    async setRoomStatus(status) {
        if (!this.roomRef || !this.isHost) {
            console.warn('⚠️ Only host can update room status');
            return;
        }
        await this.roomRef.child('meta/status').set(status);
        console.log('✅ Room status updated:', status);
    }

    async publishGameData(gameData) {
        if (!this.roomRef || !this.isHost) {
            console.warn('⚠️ Only host can publish game data');
            return;
        }
        await this.roomRef.child('gameData').set({
            generatedAt: firebase.database.ServerValue.TIMESTAMP,
            ...gameData
        });
        console.log('✅ Game data published');
    }

    // ==================== LISTENERS ====================

    setupRoomListeners() {
        if (!this.roomRef) {
            console.warn('⚠️ No room reference for listeners');
            return;
        }

        console.log('👂 Setting up room listeners');

        // Players changes
        this.listeners.players = this.roomRef.child('players').on('value', (snapshot) => {
            const players = snapshot.val() || {};
            console.log('📡 Players updated:', Object.keys(players).length);
            this.callbacks.onPlayersChange?.(players);
        });

        // Room status changes
        this.listeners.status = this.roomRef.child('meta/status').on('value', (snapshot) => {
            const status = snapshot.val();
            console.log('📡 Status updated:', status);
            
            // Handle room closed by host
            if (status === 'closed') {
                console.log('🚪 Room closed by host');
                this.callbacks.onRoomClosed?.();
            }
            
            this.callbacks.onStatusChange?.(status);
        });

        // Game data (questions) ready
        this.listeners.gameData = this.roomRef.child('gameData').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && data.questions) {
                console.log('📡 Game data ready');
                this.callbacks.onGameDataReady?.(data);
            }
        });

        // Game state changes
        this.listeners.gameState = this.roomRef.child('gameState').on('value', (snapshot) => {
            const state = snapshot.val();
            if (state) {
                console.log('📡 Game state updated');
                this.callbacks.onGameStateChange?.(state);
            }
        });
    }

    setupDisconnectHandler() {
        if (!this.roomRef) {
            console.warn('⚠️ No room reference for disconnect handler');
            return;
        }

        console.log('🔌 Setting up disconnect handler');

        // Remove player on disconnect
        this.roomRef.child(`players/${this.playerId}`).onDisconnect().remove();

        // If host, mark room for cleanup on disconnect
        if (this.isHost) {
            this.roomRef.child('meta/hostDisconnected').onDisconnect().set(true);
        }
    }

    /**
     * Cancel disconnect handler to prevent player removal when navigating away
     * Call this before intentionally leaving the page (e.g., "Back to Home")
     */
    cancelDisconnectHandler() {
        if (!this.roomRef || !this.playerId) {
            console.warn('⚠️ No room reference for canceling disconnect handler');
            return;
        }

        console.log('🔌 Canceling disconnect handler');

        // Cancel the onDisconnect for player removal
        this.roomRef.child(`players/${this.playerId}`).onDisconnect().cancel();

        // If host, also cancel the hostDisconnected flag
        if (this.isHost) {
            this.roomRef.child('meta/hostDisconnected').onDisconnect().cancel();
        }
    }

    /**
     * Exit room with proper cleanup - marks player as exited and deletes room when all players have exited
     * Use this when player intentionally exits (e.g., from result modal)
     * This preserves results for other players still viewing the result modal
     */
    async exitRoomWithCleanup() {
        if (!this.roomRef || !this.playerId) {
            console.warn('⚠️ No room reference for exit cleanup');
            this.cleanup();
            return;
        }

        const roomId = this.roomId;
        const playerId = this.playerId;
        const roomRef = this.roomRef;

        console.log('🚪 Exiting room with cleanup:', roomId);

        try {
            // Mark player as exited instead of removing (to preserve ranking for others)
            await roomRef.child(`players/${playerId}/exited`).set(true);
            await roomRef.child(`players/${playerId}/exitedAt`).set(firebase.database.ServerValue.TIMESTAMP);
            console.log('✅ Player marked as exited');

            // Check if all players have exited
            const playersSnapshot = await roomRef.child('players').once('value');
            const players = playersSnapshot.val();

            if (players) {
                const allExited = Object.values(players).every(player => player.exited === true);
                const playerCount = Object.keys(players).length;
                const exitedCount = Object.values(players).filter(p => p.exited === true).length;

                console.log(`📊 Players: ${exitedCount}/${playerCount} exited`);

                // If all players have exited, delete the room
                if (allExited) {
                    console.log('🗑️ All players exited, deleting room:', roomId);
                    await roomRef.remove();
                    console.log('✅ Room deleted successfully');
                }
            }
        } catch (error) {
            console.error('❌ Error during exit cleanup:', error);
        } finally {
            // Always cleanup local state
            this.cleanup();
        }
    }

    // ==================== CLEANUP ====================

    cleanup() {
        console.log('🧹 Cleaning up room listeners');

        // Remove all listeners
        if (this.roomRef) {
            Object.keys(this.listeners).forEach(key => {
                if (this.listeners[key]) {
                    this.roomRef.child(key === 'players' ? 'players' : 
                                      key === 'status' ? 'meta/status' : 
                                      key === 'gameData' ? 'gameData' : 'gameState')
                            .off('value', this.listeners[key]);
                }
            });
        }

        this.listeners = {};
        this.roomId = null;
        this.roomRef = null;
        this.isHost = false;
    }

    // ==================== UTILITY METHODS ====================

    getRoomId() {
        return this.roomId;
    }

    getPlayerId() {
        return this.playerId;
    }

    getPlayerName() {
        return this.playerName;
    }

    isRoomHost() {
        return this.isHost;
    }

    isInRoom() {
        return this.roomId !== null;
    }

    // ==================== CALLBACK SETTERS ====================

    onPlayersChange(callback) { 
        this.callbacks.onPlayersChange = callback; 
    }
    
    onStatusChange(callback) { 
        this.callbacks.onStatusChange = callback; 
    }
    
    onGameDataReady(callback) { 
        this.callbacks.onGameDataReady = callback; 
    }
    
    onGameStateChange(callback) { 
        this.callbacks.onGameStateChange = callback; 
    }

    onRoomClosed(callback) {
        this.callbacks.onRoomClosed = callback;
    }

    /**
     * Subscribe to game data updates
     * Returns unsubscribe function
     */
    onGameDataUpdate(callback) {
        if (!this.roomRef) {
            throw new Error('Not in a room');
        }

        const listener = this.roomRef.child('gameData').on('value', (snapshot) => {
            const data = snapshot.val();
            callback(data);
        });

        // Return unsubscribe function
        return () => {
            this.roomRef.child('gameData').off('value', listener);
        };
    }

    // ==================== ENHANCED ROOM MANAGEMENT ====================

    /**
     * Kick a player from the room (host only)
     */
    async kickPlayer(playerId) {
        if (!this.roomRef || !this.isHost) {
            throw new Error('Only host can kick players');
        }

        if (playerId === this.playerId) {
            throw new Error('Cannot kick yourself');
        }

        await this.roomRef.child(`players/${playerId}`).remove();
        console.log('👢 Kicked player:', playerId);
    }

    /**
     * Transfer host to another player
     */
    async transferHost(newHostId) {
        if (!this.roomRef || !this.isHost) {
            throw new Error('Only host can transfer host role');
        }

        if (newHostId === this.playerId) {
            throw new Error('You are already the host');
        }

        const playerSnapshot = await this.roomRef.child(`players/${newHostId}`).once('value');
        if (!playerSnapshot.exists()) {
            throw new Error('Player not found in room');
        }

        // Update host flags
        await this.roomRef.child(`players/${this.playerId}/isHost`).set(false);
        await this.roomRef.child(`players/${newHostId}/isHost`).set(true);
        await this.roomRef.child('meta/hostId').set(newHostId);

        this.isHost = false;
        console.log('👑 Transferred host to:', newHostId);
    }

    /**
     * Update room settings (host only)
     */
    async updateRoomSettings(settings) {
        if (!this.roomRef || !this.isHost) {
            throw new Error('Only host can update room settings');
        }

        const updates = {};
        if (settings.maxPlayers !== undefined) {
            updates['meta/maxPlayers'] = settings.maxPlayers;
        }
        if (settings.config !== undefined) {
            updates['meta/config'] = settings.config;
        }

        await this.roomRef.update(updates);
        console.log('⚙️ Updated room settings:', settings);
    }

    /**
     * Get current room data
     */
    async getRoomData() {
        if (!this.roomRef) {
            throw new Error('Not in a room');
        }

        const snapshot = await this.roomRef.once('value');
        return snapshot.val();
    }

    /**
     * Get player list
     */
    async getPlayers() {
        if (!this.roomRef) {
            throw new Error('Not in a room');
        }

        const snapshot = await this.roomRef.child('players').once('value');
        return snapshot.val() || {};
    }

    /**
     * Update player's last seen timestamp
     */
    async updateLastSeen() {
        if (!this.roomRef) {
            return;
        }

        await this.roomRef.child(`players/${this.playerId}/lastSeen`)
            .set(firebase.database.ServerValue.TIMESTAMP);
    }

    /**
     * Start heartbeat to keep player active
     */
    startHeartbeat(intervalMs = 30000) {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        this.heartbeatInterval = setInterval(() => {
            this.updateLastSeen().catch(err => {
                console.error('❌ Heartbeat error:', err);
            });
        }, intervalMs);

        console.log('💓 Started heartbeat');
    }

    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
            console.log('💔 Stopped heartbeat');
        }
    }

    /**
     * Send chat message (if implemented)
     */
    async sendMessage(message) {
        if (!this.roomRef) {
            throw new Error('Not in a room');
        }

        const messageData = {
            playerId: this.playerId,
            playerName: this.playerName,
            message: message,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        await this.roomRef.child('messages').push(messageData);
        console.log('💬 Sent message');
    }

    /**
     * Listen for chat messages
     */
    listenToMessages(callback) {
        if (!this.roomRef) {
            return;
        }

        this.listeners.messages = this.roomRef.child('messages')
            .limitToLast(50)
            .on('child_added', (snapshot) => {
                callback(snapshot.val());
            });
    }

    /**
     * Validate room before joining
     */
    async validateRoomForJoin(roomCode) {
        const roomRef = database.ref(`rooms/${roomCode}`);
        const snapshot = await roomRef.once('value');

        if (!snapshot.exists()) {
            return { valid: false, error: 'Room not found' };
        }

        const roomData = snapshot.val();

        // Use RoomValidator if available
        if (typeof RoomValidator !== 'undefined') {
            return RoomValidator.canJoinRoom(roomData);
        }

        // Fallback validation
        if (roomData.meta.status !== MP_CONSTANTS.ROOM_STATUS.WAITING) {
            return { valid: false, error: 'Game already started' };
        }

        const playerCount = Object.keys(roomData.players || {}).length;
        if (playerCount >= roomData.meta.maxPlayers) {
            return { valid: false, error: 'Room is full' };
        }

        return { valid: true, roomData };
    }

    /**
     * Get room list (for lobby browser feature)
     */
    async getAvailableRooms(gameType = null) {
        if (!database) {
            throw new Error('Database not initialized');
        }

        const snapshot = await database.ref('rooms').once('value');
        const allRooms = snapshot.val() || {};

        const availableRooms = [];
        for (const [roomId, roomData] of Object.entries(allRooms)) {
            // Filter by game type if specified
            if (gameType && roomData.meta.gameType !== gameType) {
                continue;
            }

            // Only show waiting rooms
            if (roomData.meta.status !== MP_CONSTANTS.ROOM_STATUS.WAITING) {
                continue;
            }

            // Check if not full
            const playerCount = Object.keys(roomData.players || {}).length;
            if (playerCount >= roomData.meta.maxPlayers) {
                continue;
            }

            availableRooms.push({
                roomId,
                gameType: roomData.meta.gameType,
                playerCount,
                maxPlayers: roomData.meta.maxPlayers,
                hostName: roomData.players[roomData.meta.hostId]?.name || 'Unknown',
                createdAt: roomData.meta.createdAt
            });
        }

        return availableRooms;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiplayerCore;
}
