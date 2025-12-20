// ============================================================================
// ROOM CLIENT SDK
// Manages multiplayer room operations: create, join, leave, presence,
// questionSet publishing, score submission, and leaderboard
// ============================================================================

class RoomClient {
    constructor(firebaseClient) {
        this.firebaseClient = firebaseClient;
        this.currentRoom = null;
        this.currentRoomId = null;
        this.presenceRef = null;
        this.listeners = {
            roomStatus: null,
            questionSet: null,
            players: null,
            scores: null,
            gameMeta: null
        };
        this.callbacks = {
            onRoomStatusChange: null,
            onQuestionSetReceived: null,
            onPlayersChange: null,
            onScoresChange: null,
            onGameMetaChange: null
        };
    }

    /**
     * Generate a random room ID
     * @param {number} length - Length of room ID (default: 6)
     * @returns {string} - Random room ID in base36
     */
    generateRoomId(length = 6) {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let roomId = '';
        for (let i = 0; i < length; i++) {
            roomId += chars[Math.floor(Math.random() * chars.length)];
        }
        return roomId;
    }

    /**
     * Create a new multiplayer room
     * @param {Object} gameMeta - Game metadata { gameId, version, title } (optional)
     * @returns {Promise<Object>} - Room object with roomId and metadata
     */
    async createRoom(gameMeta = null) {
        if (!this.firebaseClient.isAuthenticated()) {
            throw new Error('User must be authenticated to create a room');
        }

        const user = this.firebaseClient.getCurrentUser();
        const roomId = this.generateRoomId(6);
        const dbRef = this.firebaseClient.getDatabaseRef();

        try {
            // Check if room already exists (rare collision)
            const roomSnapshot = await dbRef.child(`rooms/${roomId}`).once('value');
            if (roomSnapshot.exists()) {
                // Regenerate if collision
                return this.createRoom(gameMeta);
            }

            const roomData = {
                meta: {
                    gameId: gameMeta ? gameMeta.gameId : null,
                    gameVersion: gameMeta ? gameMeta.version : null,
                    title: gameMeta ? gameMeta.title : null,
                    status: gameMeta ? 'waiting' : 'lobby', // 'lobby' if no game selected yet
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    hostUid: user.uid
                },
                players: {
                    [user.uid]: {
                        name: user.displayName,
                        joinedAt: firebase.database.ServerValue.TIMESTAMP,
                        online: true
                    }
                }
            };

            // Write room data
            await dbRef.child(`rooms/${roomId}`).set(roomData);

            this.currentRoomId = roomId;
            this.currentRoom = roomData;

            // Setup presence
            await this.setupPresence(roomId, user.uid, user.displayName);

            // Subscribe to room updates
            this.subscribeToRoom(roomId);

            console.log('Room created successfully:', roomId);
            return {
                roomId,
                meta: roomData.meta,
                isHost: true
            };
        } catch (error) {
            console.error('Failed to create room:', error);
            throw new Error(`Room creation failed: ${error.message}`);
        }
    }

