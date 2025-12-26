/**
 * Brain Training Games
 * Author: Cao Viet Hoang
 * Created: 2025
 */

/**
 * Expression Puzzle Game Multiplayer Adapter
 * Extends MultiplayerGameAdapter to integrate multiplayer functionality into Expression Puzzle Game
 */
class ExpressionPuzzleMultiplayerAdapter extends MultiplayerGameAdapter {
    constructor(gameInstance) {
        super(gameInstance, 'expression-puzzle');

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
        console.log('[ExpressionPuzzleAdapter] Initializing as HOST for room:', roomId);

        this.multiplayerState.isMultiplayerMode = true;
        this.multiplayerState.role = 'host';
        this.isMultiplayerMode = true; // Set base class flag

        await this.init(null, roomId);

        this.interceptHostGameStart();
        this.setupScoreSync();
        this.setupGameEndDetection();

        this.showMultiplayerBadge('HOST');

        console.log('[ExpressionPuzzleAdapter] Host initialization complete');
    }

    /**
     * Initialize adapter as PLAYER
     * @param {string} roomId - Room ID from sessionStorage
     */
    async initAsPlayer(roomId) {
        console.log('[ExpressionPuzzleAdapter] Initializing as PLAYER for room:', roomId);

        this.multiplayerState.isMultiplayerMode = true;
        this.multiplayerState.role = 'player';
        this.isMultiplayerMode = true; // Set base class flag

        await this.init(null, roomId);

        this.setupScoreSync();
        this.setupGameEndDetection();

        await this.waitForGameDataAndStart();

        this.showMultiplayerBadge('PLAYER');

        console.log('[ExpressionPuzzleAdapter] Player initialization complete');
    }

    /**
     * Intercept host's game start
     */
    interceptHostGameStart() {
        this.originalStartGame = this.game.startGame.bind(this.game);

        this.game.startGame = async () => {
            console.log('[ExpressionPuzzleAdapter] Host starting game - intercepted');

            try {
                const gameData = await this.prepareMultiplayerGame();

                console.log('[ExpressionPuzzleAdapter] Publishing game data to Firebase...');
                await this.core.publishGameData(gameData);

                await this.core.setRoomStatus(MP_CONSTANTS.ROOM_STATUS.PLAYING);

                console.log('[ExpressionPuzzleAdapter] Game data published, starting host game');

                this.startMultiplayerGame(gameData);
                this.syncScore(0);

            } catch (error) {
                console.error('[ExpressionPuzzleAdapter] Failed to start multiplayer game:', error);
                alert('Failed to start multiplayer game: ' + error.message);
            }
        };
    }

