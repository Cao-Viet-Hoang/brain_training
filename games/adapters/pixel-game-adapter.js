/**
 * Pixel Number Game Multiplayer Adapter
 * Extends MultiplayerGameAdapter to integrate multiplayer functionality into Pixel Number Game
 */
class PixelGameMultiplayerAdapter extends MultiplayerGameAdapter {
    constructor(gameInstance) {
        super(gameInstance, 'pixel-game');

        // Store original methods to restore later
        this.originalStartGame = null;
        this.originalEndGame = null;

        // Track multiplayer-specific state
        this.multiplayerState = {
            isMultiplayerMode: false,
            role: null, // 'host' or 'player'
            gameDataReceived: false
        };
    }

    /**
     * Initialize adapter as HOST
     * @param {string} roomId - Room ID from sessionStorage
     */
    async initAsHost(roomId) {
        console.log('[PixelGameAdapter] Initializing as HOST for room:', roomId);

        this.multiplayerState.isMultiplayerMode = true;
        this.multiplayerState.role = 'host';

        // Initialize core without container (we're in game page)
        await this.init(null, roomId);

        // Intercept game start to publish game data
        this.interceptHostGameStart();

        // Setup multiplayer hooks
        this.setupScoreSync();
        this.setupGameEndDetection();

        // Show notification that this is multiplayer mode
        this.showMultiplayerBadge('HOST');

        console.log('[PixelGameAdapter] Host initialization complete');
    }

    /**
     * Initialize adapter as PLAYER
     * @param {string} roomId - Room ID from sessionStorage
     */
    async initAsPlayer(roomId) {
        console.log('[PixelGameAdapter] Initializing as PLAYER for room:', roomId);

        this.multiplayerState.isMultiplayerMode = true;
        this.multiplayerState.role = 'player';

        // Initialize core without container
        await this.init(null, roomId);

        // Setup multiplayer hooks
        this.setupScoreSync();
        this.setupGameEndDetection();

        // Wait for game data from host
        await this.waitForGameDataAndStart();

        // Show notification that this is multiplayer mode
        this.showMultiplayerBadge('PLAYER');

        console.log('[PixelGameAdapter] Player initialization complete');
    }

    /**
     * Intercept host's game start to publish game data to Firebase
     */
    interceptHostGameStart() {
        // Save original startGame method
        this.originalStartGame = this.game.startGame.bind(this.game);

        // Override with multiplayer version
        this.game.startGame = async () => {
            console.log('[PixelGameAdapter] Host starting game - intercepted');

            // Validate config first
            if (!this.game.validateConfig()) {
                return;
            }

            try {
                // Generate game data using game's logic
                const gameData = await this.prepareMultiplayerGame();

                // Publish to Firebase
                console.log('[PixelGameAdapter] Publishing game data to Firebase...');
                await this.core.publishGameData(gameData);

                // Update room status to 'playing'
                await this.core.setRoomStatus(MP_CONSTANTS.ROOM_STATUS.PLAYING);

                console.log('[PixelGameAdapter] Game data published, starting host game');

                // Start multiplayer game with the SAME data
                this.startMultiplayerGame(gameData);

                // Sync initial score
                this.syncScore(0);

            } catch (error) {
                console.error('[PixelGameAdapter] Failed to start multiplayer game:', error);
                alert('Failed to start multiplayer game: ' + error.message);
            }
        };
    }