    /**
     * Join an existing room
     * @param {string} roomId - Room ID to join
     * @param {string} expectedGameId - Expected game ID for validation (optional)
     * @returns {Promise<Object>} - Room object with metadata
     */
    async joinRoom(roomId, expectedGameId = null) {
        if (!this.firebaseClient.isAuthenticated()) {
            throw new Error('User must be authenticated to join a room');
        }

        const user = this.firebaseClient.getCurrentUser();
        const dbRef = this.firebaseClient.getDatabaseRef();
        const roomRef = dbRef.child(`rooms/${roomId.toUpperCase()}`);

        try {
            // Check if room exists
            const roomSnapshot = await roomRef.once('value');
            if (!roomSnapshot.exists()) {
                throw new Error('Room not found');
            }

            const roomData = roomSnapshot.val();

            // Check if room has ended
            if (roomData.meta.status === 'ended') {
                throw new Error('Room has ended');
            }

            // Validate game ID if expectedGameId is provided and room has a game
            if (expectedGameId && roomData.meta.gameId && roomData.meta.gameId !== expectedGameId) {
                return {
                    error: 'game_mismatch',
                    message: `Room is for ${roomData.meta.title}`,
                    correctGameId: roomData.meta.gameId,
                    roomGameTitle: roomData.meta.title
                };
            }

            // Add player to room
            await roomRef.child(`players/${user.uid}`).set({
                name: user.displayName,
                joinedAt: firebase.database.ServerValue.TIMESTAMP,
                online: true
            });

            this.currentRoomId = roomId.toUpperCase();
            this.currentRoom = roomData;

            // Setup presence
            await this.setupPresence(this.currentRoomId, user.uid, user.displayName);

            // Subscribe to room updates
            this.subscribeToRoom(this.currentRoomId);

            console.log('Joined room successfully:', this.currentRoomId);
            return {
                roomId: this.currentRoomId,
                meta: roomData.meta,
                isHost: roomData.meta.hostUid === user.uid
            };
        } catch (error) {
            console.error('Failed to join room:', error);
            throw error;
        }
    }

    /**
     * Setup presence tracking for online/offline status
     * @param {string} roomId - Room ID
     * @param {string} uid - User ID
     * @param {string} displayName - User display name
     */
    async setupPresence(roomId, uid, displayName) {
        const dbRef = this.firebaseClient.getDatabaseRef();
        const playerRef = dbRef.child(`rooms/${roomId}/players/${uid}`);
        
        // Set up presence
        this.presenceRef = playerRef;

        // When connected, set online to true
        await playerRef.update({ online: true });

        // When disconnected, set online to false
        await playerRef.onDisconnect().update({ online: false });

        console.log('Presence setup for user:', uid);
    }

    /**
     * Subscribe to room updates
     * @param {string} roomId - Room ID
     */
    subscribeToRoom(roomId) {
        const dbRef = this.firebaseClient.getDatabaseRef();
        const roomRef = dbRef.child(`rooms/${roomId}`);

        // Subscribe to status changes
        this.listeners.roomStatus = roomRef.child('meta/status').on('value', (snapshot) => {
            const status = snapshot.val();
            console.log('Room status changed:', status);
            if (this.callbacks.onRoomStatusChange) {
                this.callbacks.onRoomStatusChange(status);
            }
        });

        // Subscribe to game metadata changes
        this.listeners.gameMeta = roomRef.child('meta').on('value', (snapshot) => {
            const meta = snapshot.val();
            if (meta && this.callbacks.onGameMetaChange) {
                this.callbacks.onGameMetaChange(meta);
            }
        });

        // Subscribe to questionSet
        this.listeners.questionSet = roomRef.child('game/questionSet').on('value', (snapshot) => {
            const questionSet = snapshot.val();
            if (questionSet) {
                console.log('QuestionSet received');
                if (this.callbacks.onQuestionSetReceived) {
                    this.callbacks.onQuestionSetReceived(questionSet);
                }
            }
        });

        // Subscribe to players
        this.listeners.players = roomRef.child('players').on('value', (snapshot) => {
            const players = snapshot.val() || {};
            console.log('Players updated:', Object.keys(players).length);
            if (this.callbacks.onPlayersChange) {
                this.callbacks.onPlayersChange(players);
            }
        });

        // Subscribe to scores
        this.listeners.scores = roomRef.child('scores').on('value', (snapshot) => {
            const scores = snapshot.val() || {};
            console.log('Scores updated:', Object.keys(scores).length);
            if (this.callbacks.onScoresChange) {
                this.callbacks.onScoresChange(scores);
            }
        });
    }

