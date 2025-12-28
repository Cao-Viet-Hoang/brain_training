/**
 * Brain Training Games
 * Author: Cao Viet Hoang
 * Created: 2025
 */

/**
 * Number Hunt Game Multiplayer Adapter
 * Extends MultiplayerGameAdapter to integrate multiplayer functionality into Number Hunt Game
 * 
 * NOTE: This adapter is prepared for future multiplayer support.
 * Currently, the game runs in single-player mode only.
 */
class NumberHuntGameMultiplayerAdapter extends MultiplayerGameAdapter {
    constructor(gameInstance) {
        super(gameInstance, 'number-hunt');
        
        // Store original methods to restore later
        this.originalStartGame = null;
        this.originalShowResults = null;
        
        // Track multiplayer-specific state
        this.multiplayerState = {
            isMultiplayerMode: false,
            role: null, // 'host' or 'player'
            roundsReceived: false
        };
    }

    /**
     * Initialize adapter as HOST
     * Called when host navigates to game from lobby
     * @param {string} roomId - Room ID from sessionStorage
     */
    async initAsHost(roomId) {
        console.log('[NumberHuntAdapter] Initializing as HOST for room:', roomId);

        this.multiplayerState.isMultiplayerMode = true;
        this.multiplayerState.role = 'host';
        this.isMultiplayerMode = true;

        // Load saved settings into game config
        this.loadSavedSettingsToConfig();

        // Initialize core and UI
        await this.init(null, roomId);

        // Intercept game start to publish rounds
        this.interceptHostGameStart();

        // Setup multiplayer hooks
        this.setupScoreSync();
        this.setupGameEndDetection();

        // Show multiplayer badge
        this.showMultiplayerBadge('HOST');

        console.log('[NumberHuntAdapter] Host initialization complete');
    }

    /**
     * Load saved settings from window.GAME_SETTINGS into game config
     */
    loadSavedSettingsToConfig() {
        if (!window.GAME_SETTINGS) {
            console.log('[NumberHuntAdapter] No saved settings found, using defaults');
            return;
        }

        const settings = window.GAME_SETTINGS;
        console.log('[NumberHuntAdapter] Loading saved settings into config:', settings);

        // Apply saved settings to game config
        Object.keys(settings).forEach(key => {
            if (this.game.config.hasOwnProperty(key)) {
                this.game.config[key] = settings[key];
            }
        });

        console.log('[NumberHuntAdapter] Config after loading settings:', this.game.config);
    }

    /**
     * Initialize adapter as PLAYER
     * Called when player navigates to game automatically
     * @param {string} roomId - Room ID from sessionStorage
     */
    async initAsPlayer(roomId) {
        console.log('[NumberHuntAdapter] Initializing as PLAYER for room:', roomId);

        this.multiplayerState.isMultiplayerMode = true;
        this.multiplayerState.role = 'player';
        this.isMultiplayerMode = true;

        // Initialize core and UI
        await this.init(null, roomId);
        
        // Setup multiplayer hooks
        this.setupScoreSync();
        this.setupGameEndDetection();
        
        // Wait for rounds from host
        await this.waitForRoundsAndStart();
        
        // Show multiplayer badge
        this.showMultiplayerBadge('PLAYER');
        
        console.log('[NumberHuntAdapter] Player initialization complete');
    }

