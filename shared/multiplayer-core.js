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
        await this.roomRef.set({
            meta: {
                gameType: gameType || 'generic',
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

        console.log('✅ Room created:', roomCode);
        return roomCode;
    }

    async joinRoom(roomCode, playerName) {
        if (!database) {
            throw new Error('Firebase database not initialized. Please check firebase-config.js');
        }

        await this.initAuth();
        this.playerName = playerName;

        const roomRef = database.ref(`rooms/${roomCode}`);
        const snapshot = await roomRef.once('value');

        if (!snapshot.exists()) {
            throw new Error('Room not found');
        }

        const roomData = snapshot.val();

        // Validations
        if (roomData.meta.status !== MP_CONSTANTS.ROOM_STATUS.WAITING) {
            throw new Error('Game already in progress');
        }

        const playerCount = Object.keys(roomData.players || {}).length;
        if (playerCount >= roomData.meta.maxPlayers) {
            throw new Error('Room is full');
        }

        // Check if already in room
        if (roomData.players[this.playerId]) {
            throw new Error('You are already in this room');
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

        console.log('✅ Joined room:', roomCode);
        return roomData;
    }

    async leaveRoom() {
        if (!this.roomId || !this.roomRef) {
            console.warn('⚠️ No room to leave');
            return;
        }

        console.log('👋 Leaving room:', this.roomId);

        // Remove player
        await this.roomRef.child(`players/${this.playerId}`).remove();

        // If host, handle host transfer or room deletion
        if (this.isHost) {
            const playersSnap = await this.roomRef.child('players').once('value');
            const players = playersSnap.val();

            if (!players || Object.keys(players).length === 0) {
                // Delete empty room
                console.log('🗑️ Deleting empty room');
                await this.roomRef.remove();
            } else {
                // Transfer host to first remaining player
                const newHostId = Object.keys(players)[0];
                console.log('👑 Transferring host to:', newHostId);
                await this.roomRef.child('meta/hostId').set(newHostId);
                await this.roomRef.child(`players/${newHostId}/isHost`).set(true);
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
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiplayerCore;
}