    /**
     * Unsubscribe from all room updates
     */
    unsubscribeFromRoom() {
        if (!this.currentRoomId) return;

        const dbRef = this.firebaseClient.getDatabaseRef();
        const roomRef = dbRef.child(`rooms/${this.currentRoomId}`);

        if (this.listeners.roomStatus) {
            roomRef.child('meta/status').off('value', this.listeners.roomStatus);
        }
        if (this.listeners.gameMeta) {
            roomRef.child('meta').off('value', this.listeners.gameMeta);
        }
        if (this.listeners.questionSet) {
            roomRef.child('game/questionSet').off('value', this.listeners.questionSet);
        }
        if (this.listeners.players) {
            roomRef.child('players').off('value', this.listeners.players);
        }
        if (this.listeners.scores) {
            roomRef.child('scores').off('value', this.listeners.scores);
        }

        this.listeners = {
            roomStatus: null,
            questionSet: null,
            players: null,
            scores: null,
            gameMeta: null
        };
    }

    /**
     * Publish question set to room (host only)
     * @param {any} questionSet - Question set data (must be JSON-serializable)
     * @returns {Promise<void>}
     */
    async publishQuestionSet(questionSet) {
        if (!this.currentRoomId) {
            throw new Error('Not in a room');
        }

        const user = this.firebaseClient.getCurrentUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Check if user is host
        if (this.currentRoom && this.currentRoom.meta.hostUid !== user.uid) {
            throw new Error('Only host can publish question set');
        }

        try {
            // Validate questionSet is JSON-serializable
            const serialized = JSON.stringify(questionSet);
            const sizeBytes = new Blob([serialized]).size;

            console.log(`QuestionSet size: ${(sizeBytes / 1024).toFixed(2)} KB`);

            // Check size limit (200KB)
            if (sizeBytes > 200 * 1024) {
                throw new Error(`QuestionSet too large: ${(sizeBytes / 1024).toFixed(2)} KB (max 200 KB)`);
            }

            const dbRef = this.firebaseClient.getDatabaseRef();
            const roomRef = dbRef.child(`rooms/${this.currentRoomId}`);

            // Write questionSet and update status
            await roomRef.child('game').update({
                questionSet: questionSet,
                startedAt: firebase.database.ServerValue.TIMESTAMP
            });

            await roomRef.child('meta/status').set('playing');

            console.log('QuestionSet published successfully');
        } catch (error) {
            console.error('Failed to publish questionSet:', error);
            throw new Error(`Publishing failed: ${error.message}`);
        }
    }

    /**
     * Submit score to room
     * @param {number} score - Player's score
     * @param {any} extra - Optional extra data
     * @returns {Promise<void>}
     */
    async submitScore(score, extra = null) {
        if (!this.currentRoomId) {
            throw new Error('Not in a room');
        }

        const user = this.firebaseClient.getCurrentUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        try {
            const dbRef = this.firebaseClient.getDatabaseRef();
            const scoreData = {
                name: user.displayName,
                score: score,
                submittedAt: firebase.database.ServerValue.TIMESTAMP
            };

            if (extra) {
                scoreData.extra = extra;
            }

            await dbRef.child(`rooms/${this.currentRoomId}/scores/${user.uid}`).set(scoreData);

            console.log('Score submitted:', score);
        } catch (error) {
            console.error('Failed to submit score:', error);
            throw new Error(`Score submission failed: ${error.message}`);
        }
    }

    /**
     * End the room (host only)
     * @returns {Promise<void>}
     */
    async endRoom() {
        if (!this.currentRoomId) {
            throw new Error('Not in a room');
        }

        const user = this.firebaseClient.getCurrentUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Check if user is host
        if (this.currentRoom && this.currentRoom.meta.hostUid !== user.uid) {
            throw new Error('Only host can end the room');
        }

        try {
            const dbRef = this.firebaseClient.getDatabaseRef();
            await dbRef.child(`rooms/${this.currentRoomId}/meta/status`).set('ended');

            console.log('Room ended');

            // Optional: Schedule room deletion after 5 minutes
            setTimeout(async () => {
                try {
                    await dbRef.child(`rooms/${this.currentRoomId}`).remove();
                    console.log('Room deleted');
                } catch (error) {
                    console.warn('Room cleanup failed:', error);
                }
            }, 5 * 60 * 1000);
        } catch (error) {
            console.error('Failed to end room:', error);
            throw new Error(`Ending room failed: ${error.message}`);
        }
    }

