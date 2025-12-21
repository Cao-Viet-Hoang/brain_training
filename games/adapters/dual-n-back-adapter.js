/**
 * Dual N-Back Game Multiplayer Adapter
 * Extends MultiplayerGameAdapter to integrate multiplayer functionality into Dual N-Back Game
 */
class DualNBackMultiplayerAdapter extends MultiplayerGameAdapter {
    constructor(gameEngine, uiController) {
        super(gameEngine, 'dual-n-back');

        this.uiController = uiController;

        // Store original methods
        this.originalStartGame = null;
        this.originalShowResults = null;

        // Track multiplayer-specific state
        this.multiplayerState = {
            isMultiplayerMode: false,
            role: null,
            gameDataReceived: false
        };
    }

    /**
     * Initialize adapter as HOST
     * @param {string} roomId - Room ID from sessionStorage
     */
    async initAsHost(roomId) {
        console.log('[DualNBackAdapter] Initializing as HOST for room:', roomId);

        this.multiplayerState.isMultiplayerMode = true;
        this.multiplayerState.role = 'host';

        await this.init(null, roomId);

        this.interceptHostGameStart();
        this.setupScoreSync();
        this.setupGameEndDetection();

        this.showMultiplayerBadge('HOST');

        console.log('[DualNBackAdapter] Host initialization complete');
    }

    /**
     * Initialize adapter as PLAYER
     * @param {string} roomId - Room ID from sessionStorage
     */
    async initAsPlayer(roomId) {
        console.log('[DualNBackAdapter] Initializing as PLAYER for room:', roomId);

        this.multiplayerState.isMultiplayerMode = true;
        this.multiplayerState.role = 'player';

        await this.init(null, roomId);

        this.setupScoreSync();
        this.setupGameEndDetection();

        await this.waitForGameDataAndStart();

        this.showMultiplayerBadge('PLAYER');

        console.log('[DualNBackAdapter] Player initialization complete');
    }

    /**
     * Intercept host's game start
     */
    interceptHostGameStart() {
        this.originalStartGame = this.uiController.startGame.bind(this.uiController);

        this.uiController.startGame = async () => {
            console.log('[DualNBackAdapter] Host starting game - intercepted');

            try {
                const gameData = await this.prepareMultiplayerGame();

                console.log('[DualNBackAdapter] Publishing game data to Firebase...');
                await this.core.publishGameData(gameData);

                await this.core.setRoomStatus(MP_CONSTANTS.ROOM_STATUS.PLAYING);

                console.log('[DualNBackAdapter] Game data published, starting host game');

                this.startMultiplayerGame(gameData);
                this.syncScore(0);

            } catch (error) {
                console.error('[DualNBackAdapter] Failed to start multiplayer game:', error);
                alert('Failed to start multiplayer game: ' + error.message);
            }
        };
    }

    /**
     * Wait for game data from host
     */
    async waitForGameDataAndStart() {
        console.log('[DualNBackAdapter] Waiting for game data from host...');

        this.showLoadingOverlay('Waiting for host to start game...');

        return new Promise((resolve) => {
            const unsubscribe = this.core.onGameDataUpdate((gameData) => {
                if (gameData && gameData.sequence) {
                    console.log('[DualNBackAdapter] Received game data from host');

                    this.multiplayerState.gameDataReceived = true;
                    this.hideLoadingOverlay();
                    this.startMultiplayerGame(gameData);
                    unsubscribe();
                    resolve();
                }
            });
        });
    }

    /**
     * Show loading overlay
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
            <div style="text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⏳</div>
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
     * Get current game configuration
     */
    getGameConfig() {
        return {
            N: this.game.config.N,
            gridSize: this.game.config.gridSize,
            totalTrials: this.game.config.totalTrials,
            stimulusDurationMs: this.game.config.stimulusDurationMs,
            interTrialIntervalMs: this.game.config.interTrialIntervalMs,
            lettersPool: this.game.config.lettersPool,
            targetMatchRatePosition: this.game.config.targetMatchRatePosition,
            targetMatchRateLetter: this.game.config.targetMatchRateLetter,
            targetDualMatchRate: this.game.config.targetDualMatchRate
        };
    }