    /**
     * Intercept host's game start to publish game data to Firebase
     */
    interceptHostGameStart() {
        // Save original startGame method
        this.originalStartGame = this.game.startGame.bind(this.game);
        
        // Override with multiplayer version
        this.game.startGame = async () => {
            console.log('[NumberHuntAdapter] Host starting game - intercepted');

            // Validate config first
            if (!this.game.validateConfig()) {
                return;
            }

            // Save settings
            this.game.saveCurrentSettings();

            try {
                // Generate game data with seed
                const gameData = await this.prepareMultiplayerGame();
                
                // Publish to Firebase
                console.log('[NumberHuntAdapter] Publishing game data to Firebase...');
                await this.core.publishGameData(gameData);
                
                // Update room status to 'playing'
                await this.core.setRoomStatus(MP_CONSTANTS.ROOM_STATUS.PLAYING);
                
                console.log('[NumberHuntAdapter] Game data published, starting host game');
                
                // Start multiplayer game with the SAME seed that was published
                this.startMultiplayerGame(gameData);
                
                // Sync initial score
                this.syncScore(0);
                
            } catch (error) {
                console.error('[NumberHuntAdapter] Error starting multiplayer game:', error);
                alert('Failed to start multiplayer game: ' + error.message);
            }
        };
    }

    /**
     * Prepare game data for multiplayer
     * Instead of generating and sharing all rounds, we only share a seed
     * Each client will use the same seed to generate identical rounds
     * @returns {Object} Game data to publish
     */
    async prepareMultiplayerGame() {
        // Load config from UI (same as single player)
        const activeMode = document.querySelector('.mode-btn.active');
        this.game.config.mode = activeMode ? activeMode.dataset.mode : 'missing';
        this.game.config.ranges = this.game.getAllRanges();
        this.game.config.missingCount = parseInt(document.getElementById('missingCount').value);
        this.game.config.extraCount = parseInt(document.getElementById('extraCount').value);
        this.game.config.totalRounds = parseInt(document.getElementById('totalRounds').value);
        this.game.config.maxWrongAttempts = parseInt(document.getElementById('maxWrongAttempts').value);
        this.game.config.shuffleBoard = document.getElementById('shuffleBoard').checked;

        // Generate a random seed for this game session
        // All players will use this same seed to generate identical rounds
        const gameSeed = typeof generateRandomSeed === 'function' 
            ? generateRandomSeed() 
            : Math.floor(Date.now() * Math.random());
        
        this.game.config.gameSeed = gameSeed;
        
        console.log('[NumberHuntAdapter] Generated game seed:', gameSeed);

        // Return only config with seed - NO rounds data
        return {
            config: this.game.config,
            gameSeed: gameSeed,
            timestamp: Date.now()
        };
    }

    /**
     * Wait for game data (seed + config) from host and auto-start game
     */
    async waitForRoundsAndStart() {
        console.log('[NumberHuntAdapter] Player waiting for game data from host...');

        // Show loading overlay
        this.showLoadingOverlay('Waiting for host to start game...');

        return new Promise((resolve) => {
            // Listen for game data
            const unsubscribe = this.core.onGameDataUpdate((gameData) => {
                if (gameData && gameData.config && gameData.gameSeed) {
                    console.log('[NumberHuntAdapter] Game data received:', {
                        gameSeed: gameData.gameSeed,
                        config: gameData.config
                    });

                    this.multiplayerState.roundsReceived = true;

                    // Hide loading overlay
                    this.hideLoadingOverlay();

                    // Start game with received data
                    this.startMultiplayerGame(gameData);

                    // Unsubscribe from further updates
                    unsubscribe();

                    resolve();
                }
            });
        });
    }

    /**
     * Setup score synchronization
     */
    setupScoreSync() {
        // Save original score update logic
        const originalSubmitAnswer = this.game.submitAnswer.bind(this.game);
        
        this.game.submitAnswer = () => {
            // Call original
            originalSubmitAnswer();
            
            // Sync score after submission
            if (this.isMultiplayerMode) {
                setTimeout(() => {
                    this.syncScore(this.game.gameState.totalScore);
                }, 100);
            }
        };
    }

    /**
     * Setup game end detection
     */
    setupGameEndDetection() {
        // Save original showFinalResults
        this.originalShowResults = this.game.showFinalResults.bind(this.game);
        
        this.game.showFinalResults = async () => {
            if (this.isMultiplayerMode) {
                // Mark as finished
                await this.core.markPlayerFinished();
                
                // Show multiplayer results
                await this.showMultiplayerResults(this.game.gameState.totalScore);
            } else {
                // Normal single-player results
                this.originalShowResults();
            }
        };
    }

