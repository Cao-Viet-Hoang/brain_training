/**
 * Maze Game Multiplayer Adapter
 * Extends MultiplayerGameAdapter to integrate multiplayer functionality into Maze Game
 */
class MazeGameMultiplayerAdapter extends MultiplayerGameAdapter {
    constructor(gameInstance) {
        super(gameInstance, 'maze-game');

        // Store original methods to restore later
        this.originalStartGame = null;
        this.originalShowResults = null;
        this.originalHandleMove = null;

        // Track multiplayer-specific state
        this.multiplayerState = {
            isMultiplayerMode: false,
            role: null, // 'host' or 'player'
            mazeDataReceived: false,
            allRoundsData: null, // Store all pre-generated mazes
            currentRoundIndex: 0, // Track current round (0-based)
            totalRounds: 1,
            accumulatedScore: 0, // Total score across all rounds
            accumulatedTime: 0, // Total time across all rounds
            accumulatedSteps: 0,
            accumulatedErrors: 0
        };
    }

    /**
     * Initialize adapter as HOST
     * Called when host navigates to game from lobby
     * @param {string} roomId - Room ID from sessionStorage
     */
    async initAsHost(roomId) {
        console.log('[MazeGameAdapter] Initializing as HOST for room:', roomId);

        this.multiplayerState.isMultiplayerMode = true;
        this.multiplayerState.role = 'host';
        this.isMultiplayerMode = true;

        // Initialize core and UI without container (we're in game page)
        await this.init(null, roomId);

        // Intercept game start to publish maze data
        this.interceptHostGameStart();

        // Setup multiplayer hooks
        this.setupScoreSync();
        this.setupGameEndDetection();

        // Show notification that this is multiplayer mode
        this.showMultiplayerBadge('HOST');

        console.log('[MazeGameAdapter] Host initialization complete');
    }

    /**
     * Initialize adapter as PLAYER
     * Called when player navigates to game automatically
     * @param {string} roomId - Room ID from sessionStorage
     */
    async initAsPlayer(roomId) {
        console.log('[MazeGameAdapter] Initializing as PLAYER for room:', roomId);

        this.multiplayerState.isMultiplayerMode = true;
        this.multiplayerState.role = 'player';
        this.isMultiplayerMode = true;

        // Initialize core and UI without container
        await this.init(null, roomId);

        // Setup multiplayer hooks
        this.setupScoreSync();
        this.setupGameEndDetection();

        // Wait for maze data from host
        await this.waitForMazeDataAndStart();

        // Show notification that this is multiplayer mode
        this.showMultiplayerBadge('PLAYER');

        console.log('[MazeGameAdapter] Player initialization complete');
    }

    /**
     * Intercept host's game start to publish maze data to Firebase
     */
    interceptHostGameStart() {
        // Save original startGame method
        this.originalStartGame = this.game.startGame.bind(this.game);

        // Override with multiplayer version
        this.game.startGame = async () => {
            console.log('[MazeGameAdapter] Host starting game - intercepted');

            try {
                // Generate maze data using game's logic
                const gameData = await this.prepareMultiplayerGame();

                // Publish to Firebase
                console.log('[MazeGameAdapter] Publishing game data to Firebase...');
                await this.core.publishGameData(gameData);

                // Update room status to 'playing'
                await this.core.setRoomStatus(MP_CONSTANTS.ROOM_STATUS.PLAYING);

                console.log('[MazeGameAdapter] Game data published, starting host game');

                // Start multiplayer game with the SAME maze that was published
                this.startMultiplayerGame(gameData);

                // Sync initial score
                this.syncScore(0);

            } catch (error) {
                console.error('[MazeGameAdapter] Failed to start multiplayer game:', error);
                alert('Failed to start multiplayer game: ' + error.message);
            }
        };
    }