    /**
     * Prepare multiplayer game data (HOST ONLY)
     */
    async prepareMultiplayerGame() {
        console.log('[DualNBackAdapter] Preparing multiplayer game');

        // Get configuration from UI
        const nBackBtn = document.querySelector('#nBackLevelButtons .option-btn.active');
        const gridSizeBtn = document.querySelector('#gridSizeButtons .option-btn.active');

        const config = {
            N: parseInt(nBackBtn.dataset.value),
            gridSize: parseInt(gridSizeBtn.dataset.value),
            totalTrials: parseInt(document.getElementById('totalTrials').value),
            stimulusDurationMs: parseInt(document.getElementById('stimulusDuration').value),
            interTrialIntervalMs: parseInt(document.getElementById('interTrialInterval').value),
            lettersPool: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
            targetMatchRatePosition: 0.25,
            targetMatchRateLetter: 0.25,
            targetDualMatchRate: 0.07
        };

        config.responseWindowMs = config.stimulusDurationMs + config.interTrialIntervalMs;

        // Generate sequence
        const generator = new SequenceGenerator(config);
        const sequence = generator.generate();

        const gameData = {
            config: config,
            sequence: sequence,
            generatedAt: Date.now()
        };

        console.log('[DualNBackAdapter] Game data prepared:', {
            totalTrials: config.totalTrials,
            N: config.N
        });

        return gameData;
    }

    /**
     * Start multiplayer game with shared data (ALL PLAYERS)
     */
    startMultiplayerGame(gameData) {
        console.log('[DualNBackAdapter] Starting multiplayer game with shared data');

        // Set config
        this.game.config = gameData.config;

        // Reset game state
        this.game.reset();

        // Set sequence
        this.game.sequence = gameData.sequence;
        this.game.state = 'RUNNING';

        // Show game screen and setup
        this.uiController.showScreen('game');
        this.uiController.setupGameGrid();
        this.uiController.updateGameInfo();
        this.uiController.startNextTrial();

        console.log('[DualNBackAdapter] Game started with', gameData.config.totalTrials, 'trials');
    }

    /**
     * Get current player score
     */
    getCurrentScore() {
        return {
            score: this.game.score,
            currentTrial: this.game.currentTrial,
            totalTrials: this.game.config.totalTrials
        };
    }

    /**
     * Setup score syncing
     */
    setupScoreSync() {
        const originalEndTrial = this.uiController.endCurrentTrial.bind(this.uiController);

        this.uiController.endCurrentTrial = async () => {
            originalEndTrial();

            // Sync score after trial ends
            const score = this.getCurrentScore();
            await this.syncScore(score.score);

            console.log('[DualNBackAdapter] Score synced:', score);
        };
    }

    /**
     * Setup game end detection
     */
    setupGameEndDetection() {
        this.originalShowResults = this.uiController.showResults.bind(this.uiController);

        this.uiController.showResults = async () => {
            console.log('[DualNBackAdapter] Game ending, syncing final scores...');

            await this.onMultiplayerGameEnd();
            this.originalShowResults();
        };
    }

    /**
     * Handle game end in multiplayer mode
     */
    async onMultiplayerGameEnd() {
        console.log('[DualNBackAdapter] Multiplayer game ended');

        const finalScore = this.getCurrentScore();
        await this.syncScore(finalScore.score);

        const stats = this.game.analytics.calculateFinalStats();

        await this.endMultiplayerGame({
            score: finalScore.score,
            positionAccuracy: stats.position.accuracy,
            letterAccuracy: stats.letter.accuracy,
            dualMatchBonuses: stats.dualMatchBonuses
        });

        console.log('[DualNBackAdapter] Final scores synced');
    }

    /**
     * Handle room left/closed
     */
    onRoomLeft() {
        console.log('[DualNBackAdapter] Room left or closed');

        if (this.uiController.currentTrialTimeout) {
            clearTimeout(this.uiController.currentTrialTimeout);
        }

        sessionStorage.removeItem('multiplayerRoomId');
        sessionStorage.removeItem('multiplayerRole');

        alert('The room has been closed. You will be redirected to the home page.');
        window.location.href = '../index.html';
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

console.log('[DualNBackAdapter] Adapter class loaded');
