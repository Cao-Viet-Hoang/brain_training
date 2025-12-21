/**
 * Multiplayer Game Adapter
 * Base class for integrating multiplayer functionality into games
 */
class MultiplayerGameAdapter {
    constructor(gameInstance, gameType) {
        this.game = gameInstance;
        this.gameType = gameType;
        this.core = new MultiplayerCore();
        this.ui = null;
        this.isMultiplayerMode = false;
        this.currentRoomData = null;
    }

    // ==================== INITIALIZATION ====================

    /**
     * Initialize multiplayer for a game
     * @param {string} containerId - Container ID for multiplayer UI (null if in game page)
     * @param {string} roomId - Room ID to reconnect to (optional)
     */
    async init(containerId = null, roomId = null) {
        try {
            console.log('[MultiplayerAdapter] Initializing...');
            
            // Initialize core
            await this.core.initAuth();
            
            // Initialize UI only if container provided (not in game page)
            if (containerId) {
                this.ui = new MultiplayerUI(containerId);
                this.setupUICallbacks();
            } else {
                console.log('[MultiplayerAdapter] No container provided, skipping UI initialization');
            }
            
            // If roomId provided, reconnect to that room
            if (roomId) {
                this.roomId = roomId;  // NEW - Store roomId in adapter
                this.core.roomId = roomId;
                this.core.roomRef = database.ref(`rooms/${roomId}`);
                
                // Fetch room data to determine if this player is host
                const snapshot = await this.core.roomRef.once('value');
                const roomData = snapshot.val();
                if (roomData && roomData.meta.hostId === this.core.playerId) {
                    this.core.isHost = true;
                    console.log('[MultiplayerAdapter] Reconnected as HOST');
                } else {
                    this.core.isHost = false;
                    console.log('[MultiplayerAdapter] Reconnected as PLAYER');
                }
                
                // Setup disconnect handler and heartbeat after reconnect
                this.core.setupDisconnectHandler();
                this.core.startHeartbeat();
                
                this.core.setupRoomListeners();
                this.setupGameListeners();
                console.log('[MultiplayerAdapter] Reconnected to room:', roomId);
            }
            
            console.log('[MultiplayerAdapter] Initialization complete');
        } catch (error) {
            console.error('[MultiplayerAdapter] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup UI event handlers
     */
    setupUICallbacks() {
        // Create room callback
        this.ui.onCreateRoom(async (playerName, gameConfig) => {
            try {
                await this.handleCreateRoom(playerName, gameConfig);
            } catch (error) {
                console.error('Error creating room:', error);
                this.ui.showError(error.message || 'Failed to create room');
            }
        });

        // Join room callback
        this.ui.onJoinRoom(async (roomCode, playerName) => {
            try {
                await this.handleJoinRoom(roomCode, playerName);
            } catch (error) {
                console.error('Error joining room:', error);
                this.ui.showError(error.message || 'Failed to join room');
            }
        });

        // Start game callback
        this.ui.onStartGame(async () => {
            try {
                await this.handleStartGame();
            } catch (error) {
                console.error('Error starting game:', error);
                alert('Failed to start game: ' + error.message);
            }
        });

        // Leave room callback
        this.ui.onLeaveRoom(async () => {
            if (confirm('Are you sure you want to leave the room?')) {
                try {
                    await this.handleLeaveRoom();
                } catch (error) {
                    console.error('Error leaving room:', error);
                }
            }
        });

        // Toggle ready callback
        this.ui.onToggleReady(async (isReady) => {
            try {
                await this.core.setPlayerReady(isReady);
            } catch (error) {
                console.error('Error toggling ready:', error);
            }
        });
    }

    // ==================== ROOM MANAGEMENT ====================

    /**
     * Handle room creation
     */
    async handleCreateRoom(playerName, gameConfig) {
        const roomCode = await this.core.createRoom(this.gameType, gameConfig, playerName);
        
        this.isMultiplayerMode = true;
        this.currentRoomData = {
            roomId: roomCode,
            maxPlayers: gameConfig?.maxPlayers || MP_CONSTANTS.MAX_PLAYERS
        };

        const players = {
            [this.core.getPlayerId()]: {
                name: playerName,
                isHost: true,
                isReady: false
            }
        };

        this.ui.renderLobbyView(this.currentRoomData, players, this.core.getPlayerId(), true);
        this.setupGameListeners();

        console.log('✅ Room created:', roomCode);
    }

    /**
     * Handle room joining
     */
    async handleJoinRoom(roomCode, playerName) {
        const roomData = await this.core.joinRoom(roomCode, playerName);
        
        this.isMultiplayerMode = true;
        this.currentRoomData = {
            roomId: roomCode,
            maxPlayers: roomData.meta.maxPlayers
        };

        this.ui.renderLobbyView(this.currentRoomData, roomData.players, this.core.getPlayerId(), false);
        this.setupGameListeners();

        console.log('✅ Joined room:', roomCode);
    }

    /**
     * Handle game start (from lobby)
     */
    async handleStartGame() {
        if (!this.core.isRoomHost()) {
            throw new Error('Only host can start the game');
        }

        // Prepare game data (override in specific adapters)
        const gameData = await this.prepareMultiplayerGame();
        
        // Publish game data to Firebase
        if (gameData) {
            await this.core.publishGameData(gameData);
        }

        // Update room status
        await this.core.setRoomStatus(MP_CONSTANTS.ROOM_STATUS.PLAYING);

        // Start the actual game
        this.startMultiplayerGame(gameData);

        console.log('🎮 Game started');
    }

    /**
     * Handle leaving room
     */
    async handleLeaveRoom() {
        await this.core.leaveRoom();
        this.isMultiplayerMode = false;
        this.currentRoomData = null;
        this.ui.reset();
        this.ui.renderMenuView();
        
        // Call cleanup hook (override in specific adapters)
        this.onRoomLeft();
    }

    // ==================== GAME LISTENERS ====================

    /**
     * Setup game-specific listeners
     */
    setupGameListeners() {
        console.log('[MultiplayerAdapter] Setting up game listeners...');
        
        // Listen for player changes
        this.core.onPlayersChange((players) => {
            console.log('[MultiplayerAdapter] Players changed:', Object.keys(players || {}).length, 'players');
            
            // Only update UI if it exists (not in game page)
            if (this.ui) {
                this.ui.updatePlayers(players);
            }
            this.onPlayersUpdate(players);
        });

        // Listen for room closed
        this.core.onRoomClosed(() => {
            this.handleRoomClosed();
        });

        // Listen for game data ready
        this.core.onGameDataReady((data) => {
            this.onGameDataReceived(data);
        });

        // Listen for game state changes
        this.core.onGameStateChange((state) => {
            this.onGameStateUpdate(state);
        });

        // Listen for status changes
        this.core.onStatusChange((status) => {
            if (status === MP_CONSTANTS.ROOM_STATUS.PLAYING && !this.core.isRoomHost()) {
                // Only navigate if we're in lobby (index.html), not already in game page
                // Game page adapters handle game start differently (via waitForGameDataAndStart)
                const currentPath = window.location.pathname;
                const isInGamePage = currentPath.includes('/games/') && !currentPath.endsWith('index.html');

                if (!isInGamePage) {
                    // Non-host player in lobby: navigate to game page
                    this.handleGameStartedAsPlayer();
                }
            }
        });
    }

    /**
     * Handle room closed by host
     */
    handleRoomClosed() {
        this.isMultiplayerMode = false;
        this.currentRoomData = null;
        this.ui.reset();
        alert('The host has left and closed the room. You have been disconnected.');
        this.ui.renderMenuView();
        this.onRoomLeft();
    }

    /**
     * Handle game started (for non-host players)
     * Navigate to the correct game page based on room's game type
     */
    async handleGameStartedAsPlayer() {
        console.log('🎮 Game started by host');

        // Get room data to find the game type
        const snapshot = await this.core.roomRef.once('value');
        const roomData = snapshot.val();

        if (!roomData || !roomData.meta) {
            console.error('Cannot get room data');
            return;
        }

        const gameType = roomData.meta.gameType;
        const gameFiles = {
            'math-game': 'math-game.html',
            'pixel-game': 'pixel-game.html',
            'expression-puzzle': 'expression-puzzle.html',
            'dual-n-back': 'dual-n-back.html',
            'memory-matrix': 'memory-matrix.html',
            'word-recall': 'word-recall.html'
        };

        const gameFile = gameFiles[gameType];

        if (!gameFile) {
            console.error('Unknown game type:', gameType);
            return;
        }

        // Determine the correct path based on current location
        const currentPath = window.location.pathname;
        const isInGamesFolder = currentPath.includes('/games/');
        const gameUrl = isInGamesFolder ? gameFile : `games/${gameFile}`;

        // Store room info in sessionStorage
        sessionStorage.setItem('multiplayerRoomId', this.core.roomId);
        sessionStorage.setItem('multiplayerRole', 'player');

        console.log('🎮 Navigating player to:', gameUrl);

        // Navigate to game
        window.location.href = gameUrl;
    }

    // ==================== SYNC METHODS ====================

    /**
     * Sync player score
     */
    async syncScore(score) {
        if (!this.isMultiplayerMode) return;
        
        try {
            await this.core.updatePlayerState({ 
                score,
                lastUpdate: Date.now()
            });
        } catch (error) {
            console.error('❌ Failed to sync score:', error);
        }
    }

    /**
     * Sync game progress (host only)
     */
    async syncGameProgress(progress) {
        if (!this.isMultiplayerMode || !this.core.isRoomHost()) return;
        
        try {
            await this.core.updateGameState(progress);
        } catch (error) {
            console.error('❌ Failed to sync game progress:', error);
        }
    }

    /**
     * End multiplayer game
     */
    async endMultiplayerGame(results) {
        if (!this.isMultiplayerMode) return;

        try {
            // Update final score
            await this.core.updatePlayerState({
                score: results.score,
                finished: true,
                finishedAt: Date.now()
            });

            // Host updates room status
            if (this.core.isRoomHost()) {
                await this.core.setRoomStatus(MP_CONSTANTS.ROOM_STATUS.FINISHED);
            }

            console.log('🏁 Game ended:', results);
        } catch (error) {
            console.error('❌ Failed to end game:', error);
        }
    }

    // ==================== GAME LIFECYCLE HOOKS ====================
    // Override these in specific game adapters

    /**
     * Get current game configuration
     * @returns {Object} Game config
     */
    getGameConfig() {
        return {};
    }

    /**
     * Prepare multiplayer game (host only)
     * Generate questions, setup game state, etc.
     * @returns {Object} Game data to be shared with all players
     */
    async prepareMultiplayerGame() {
        console.warn('⚠️ prepareMultiplayerGame() not implemented in adapter');
        return null;
    }

    /**
     * Start multiplayer game
     * @param {Object} gameData Shared game data from host
     */
    startMultiplayerGame(gameData) {
        console.warn('⚠️ startMultiplayerGame() not implemented in adapter');
    }

    /**
     * Get current player score
     * @returns {number} Current score
     */
    getCurrentScore() {
        return 0;
    }

    /**
     * Called when players list updates
     * @param {Object} players Updated players object
     */
    onPlayersUpdate(players) {
        // Override in specific adapters
    }

    /**
     * Called when game data is received (non-host)
     * @param {Object} data Game data from host
     */
    onGameDataReceived(data) {
        // Override in specific adapters
    }

    /**
     * Called when game state updates
     * @param {Object} state Game state
     */
    onGameStateUpdate(state) {
        // Override in specific adapters
    }

    /**
     * Called when room is left or closed
     */
    onRoomLeft() {
        // Override in specific adapters
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Check if in multiplayer mode
     */
    isInMultiplayerMode() {
        return this.isMultiplayerMode;
    }

    /**
     * Check if current player is host
     */
    isHost() {
        return this.core.isRoomHost();
    }

    /**
     * Get room code
     */
    getRoomCode() {
        return this.currentRoomData?.roomId || null;
    }

    /**
     * Get player ID
     */
    getPlayerId() {
        return this.core.getPlayerId();
    }

    /**
     * Get player name
     */
    getPlayerName() {
        return this.core.getPlayerName();
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiplayerGameAdapter;
}
