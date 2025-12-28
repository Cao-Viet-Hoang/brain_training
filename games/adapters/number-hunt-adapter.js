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
     * Intercept host's game start to publish rounds to Firebase
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
                // Generate rounds using game's logic
                const gameData = await this.prepareMultiplayerGame();
                
                // Publish to Firebase
                console.log('[NumberHuntAdapter] Publishing game data to Firebase...');
                await this.core.publishGameData(gameData);
                
                // Update room status to 'playing'
                await this.core.setRoomStatus(MP_CONSTANTS.ROOM_STATUS.PLAYING);
                
                // Continue with normal game start (use original method)
                this.originalStartGame();
                
            } catch (error) {
                console.error('[NumberHuntAdapter] Error starting multiplayer game:', error);
                alert('Failed to start multiplayer game: ' + error.message);
            }
        };
    }

    /**
     * Prepare game data for multiplayer
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

        // Generate all rounds
        const rounds = [];
        for (let i = 0; i < this.game.config.totalRounds; i++) {
            if (this.game.config.mode === 'missing') {
                rounds.push(this.game.generateMissingRound());
            } else {
                rounds.push(this.game.generateExtraRound());
            }
        }

        return {
            config: this.game.config,
            rounds: rounds,
            timestamp: Date.now()
        };
    }

    /**
     * Wait for rounds from host and start game
     */
    async waitForRoundsAndStart() {
        console.log('[NumberHuntAdapter] Player waiting for rounds from host...');

        try {
            const gameData = await this.core.waitForGameData();
            
            if (!gameData || !gameData.rounds) {
                throw new Error('Invalid game data received from host');
            }

            console.log('[NumberHuntAdapter] Rounds received:', gameData);

            // Apply config from host
            this.game.config = { ...gameData.config };
            
            // Use rounds from host
            this.game.gameState.rounds = gameData.rounds;
            
            // Skip config screen and go directly to game
            this.game.showScreen('game');
            this.game.startRound();
            
        } catch (error) {
            console.error('[NumberHuntAdapter] Error receiving rounds:', error);
            alert('Failed to receive game data from host: ' + error.message);
        }
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
        const header = document.querySelector('.game-header h1');
        if (header && !header.querySelector('.mp-badge')) {
            const badge = document.createElement('span');
            badge.className = 'mp-badge';
            badge.textContent = role;
            badge.style.cssText = `
                display: inline-block;
                margin-left: 0.5rem;
                padding: 0.25rem 0.75rem;
                background: var(--primary-color);
                color: white;
                border-radius: var(--radius-sm);
                font-size: 0.8rem;
                font-weight: 600;
            `;
            header.appendChild(badge);
        }
    }
}

// Auto-initialize for multiplayer if needed
document.addEventListener('DOMContentLoaded', () => {
    const roomId = sessionStorage.getItem('multiplayerRoomId');
    const role = sessionStorage.getItem('multiplayerRole');
    
    if (roomId && role && typeof game !== 'undefined') {
        console.log('[NumberHuntAdapter] Multiplayer mode detected:', role);
        
        const adapter = new NumberHuntGameMultiplayerAdapter(game);
        
        if (role === 'host') {
            adapter.initAsHost(roomId);
        } else if (role === 'player') {
            adapter.initAsPlayer(roomId);
        }
    }
});
