/**
 * Memory Matrix Game Multiplayer Adapter
 * Extends MultiplayerGameAdapter to integrate multiplayer functionality into Memory Matrix Game
 */
class MemoryMatrixMultiplayerAdapter extends MultiplayerGameAdapter {
    constructor(gameCoordinator) {
        super(gameCoordinator.engine, 'memory-matrix');

        this.coordinator = gameCoordinator;
        this.engine = gameCoordinator.engine;
        this.ui = gameCoordinator.ui;

        // Store original methods
        this.originalStartGame = null;
        this.originalShowResultScreen = null;

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
        console.log('[MemoryMatrixAdapter] Initializing as HOST for room:', roomId);

        this.multiplayerState.isMultiplayerMode = true;
        this.multiplayerState.role = 'host';
        this.isMultiplayerMode = true; // Set base class flag

        await this.init(null, roomId);

        this.interceptHostGameStart();
        this.setupScoreSync();
        this.setupGameEndDetection();

        this.showMultiplayerBadge('HOST');

        console.log('[MemoryMatrixAdapter] Host initialization complete');
    }

    /**
     * Initialize adapter as PLAYER
     * @param {string} roomId - Room ID from sessionStorage
     */
    async initAsPlayer(roomId) {
        console.log('[MemoryMatrixAdapter] Initializing as PLAYER for room:', roomId);

        this.multiplayerState.isMultiplayerMode = true;
        this.multiplayerState.role = 'player';
        this.isMultiplayerMode = true; // Set base class flag

        await this.init(null, roomId);

        this.setupScoreSync();
        this.setupGameEndDetection();

        await this.waitForGameDataAndStart();

        this.showMultiplayerBadge('PLAYER');

        console.log('[MemoryMatrixAdapter] Player initialization complete');
    }

    /**
     * Intercept host's game start
     */
    interceptHostGameStart() {
        this.originalStartGame = this.ui.handleStartGame.bind(this.ui);

        this.ui.handleStartGame = async () => {
            console.log('[MemoryMatrixAdapter] Host starting game - intercepted');

            try {
                const gameData = await this.prepareMultiplayerGame();

                console.log('[MemoryMatrixAdapter] Publishing game data to Firebase...');
                await this.core.publishGameData(gameData);

                await this.core.setRoomStatus(MP_CONSTANTS.ROOM_STATUS.PLAYING);

                console.log('[MemoryMatrixAdapter] Game data published, starting host game');

                this.startMultiplayerGame(gameData);
                this.syncScore(0);

            } catch (error) {
                console.error('[MemoryMatrixAdapter] Failed to start multiplayer game:', error);
                alert('Failed to start multiplayer game: ' + error.message);
            }
        };
    }