    /**
     * Wait for game data from host and auto-start game
     */
    async waitForGameDataAndStart() {
        console.log('[PixelGameAdapter] Waiting for game data from host...');

        // Show loading overlay
        this.showLoadingOverlay('Waiting for host to start game...');

        return new Promise((resolve) => {
            // Listen for game data
            const unsubscribe = this.core.onGameDataUpdate((gameData) => {
                if (gameData && gameData.round) {
                    console.log('[PixelGameAdapter] Received game data from host');

                    this.multiplayerState.gameDataReceived = true;

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
     * Show multiplayer badge indicator
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
            gameMode: this.game.config.gameMode,
            cardCount: this.game.config.cardCount,
            targetCount: this.game.config.targetCount,
            roundTimeLimit: this.game.config.roundTimeLimit,
            answerTimeLimit: this.game.config.answerTimeLimit,
            penaltyMode: this.game.config.penaltyMode
        };
    }

    /**
     * Prepare multiplayer game data (HOST ONLY)
     */
    async prepareMultiplayerGame() {
        console.log('[PixelGameAdapter] Preparing multiplayer game');

        // Read configuration from UI
        const config = {
            gameMode: document.getElementById('gameMode').value,
            cardCount: parseInt(document.getElementById('cardCount').value),
            targetCount: parseInt(document.getElementById('targetCount').value),
            roundTimeLimit: parseInt(document.getElementById('roundTimeLimit').value),
            answerTimeLimit: parseInt(document.getElementById('answerTimeLimit').value),
            penaltyMode: document.getElementById('penaltyMode').value
        };

        this.game.config = config;

        // Generate round using game's logic
        const round = this.game.generateRound(config);

        // Serialize round data
        const serializedRound = {
            cards: round.cards.map(card => ({
                id: card.id,
                mask: card.mask
            })),
            targets: round.targets,
            solutions: round.solutions
        };

        const gameData = {
            config: config,
            round: serializedRound,
            generatedAt: Date.now()
        };

        console.log('[PixelGameAdapter] Game data prepared:', {
            cardCount: gameData.round.cards.length,
            targetCount: gameData.round.targets.length
        });

        return gameData;
    }

    /**
     * Start multiplayer game with shared data (ALL PLAYERS)
     */
    startMultiplayerGame(gameData) {
        console.log('[PixelGameAdapter] Starting multiplayer game with shared data');

        // Set config from shared data
        this.game.config = gameData.config;

        // Reconstruct round data
        this.game.gameState = {
            round: {
                cards: gameData.round.cards.map(card => ({
                    id: card.id,
                    mask: card.mask
                })),
                targets: gameData.round.targets,
                solutions: gameData.round.solutions
            },
            selectedCardIds: new Set(),
            completedTargets: new Set(),
            score: 0,
            correctSubmissions: 0,
            wrongSubmissions: 0,
            timer: null,
            timeRemaining: this.game.config.roundTimeLimit,
            startTime: Date.now()
        };

        // Show game screen
        this.game.showScreen('game');
        this.game.renderGame();
        this.game.startTimer();

        console.log('[PixelGameAdapter] Game started with', gameData.round.cards.length, 'cards');
    }

    /**
     * Get current player score
     */
    getCurrentScore() {
        return {
            score: this.game.gameState.score,
            correct: this.game.gameState.correctSubmissions,
            wrong: this.game.gameState.wrongSubmissions,
            completedTargets: this.game.gameState.completedTargets.size,
            totalTargets: this.game.gameState.round.targets.length
        };
    }

    /**
     * Setup score syncing
     */
    setupScoreSync() {
        // Save original submitAnswer method
        const originalSubmitAnswer = this.game.submitAnswer.bind(this.game);

        // Override to sync scores
        this.game.submitAnswer = async () => {
            // Call original method
            originalSubmitAnswer();

            // Sync score after answer is processed
            const score = this.getCurrentScore();
            await this.syncScore(score.score);

            console.log('[PixelGameAdapter] Score synced:', score);
        };
    }

    /**
     * Setup game end detection
     */
    setupGameEndDetection() {
        // Save original endGame method
        this.originalEndGame = this.game.endGame.bind(this.game);

        // Override to detect game end
        this.game.endGame = async () => {
            console.log('[PixelGameAdapter] Game ending, syncing final scores...');

            // Sync final scores
            await this.onMultiplayerGameEnd();

            // Show results
            this.originalEndGame();
        };
    }

    /**
     * Handle game end in multiplayer mode
     */
    async onMultiplayerGameEnd() {
        console.log('[PixelGameAdapter] Multiplayer game ended');

        // Sync final score
        const finalScore = this.getCurrentScore();
        await this.syncScore(finalScore.score);

        // End multiplayer game
        await this.endMultiplayerGame({
            score: finalScore.score,
            correct: finalScore.correct,
            wrong: finalScore.wrong,
            completedTargets: finalScore.completedTargets,
            totalTargets: finalScore.totalTargets
        });

        console.log('[PixelGameAdapter] Final scores synced');
    }

    /**
     * Handle room left/closed
     */
    onRoomLeft() {
        console.log('[PixelGameAdapter] Room left or closed');

        // Stop game timer
        if (this.game.gameState.timer) {
            clearInterval(this.game.gameState.timer);
        }

        // Clear sessionStorage
        sessionStorage.removeItem('multiplayerRoomId');
        sessionStorage.removeItem('multiplayerRole');

        // Show message and redirect
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

console.log('[PixelGameAdapter] Adapter class loaded');