    /**
     * Show multiplayer badge
     */
    showMultiplayerBadge(role) {
        const badge = document.createElement('div');
        badge.id = 'multiplayerBadge';
        badge.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 8px 16px;
            background: ${role === 'HOST' ? '#4a90a4' : '#70b088'};
            color: white;
            border-radius: 20px;
            font-weight: 600;
            font-size: 0.9rem;
            z-index: 9999;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        badge.innerHTML = `
            <span style="font-size: 1.2rem;">🎮</span>
            <span>Multiplayer ${role}</span>
        `;
        document.body.appendChild(badge);
    }

    /**
     * Show loading overlay for players waiting for host
     */
    showLoadingOverlay(message) {
        const overlay = document.createElement('div');
        overlay.id = 'multiplayerLoadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            color: white;
            font-family: inherit;
        `;
        overlay.innerHTML = `
            <style>
                @keyframes hourglassRotate {
                    0%, 100% { transform: rotate(0deg); }
                    50% { transform: rotate(180deg); }
                }
                .hourglass-icon {
                    display: inline-block;
                    animation: hourglassRotate 2s ease-in-out infinite;
                }
            </style>
            <div style="text-align: center;">
                <div class="hourglass-icon" style="font-size: 3rem; margin-bottom: 1rem;">⌛</div>
                <h2 style="margin: 0 0 0.5rem 0;">${message}</h2>
                <p style="margin: 0; opacity: 0.7;">Please wait...</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    /**
     * Hide loading overlay
     */
    hideLoadingOverlay() {
        const overlay = document.getElementById('multiplayerLoadingOverlay');
        if (overlay) {
            overlay.remove();
        }
    }

    /**
     * Start game with shared seed and config (ALL PLAYERS)
     */
    startMultiplayerGame(gameData) {
        console.log('[NumberHuntAdapter] Starting multiplayer game with shared seed');

        // Set game start time for tracking
        this.setGameStartTime();

        // Apply config from host (including the seed)
        this.game.config = { ...gameData.config };
        this.game.config.gameSeed = gameData.gameSeed;

        // Reset game state
        this.game.gameState = {
            currentRound: 0,
            totalScore: 0,
            rounds: [],
            currentRoundData: null,
            userAnswers: [],
            wrongAttempts: 0,
            roundStartTime: null,
            timer: null,
            roundResults: []
        };

        // Generate rounds locally using the same seed
        // This will produce identical rounds for all players
        this.game.generateAllRounds();

        console.log('[NumberHuntAdapter] Generated', this.game.gameState.rounds.length, 'rounds using seed:', gameData.gameSeed);

        // Show game screen
        this.game.showScreen('game');

        // Start first round
        this.game.startRound();

        console.log('[NumberHuntAdapter] Game started');
    }

    /**
     * Get current player score
     * Required by MultiplayerGameAdapter
     */
    getCurrentScore() {
        return {
            score: this.game.gameState.totalScore,
            round: this.game.gameState.currentRound,
            totalRounds: this.game.config.totalRounds
        };
    }

    /**
     * Handle players list update
     * Optional callback
     */
    onPlayersUpdate(players) {
        console.log('[NumberHuntAdapter] Players updated:', Object.keys(players).length, 'players');
        // Update any multiplayer UI elements (if needed)
    }

    /**
     * Check if currently in multiplayer mode
     */
    isInMultiplayerMode() {
        return this.multiplayerState.isMultiplayerMode;
    }

    /**
     * Check if current player is host
     */
    isHost() {
        return this.multiplayerState.role === 'host';
    }
}

console.log('[NumberHuntAdapter] Adapter class loaded');