    /**
     * Wait for game data from host
     */
    async waitForGameDataAndStart() {
        console.log('[MemoryMatrixAdapter] Waiting for game data from host...');

        this.showLoadingOverlay('Waiting for host to start game...');

        return new Promise((resolve) => {
            const unsubscribe = this.core.onGameDataUpdate((gameData) => {
                if (gameData && gameData.levels) {
                    console.log('[MemoryMatrixAdapter] Received game data from host');

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
                <div class="hourglass-icon" style="font-size: 3rem; margin-bottom: 1rem;">⏳</div>
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
        const config = this.ui.getConfigValues();
        return {
            mode: config.mode,
            mistakePolicy: config.mistakePolicy,
            startGridSize: config.startGridSize
        };
    }

    /**
     * Prepare multiplayer game data (HOST ONLY)
     */
    async prepareMultiplayerGame() {
        console.log('[MemoryMatrixAdapter] Preparing multiplayer game');

        // Get configuration from UI
        const config = this.ui.getConfigValues();

        // Update engine config
        this.engine.config.mode = config.mode;
        this.engine.config.mistakePolicy = config.mistakePolicy;
        this.engine.config.startGridSize = config.startGridSize;

        // Generate patterns for multiple levels (pre-generate to share)
        const levels = [];
        const maxLevels = 20; // Pre-generate up to 20 levels

        for (let level = 1; level <= maxLevels; level++) {
            const levelParams = this.engine.levelManager.getLevelParams(level);
            const targetCells = this.engine.patternGenerator.generate(
                levelParams.gridSize,
                levelParams.targetsCount
            );

            levels.push({
                level: level,
                gridSize: levelParams.gridSize,
                targetsCount: levelParams.targetsCount,
                showDurationMs: levelParams.showDurationMs,
                inputTimeLimitMs: levelParams.inputTimeLimitMs,
                betweenFlashMs: levelParams.betweenFlashMs,
                targetCells: targetCells
            });
        }

        const gameData = {
            config: {
                mode: config.mode,
                mistakePolicy: config.mistakePolicy,
                startGridSize: config.startGridSize
            },
            levels: levels,
            generatedAt: Date.now()
        };

        console.log('[MemoryMatrixAdapter] Game data prepared:', {
            levelsGenerated: levels.length
        });

        return gameData;
    }

    /**
     * Start multiplayer game with shared data (ALL PLAYERS)
     */
    startMultiplayerGame(gameData) {
        console.log('[MemoryMatrixAdapter] Starting multiplayer game with shared data');

        // Set game start time for tracking
        this.setGameStartTime();

        // Set config
        this.engine.config.mode = gameData.config.mode;
        this.engine.config.mistakePolicy = gameData.config.mistakePolicy;
        this.engine.config.startGridSize = gameData.config.startGridSize;

        // Store pre-generated levels
        this.preGeneratedLevels = gameData.levels;

        // Override pattern generator to use pre-generated patterns
        const originalGenerate = this.engine.patternGenerator.generate.bind(this.engine.patternGenerator);
        this.engine.patternGenerator.generate = (gridSize, targetsCount) => {
            const levelData = this.preGeneratedLevels.find(l => l.level === this.engine.level);
            if (levelData) {
                return levelData.targetCells;
            }
            return originalGenerate(gridSize, targetsCount);
        };

        // Show/hide lives based on policy
        if (gameData.config.mistakePolicy === 'lose_life') {
            this.ui.elements.livesContainer.style.display = 'block';
            this.engine.lives = 3;
        } else {
            this.ui.elements.livesContainer.style.display = 'none';
        }

        // Show/hide timer based on mode
        if (gameData.config.mode === 'timed') {
            this.ui.elements.timerContainer.style.display = 'block';
        } else {
            this.ui.elements.timerContainer.style.display = 'none';
        }

        // Start game
        this.ui.showScreen('game');
        this.engine.startGame();
        this.ui.renderLevel();

        console.log('[MemoryMatrixAdapter] Game started');
    }

    /**
     * Get current player score
     */
    getCurrentScore() {
        return {
            score: this.engine.score,
            level: this.engine.level,
            streak: this.engine.streak,
            bestStreak: this.engine.bestStreak
        };
    }

    /**
     * Setup score syncing
     */
    setupScoreSync() {
        const originalSubmitInput = this.engine.submitInput.bind(this.engine);

        this.engine.submitInput = () => {
            const result = originalSubmitInput();

            // Sync score after submission
            const score = this.getCurrentScore();
            this.syncScore(score.score);

            console.log('[MemoryMatrixAdapter] Score synced:', score);

            return result;
        };
    }

    /**
     * Setup game end detection
     */
    setupGameEndDetection() {
        this.originalShowResultScreen = this.ui.showResultScreen.bind(this.ui);

        this.ui.showResultScreen = async (reason) => {
            console.log('[MemoryMatrixAdapter] Game ending, syncing final scores...');

            await this.onMultiplayerGameEnd();
            this.originalShowResultScreen(reason);
        };
    }

    /**
     * Handle game end in multiplayer mode
     */
    async onMultiplayerGameEnd() {
        console.log('[MemoryMatrixAdapter] Multiplayer game ended');

        const finalScore = this.getCurrentScore();
        await this.syncScore(finalScore.score);

        await this.endMultiplayerGame({
            score: finalScore.score,
            details: {
                level: finalScore.level,
                streak: finalScore.bestStreak || finalScore.streak
            }
        });

        console.log('[MemoryMatrixAdapter] Final scores synced');
    }

    /**
     * Handle room left/closed
     */
    onRoomLeft() {
        console.log('[MemoryMatrixAdapter] Room left or closed');

        this.engine.clearTimers();

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

console.log('[MemoryMatrixAdapter] Adapter class loaded');