    /**
     * Wait for maze data from host and auto-start game
     */
    async waitForMazeDataAndStart() {
        console.log('[MazeGameAdapter] Waiting for maze data from host...');

        // Show loading overlay
        this.showLoadingOverlay('Waiting for host to start game...');

        return new Promise((resolve) => {
            // Listen for game data
            const unsubscribe = this.core.onGameDataUpdate((gameData) => {
                // Check for new multi-round format (has rounds array)
                if (gameData && gameData.rounds && gameData.rounds.length > 0) {
                    console.log('[MazeGameAdapter] Received multi-round game data from host:', gameData.totalRounds, 'rounds');

                    this.multiplayerState.mazeDataReceived = true;

                    // Hide loading overlay
                    this.hideLoadingOverlay();

                    // Start game with received maze data
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
     * Required by MultiplayerGameAdapter
     */
    getGameConfig() {
        return {
            mode: this.game.config.mode,
            difficulty: this.game.config.difficulty,
            mazeSize: this.game.config.customMazeSize,
            totalRounds: this.game.config.totalRounds // Use actual config value
        };
    }

    /**
     * Generate maze data for ALL rounds of multiplayer game (HOST ONLY)
     * Required by MultiplayerGameAdapter
     */
    async prepareMultiplayerGame() {
        const totalRounds = this.game.config.totalRounds;
        console.log('[MazeGameAdapter] Preparing multiplayer game (generating', totalRounds, 'mazes)');

        // Reset game state
        this.game.state.reset();

        // Set fog mode for renderer
        this.game.renderer.setFogMode(this.game.config.mode);

        // Reset fog state
        this.game.renderer.resetFogState();

        // Generate mazes for ALL rounds
        const rounds = [];
        for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
            const mazeSize = this.game.config.getMazeSize(roundNum);
            const mazeOptions = this.game.config.getMazeOptions(roundNum);
            const mazeData = this.game.mazeGenerator.generate(mazeSize, mazeSize, mazeOptions);

            const timeLimit = this.game.config.getTimeLimit(roundNum);
            const optimalPathLength = mazeData.shortestPath
                ? mazeData.shortestPath.length + 3
                : 0;

            rounds.push({
                roundNumber: roundNum,
                mazeGrid: mazeData.grid,
                start: mazeData.start,
                width: mazeData.width,
                height: mazeData.height,
                shortestPath: mazeData.shortestPath,
                timeLimit: timeLimit,
                optimalPathLength: optimalPathLength
            });

            console.log('[MazeGameAdapter] Round', roundNum, 'maze generated:', {
                size: mazeSize,
                timeLimit,
                optimalPathLength
            });
        }

        // Prepare game data with all rounds
        const gameData = {
            config: this.getGameConfig(),
            totalRounds: totalRounds,
            rounds: rounds,
            generatedAt: Date.now()
        };

        console.log('[MazeGameAdapter] All', totalRounds, 'rounds ready for publishing');

        return gameData;
    }

    /**
     * Start game with shared maze data (ALL PLAYERS)
     * Required by MultiplayerGameAdapter
     */
    startMultiplayerGame(gameData) {
        console.log('[MazeGameAdapter] Starting multiplayer game with', gameData.totalRounds, 'rounds');

        // Store all rounds data
        this.multiplayerState.allRoundsData = gameData;
        this.multiplayerState.totalRounds = gameData.totalRounds;
        this.multiplayerState.currentRoundIndex = 0;
        this.multiplayerState.accumulatedScore = 0;
        this.multiplayerState.accumulatedTime = 0;
        this.multiplayerState.accumulatedSteps = 0;
        this.multiplayerState.accumulatedErrors = 0;

        // Set game start time for tracking
        this.setGameStartTime();

        // Set config from shared data
        this.game.config.mode = gameData.config.mode;
        this.game.config.difficulty = gameData.config.difficulty;
        this.game.config.customMazeSize = gameData.config.mazeSize;
        this.game.config.totalRounds = gameData.totalRounds;

        // Reset game state
        this.game.state.reset();

        // Set fog mode for renderer
        this.game.renderer.setFogMode(this.game.config.mode);
        this.game.renderer.resetFogState();

        // Start first round
        this.startRound(0);
    }

    /**
     * Start a specific round with pre-generated maze data
     * @param {number} roundIndex - 0-based round index
     */
    startRound(roundIndex) {
        const roundData = this.multiplayerState.allRoundsData.rounds[roundIndex];
        const roundNumber = roundIndex + 1;

        console.log('[MazeGameAdapter] Starting round', roundNumber, 'of', this.multiplayerState.totalRounds);

        // Reset fog state for new round
        this.game.renderer.resetFogState();

        // Reconstruct maze data object
        this.game.currentMaze = {
            grid: roundData.mazeGrid,
            start: roundData.start,
            width: roundData.width,
            height: roundData.height,
            shortestPath: roundData.shortestPath
        };

        // Initialize round state
        this.game.state.startRound(
            roundData.start,
            roundData.timeLimit,
            roundData.optimalPathLength
        );

        // Render maze
        this.game.renderer.render(this.game.currentMaze, this.game.state.playerPos);
        this.game.renderer.highlightClickableCells(this.game.state.playerPos, this.game.currentMaze.grid);

        // Update UI
        this.game.updateDisplay();

        // Enable input
        this.game.input.enable((direction) => this.game.handleMove(direction));

        // Start timer
        this.game.timer.start(
            roundData.timeLimit,
            (remaining, total) => this.game.updateTimer(remaining, total),
            () => this.game.handleTimeUp()
        );

        // Show game screen
        this.game.showScreen('game');

        console.log('[MazeGameAdapter] Round', roundNumber, 'started');
    }

    /**
     * Get current player score
     * Required by MultiplayerGameAdapter
     */
    getCurrentScore() {
        return {
            score: this.game.state.totalScore,
            steps: this.game.state.roundSteps,
            errors: this.game.state.roundErrors
        };
    }

    /**
     * Handle players list update
     * Optional callback
     */
    onPlayersUpdate(players) {
        console.log('[MazeGameAdapter] Players updated:', Object.keys(players).length, 'players');
    }

    /**
     * Handle room left/closed
     * Optional callback
     */
    onRoomLeft() {
        console.log('[MazeGameAdapter] Room left or closed');

        // Stop game timer
        if (this.game.timer) {
            this.game.timer.stop();
        }

        // Disable input
        this.game.input.disable();

        // Clear sessionStorage
        sessionStorage.removeItem('multiplayerRoomId');
        sessionStorage.removeItem('multiplayerRole');

        // Show message and redirect
        alert('The room has been closed. You will be redirected to the home page.');
        window.location.href = '../index.html';
    }

    /**
     * Handle round end - accumulate scores and check if game is complete
     */
    async onRoundEnd(success, scoreDetails) {
        const currentRound = this.multiplayerState.currentRoundIndex + 1;
        const totalRounds = this.multiplayerState.totalRounds;
        const isLastRound = currentRound >= totalRounds;

        console.log('[MazeGameAdapter] Round', currentRound, 'ended, success:', success, 'isLastRound:', isLastRound);

        // Calculate time spent for this round
        const timeLimit = scoreDetails ? scoreDetails.totalTime : 0;
        const timeRemaining = scoreDetails ? scoreDetails.timeRemaining : 0;
        const roundTime = (timeLimit - timeRemaining) * 1000; // Convert to milliseconds

        // Get round score details
        const roundScore = scoreDetails ? scoreDetails.roundScore : 0;
        const steps = scoreDetails ? scoreDetails.actualSteps : this.game.state.roundSteps;
        const errors = scoreDetails ? scoreDetails.errorCount : this.game.state.roundErrors;

        // Accumulate scores
        this.multiplayerState.accumulatedScore += roundScore;
        this.multiplayerState.accumulatedTime += roundTime;
        this.multiplayerState.accumulatedSteps += steps;
        this.multiplayerState.accumulatedErrors += errors;

        console.log('[MazeGameAdapter] Accumulated - Score:', this.multiplayerState.accumulatedScore,
            'Time:', this.multiplayerState.accumulatedTime, 'Steps:', this.multiplayerState.accumulatedSteps);

        // Sync current accumulated score
        await this.syncScore(this.multiplayerState.accumulatedScore);

        if (isLastRound) {
            // All rounds complete - end multiplayer game
            console.log('[MazeGameAdapter] All rounds complete, ending multiplayer game');
            await this.endMultiplayerGame({
                score: this.multiplayerState.accumulatedScore,
                time: this.multiplayerState.accumulatedTime,
                details: {
                    steps: this.multiplayerState.accumulatedSteps,
                    errors: this.multiplayerState.accumulatedErrors,
                    roundsCompleted: totalRounds,
                    totalRounds: totalRounds,
                    completed: true
                }
            });
        }

        return isLastRound;
    }

    /**
     * Setup score syncing after each move
     */
    setupScoreSync() {
        // Save original handleMove method
        this.originalHandleMove = this.game.handleMove.bind(this.game);

        // Override to sync scores after each valid move
        this.game.handleMove = (direction) => {
            // Call original method
            this.originalHandleMove(direction);

            // Sync score after move is processed (throttled by base class)
            const score = this.getCurrentScore();
            this.syncScore(score.score);
        };
    }

    /**
     * Setup game end detection
     */
    setupGameEndDetection() {
        // Store reference to adapter for use in callbacks
        const adapter = this;

        // Override completeRound to handle multiplayer scoring and round transitions
        this.game.completeRound = async (success) => {
            const currentRound = adapter.multiplayerState.currentRoundIndex + 1;

            console.log('[MazeGameAdapter] Round', currentRound, 'completing, success:', success);

            // Stop game first
            this.game.state.isPlaying = false;
            this.game.input.disable();
            this.game.timer.stop();

            // Reveal all cells if in fog mode
            if (this.game.config.mode !== 'classic') {
                this.game.renderer.revealAllCells();
            }

            // Update time remaining in state
            this.game.state.timeRemaining = this.game.timer.getTimeRemaining();

            // Calculate score BEFORE syncing
            let scoreDetails = null;
            if (success && this.game.currentMaze.shortestPath) {
                const optimalPathLength = this.game.currentMaze.shortestPath.length + 3;
                const totalTime = this.game.timer.totalTime;
                scoreDetails = this.game.state.calculateRoundScore(this.game.config, optimalPathLength, totalTime);
            } else {
                // Time up - calculate with base score only
                scoreDetails = this.game.state.calculateRoundScore(this.game.config, null, null);
            }

            console.log('[MazeGameAdapter] Score calculated:', scoreDetails);

            // Handle round end and check if game is complete
            const isLastRound = await adapter.onRoundEnd(success, scoreDetails);

            // Show overlay with appropriate button text
            if (success && this.game.currentMaze.shortestPath) {
                this.game.showOptimalPathOverlay(scoreDetails, () => {
                    this.game.hideOptimalPathOverlay();
                    this.game.renderer.clearOptimalPath();

                    if (!isLastRound) {
                        // Move to next round
                        adapter.multiplayerState.currentRoundIndex++;
                        this.game.state.nextRound();
                        adapter.startRound(adapter.multiplayerState.currentRoundIndex);
                    }
                    // If last round, result modal is already shown by endMultiplayerGame
                });
                this.game.renderer.showOptimalPath(this.game.currentMaze.shortestPath, 50);
            } else {
                // Time's up - show time up overlay
                this.game.showTimeUpOverlay(scoreDetails, () => {
                    this.game.hideTimeUpOverlay();

                    if (!isLastRound) {
                        // Move to next round
                        adapter.multiplayerState.currentRoundIndex++;
                        this.game.state.nextRound();
                        adapter.startRound(adapter.multiplayerState.currentRoundIndex);
                    }
                    // If last round, result modal is already shown by endMultiplayerGame
                });
            }
        };

        // Override proceedToNextRoundOrResults - no longer needed as we handle it above
        this.game.proceedToNextRoundOrResults = () => {
            console.log('[MazeGameAdapter] proceedToNextRoundOrResults called - handled by multiplayer adapter');
        };
    }

    /**
     * Override init to set up multiplayer hooks
     */
    async init(containerId = null, roomId = null) {
        // Call parent init
        await super.init(containerId, roomId);

        console.log('[MazeGameAdapter] Base initialization complete');
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

console.log('[MazeGameAdapter] Adapter class loaded');