    /**
     * Leave the current room
     * @returns {Promise<void>}
     */
    async leaveRoom() {
        if (!this.currentRoomId) {
            return;
        }

        try {
            const user = this.firebaseClient.getCurrentUser();
            if (user) {
                const dbRef = this.firebaseClient.getDatabaseRef();
                await dbRef.child(`rooms/${this.currentRoomId}/players/${user.uid}`).remove();
            }

            // Unsubscribe from room updates
            this.unsubscribeFromRoom();

            // Clear presence
            if (this.presenceRef) {
                await this.presenceRef.onDisconnect().cancel();
                this.presenceRef = null;
            }

            console.log('Left room:', this.currentRoomId);
            this.currentRoomId = null;
            this.currentRoom = null;
        } catch (error) {
            console.error('Failed to leave room:', error);
        }
    }

    /**
     * Register callback for room status changes
     * @param {Function} callback - Callback function(status)
     */
    onRoomStatusChange(callback) {
        this.callbacks.onRoomStatusChange = callback;
    }

    /**
     * Register callback for questionSet received
     * @param {Function} callback - Callback function(questionSet)
     */
    onQuestionSetReceived(callback) {
        this.callbacks.onQuestionSetReceived = callback;
    }

    /**
     * Register callback for players changes
     * @param {Function} callback - Callback function(players)
     */
    onPlayersChange(callback) {
        this.callbacks.onPlayersChange = callback;
    }

    /**
     * Register callback for scores changes
     * @param {Function} callback - Callback function(scores)
     */
    onScoresChange(callback) {
        this.callbacks.onScoresChange = callback;
    }

    /**
     * Get current room ID
     * @returns {string|null}
     */
    getCurrentRoomId() {
        return this.currentRoomId;
    }

    /**
     * Check if user is host
     * @returns {boolean}
     */
    isHost() {
        if (!this.currentRoom) return false;
        const user = this.firebaseClient.getCurrentUser();
        return user && this.currentRoom.meta.hostUid === user.uid;
    }

    /**
     * Get current room status
     * @returns {string|null}
     */
    getCurrentRoomStatus() {
        return this.currentRoom ? this.currentRoom.meta.status : null;
    }

    /**
     * Set game for the room (host only, only when status is 'lobby')
     * @param {Object} gameMeta - Game metadata { gameId, version, title }
     * @returns {Promise<void>}
     */
    async setRoomGame(gameMeta) {
        if (!this.currentRoomId) {
            throw new Error('Not in a room');
        }

        const user = this.firebaseClient.getCurrentUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Check if user is host
        if (this.currentRoom && this.currentRoom.meta.hostUid !== user.uid) {
            throw new Error('Only host can set the game');
        }

        // Check if room is in lobby status
        if (this.currentRoom && this.currentRoom.meta.status !== 'lobby') {
            throw new Error('Game can only be set in lobby status');
        }

        try {
            const dbRef = this.firebaseClient.getDatabaseRef();
            const roomRef = dbRef.child(`rooms/${this.currentRoomId}`);

            // Update game metadata and change status to 'waiting'
            await roomRef.child('meta').update({
                gameId: gameMeta.gameId,
                gameVersion: gameMeta.version,
                title: gameMeta.title,
                status: 'waiting'
            });

            // Update local cache
            if (this.currentRoom) {
                this.currentRoom.meta.gameId = gameMeta.gameId;
                this.currentRoom.meta.gameVersion = gameMeta.version;
                this.currentRoom.meta.title = gameMeta.title;
                this.currentRoom.meta.status = 'waiting';
            }

            console.log('Game set successfully:', gameMeta.title);
        } catch (error) {
            console.error('Failed to set game:', error);
            throw new Error(`Setting game failed: ${error.message}`);
        }
    }

    /**
     * Register callback for game metadata changes
     * @param {Function} callback - Callback function(gameMeta)
     */
    onGameMetaChange(callback) {
        this.callbacks.onGameMetaChange = callback;
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.RoomClient = RoomClient;
}