    /**
     * Wait for game data from host
     */
    async waitForGameDataAndStart() {
        console.log('[ExpressionPuzzleAdapter] Waiting for game data from host...');

        this.showLoadingOverlay('Waiting for host to start game...');

        return new Promise((resolve) => {
            const unsubscribe = this.core.onGameDataUpdate((gameData) => {
                if (gameData && gameData.puzzles) {
                    console.log('[ExpressionPuzzleAdapter] Received game data from host');

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
        const difficulty = document.querySelector('.difficulty-btn.active')?.dataset.difficulty || 'medium';
        return this.game.getConfigForDifficulty(difficulty);
    }

    /**
     * Prepare multiplayer game data (HOST ONLY)
     */
    async prepareMultiplayerGame() {
        console.log('[ExpressionPuzzleAdapter] Preparing multiplayer game');

        // Get configuration
        const difficulty = document.querySelector('.difficulty-btn.active')?.dataset.difficulty || 'medium';
        const puzzleCount = parseInt(document.getElementById('puzzleCount').value) || 10;
        const requireUnique = document.getElementById('requireUnique').checked;
        const minTarget = parseInt(document.getElementById('minTarget').value) || 1;
        const maxTarget = parseInt(document.getElementById('maxTarget').value) || 100;
        const timePerPuzzle = parseInt(document.getElementById('timePerPuzzle').value) || 60;

        const config = this.game.getConfigForDifficulty(difficulty);
        config.requireUniqueSolution = requireUnique;
        config.targetRange = [minTarget, maxTarget];

        // Generate puzzles
        const generator = new PuzzleGenerator(config);
        const puzzles = [];
        for (let i = 0; i < puzzleCount; i++) {
            const puzzle = generator.generatePuzzle();
            puzzles.push({
                expressionTemplate: puzzle.expressionTemplate,
                target: puzzle.target,
                solutionNumbers: puzzle.solutionNumbers,
                numSlots: puzzle.numSlots
            });
        }

        const gameData = {
            puzzles: puzzles,
            config: {
                difficulty: difficulty,
                puzzleCount: puzzleCount,
                timePerPuzzle: timePerPuzzle,
                minTarget: minTarget,
                maxTarget: maxTarget,
                maxTrivialNumbers: config.maxTrivialNumbers
            },
            generatedAt: Date.now()
        };

        console.log('[ExpressionPuzzleAdapter] Game data prepared:', {
            puzzleCount: gameData.puzzles.length
        });

        return gameData;
    }

    /**
     * Start multiplayer game with shared data (ALL PLAYERS)
     */
    startMultiplayerGame(gameData) {
        console.log('[ExpressionPuzzleAdapter] Starting multiplayer game with shared data');

        // Set game start time for tracking
        this.setGameStartTime();

        // Set game state from shared data
        this.game.puzzleCount = gameData.config.puzzleCount;
        this.game.timePerPuzzle = gameData.config.timePerPuzzle;
        this.game.currentConfig = {
            maxTrivialNumbers: gameData.config.maxTrivialNumbers
        };

        // Load puzzles
        this.game.puzzles = gameData.puzzles.map(p => new Puzzle(
            p.expressionTemplate,
            p.target,
            p.solutionNumbers,
            { difficulty: gameData.config.difficulty }
        ));

        // Reset game state
        this.game.currentPuzzleIndex = 0;
        this.game.score = 0;
        this.game.userAnswers = [];
        this.game.startTime = Date.now();

        // Set current puzzle and display
        this.game.currentPuzzle = this.game.puzzles[0];
        this.game.showScreen('game');
        this.game.displayPuzzle();

        console.log('[ExpressionPuzzleAdapter] Game started with', gameData.puzzles.length, 'puzzles');
    }

    /**
     * Get current player score
     */
    getCurrentScore() {
        return {
            score: this.game.score,
            currentPuzzle: this.game.currentPuzzleIndex,
            totalPuzzles: this.game.puzzleCount
        };
    }

    /**
     * Setup score syncing
     */
    setupScoreSync() {
        const originalCheckAnswer = this.game.checkAnswer.bind(this.game);

        this.game.checkAnswer = async () => {
            originalCheckAnswer();

            // Sync score after checking answer
            const score = this.getCurrentScore();
            await this.syncScore(score.score);

            console.log('[ExpressionPuzzleAdapter] Score synced:', score);
        };
    }

    /**
     * Setup game end detection
     */
    setupGameEndDetection() {
        this.originalShowResults = this.game.showResults.bind(this.game);

        this.game.showResults = async () => {
            console.log('[ExpressionPuzzleAdapter] Game ending, syncing final scores...');

            await this.onMultiplayerGameEnd();
            this.originalShowResults();
        };
    }

    /**
     * Handle game end in multiplayer mode
     */
    async onMultiplayerGameEnd() {
        console.log('[ExpressionPuzzleAdapter] Multiplayer game ended');

        const finalScore = this.getCurrentScore();
        await this.syncScore(finalScore.score);

        const accuracy = finalScore.totalPuzzles > 0
            ? Math.round((finalScore.score / finalScore.totalPuzzles) * 100)
            : 0;

        // Calculate total time spent
        const totalTime = this.game.startTime ? Date.now() - this.game.startTime : null;

        await this.endMultiplayerGame({
            score: finalScore.score,
            time: totalTime,
            accuracy: accuracy,
            details: {
                correct: finalScore.score,
                accuracy: accuracy,
                totalPuzzles: finalScore.totalPuzzles
            }
        });

        console.log('[ExpressionPuzzleAdapter] Final scores synced');
    }

    /**
     * Handle room left/closed
     */
    onRoomLeft() {
        console.log('[ExpressionPuzzleAdapter] Room left or closed');

        if (this.game.puzzleTimer) {
            clearInterval(this.game.puzzleTimer);
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

console.log('[ExpressionPuzzleAdapter] Adapter class loaded');
