/**
 * Brain Training Games
 * Author: Cao Viet Hoang
 * Created: 2025
 */

/**
 * Math Game Multiplayer Adapter
 * Extends MultiplayerGameAdapter to integrate multiplayer functionality into Math Game
 */
class MathGameMultiplayerAdapter extends MultiplayerGameAdapter {
    constructor(gameInstance) {
        super(gameInstance, 'math-game');
        
        // Store original methods to restore later
        this.originalStartGame = null;
        this.originalShowResults = null;
        
        // Track multiplayer-specific state
        this.multiplayerState = {
            isMultiplayerMode: false,
            role: null, // 'host' or 'player'
            questionsReceived: false
        };
    }

    /**
     * Initialize adapter as HOST
     * Called when host navigates to game from lobby
     * @param {string} roomId - Room ID from sessionStorage
     */
    async initAsHost(roomId) {
        console.log('[MathGameAdapter] Initializing as HOST for room:', roomId);

        this.multiplayerState.isMultiplayerMode = true;
        this.multiplayerState.role = 'host';
        this.isMultiplayerMode = true; // Set base class flag

        // Initialize core and UI without container (we're in game page)
        await this.init(null, roomId);
        
        // Intercept game start to publish questions
        this.interceptHostGameStart();
        
        // Setup multiplayer hooks
        this.setupScoreSync();
        this.setupGameEndDetection();
        
        // Show notification that this is multiplayer mode
        this.showMultiplayerBadge('HOST');
        
        console.log('[MathGameAdapter] Host initialization complete');
    }

    /**
     * Initialize adapter as PLAYER
     * Called when player navigates to game automatically
     * @param {string} roomId - Room ID from sessionStorage
     */
    async initAsPlayer(roomId) {
        console.log('[MathGameAdapter] Initializing as PLAYER for room:', roomId);

        this.multiplayerState.isMultiplayerMode = true;
        this.multiplayerState.role = 'player';
        this.isMultiplayerMode = true; // Set base class flag

        // Initialize core and UI without container
        await this.init(null, roomId);
        
        // Setup multiplayer hooks
        this.setupScoreSync();
        this.setupGameEndDetection();
        
        // Wait for questions from host
        await this.waitForQuestionsAndStart();
        
        // Show notification that this is multiplayer mode
        this.showMultiplayerBadge('PLAYER');
        
        console.log('[MathGameAdapter] Player initialization complete');
    }

    /**
     * Intercept host's game start to publish questions to Firebase
     */
    interceptHostGameStart() {
        // Save original startGame method
        this.originalStartGame = this.game.startGame.bind(this.game);
        
        // Override with multiplayer version
        this.game.startGame = async () => {
            console.log('[MathGameAdapter] Host starting game - intercepted');
            
            // Validate config first (use original validation)
            if (!this.game.validateConfig()) {
                return;
            }
            
            try {
                // Generate questions using game's logic
                const gameData = await this.prepareMultiplayerGame();
                
                // Publish to Firebase
                console.log('[MathGameAdapter] Publishing game data to Firebase...');
                await this.core.publishGameData(gameData);
                
                // Update room status to 'playing'
                await this.core.setRoomStatus(MP_CONSTANTS.ROOM_STATUS.PLAYING);
                
                console.log('[MathGameAdapter] Game data published, starting host game');
                
                // Start multiplayer game with the SAME questions that were published
                // Don't call originalStartGame() as it would generate new questions
                this.startMultiplayerGame(gameData);
                
                // Sync initial score
                this.syncScore(0);
                
            } catch (error) {
                console.error('[MathGameAdapter] Failed to start multiplayer game:', error);
                alert('Failed to start multiplayer game: ' + error.message);
            }
        };
    }

    /**
     * Wait for questions from host and auto-start game
     */
    async waitForQuestionsAndStart() {
        console.log('[MathGameAdapter] Waiting for questions from host...');
        
        // Show loading overlay
        this.showLoadingOverlay('Waiting for host to start game...');
        
        return new Promise((resolve) => {
            // Listen for game data
            const unsubscribe = this.core.onGameDataUpdate((gameData) => {
                if (gameData && gameData.questions) {
                    console.log('[MathGameAdapter] Received questions from host:', gameData.questions.length);
                    
                    this.multiplayerState.questionsReceived = true;
                    
                    // Hide loading overlay
                    this.hideLoadingOverlay();
                    
                    // Start game with received questions
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
            minNumber: this.game.config.minNumber,
            maxNumber: this.game.config.maxNumber,
            operations: this.game.config.operations,
            operandCount: this.game.config.operandCount,
            questionCount: this.game.config.questionCount,
            timePerQuestion: this.game.config.timePerQuestion
        };
    }

    /**
     * Generate questions for multiplayer game (HOST ONLY)
     * Required by MultiplayerGameAdapter
     */
    async prepareMultiplayerGame() {
        console.log('[MathGameAdapter] Preparing multiplayer game (generating questions)');
        console.log('[MathGameAdapter] Current game config:', this.game.config);
        
        // Reset game state first
        this.game.gameState = {
            currentQuestionIndex: 0,
            correctCount: 0,
            wrongCount: 0,
            questions: [],
            answers: [],
            timer: null,
            timeRemaining: this.game.config.timePerQuestion,
            streak: 0,
            maxStreak: 0,
            recentAnswers: [],
            achievements: {
                fast: 0,
                perfect: 0,
                master: 0,
                comeback: 0
            },
            wrongStreak: 0
        };
        
        // Generate questions using game's logic
        console.log('[MathGameAdapter] Calling game.generateQuestions()...');
        this.game.generateQuestions();
        
        console.log('[MathGameAdapter] Questions generated:', this.game.gameState.questions.length);
        
        // Extract and serialize questions
        const questions = this.game.gameState.questions.map(q => ({
            numbers: q.numbers,
            operations: q.operations,
            correctAnswer: q.correctAnswer
        }));
        
        console.log('[MathGameAdapter] Serialized questions:', questions.length);
        console.log('[MathGameAdapter] Sample question:', questions[0]);
        
        const gameData = {
            questions: questions,
            config: this.getGameConfig(),
            totalQuestions: questions.length,
            generatedAt: Date.now()
        };
        
        console.log('[MathGameAdapter] Final game data ready:', {
            questionCount: gameData.questions.length,
            totalQuestions: gameData.totalQuestions,
            config: gameData.config
        });
        
        return gameData;
    }

    /**
     * Start game with shared questions (ALL PLAYERS)
     * Required by MultiplayerGameAdapter
     */
    startMultiplayerGame(gameData) {
        console.log('[MathGameAdapter] Starting multiplayer game with shared questions');

        // Set game start time for tracking
        this.setGameStartTime();

        // Load questions into game
        this.game.gameState.questions = gameData.questions.map(q => ({
            numbers: q.numbers,
            operations: q.operations,
            correctAnswer: q.correctAnswer,
            userAnswer: null,
            isCorrect: null,
            timeSpent: 0
        }));

        // Set config from shared data
        this.game.config = gameData.config;

        // Reset other game state
        this.game.gameState.currentQuestionIndex = 0;
        this.game.gameState.correctCount = 0;
        this.game.gameState.wrongCount = 0;
        this.game.gameState.answers = [];
        this.game.gameState.timeRemaining = this.game.config.timePerQuestion;
        this.game.gameState.streak = 0;
        this.game.gameState.maxStreak = 0;
        this.game.gameState.recentAnswers = [];
        this.game.gameState.wrongStreak = 0;

        // Show game screen
        this.game.showScreen('game');

        // Display first question
        this.game.displayQuestion();

        // Start timer
        this.game.startTimer();

        // Update progress
        this.game.updateProgress();

        // Show initial tip
        this.game.updateTip();

        console.log('[MathGameAdapter] Game started with', gameData.questions.length, 'questions');
    }

    /**
     * Get current player score
     * Required by MultiplayerGameAdapter
     */
    getCurrentScore() {
        return {
            correct: this.game.gameState.correctCount,
            wrong: this.game.gameState.wrongCount,
            streak: this.game.gameState.streak,
            currentQuestion: this.game.gameState.currentQuestionIndex
        };
    }

    /**
     * Handle players list update
     * Optional callback
     */
    onPlayersUpdate(players) {
        console.log('[MathGameAdapter] Players updated:', Object.keys(players).length, 'players');
        
        // Update any multiplayer UI elements (if needed)
        // For now, just log
    }

    /**
     * Handle room left/closed
     * Optional callback
     */
    onRoomLeft() {
        console.log('[MathGameAdapter] Room left or closed');
        
        // Stop game timer
        if (this.game.gameState.timer) {
            this.game.stopTimer();
        }
        
        // Clear sessionStorage
        sessionStorage.removeItem('multiplayerRoomId');
        sessionStorage.removeItem('multiplayerRole');
        
        // Show message and redirect
        alert('The room has been closed. You will be redirected to the home page.');
        window.location.href = '../index.html';
    }

    /**
     * Handle game end in multiplayer mode
     */
    async onMultiplayerGameEnd() {
        console.log('[MathGameAdapter] Multiplayer game ended');

        // Sync final score
        const finalScore = this.getCurrentScore();
        await this.syncScore(finalScore.correct);

        // Calculate accuracy
        const totalQuestions = finalScore.correct + finalScore.wrong;
        const accuracy = totalQuestions > 0
            ? Math.round((finalScore.correct / totalQuestions) * 100)
            : 0;

        // End multiplayer game with detailed results
        await this.endMultiplayerGame({
            score: finalScore.correct,
            correct: finalScore.correct,
            wrong: finalScore.wrong,
            streak: this.game.gameState.maxStreak || finalScore.streak,
            accuracy: accuracy,
            details: {
                correct: finalScore.correct,
                wrong: finalScore.wrong,
                streak: this.game.gameState.maxStreak || finalScore.streak,
                accuracy: accuracy
            }
        });

        console.log('[MathGameAdapter] Final scores synced');
    }

    /**
     * Setup score syncing
     */
    setupScoreSync() {
        // Save original submitAnswer method
        const originalSubmitAnswer = this.game.submitAnswer.bind(this.game);
        
        // Override to sync scores
        this.game.submitAnswer = async (timeout = false) => {
            // Call original method
            originalSubmitAnswer(timeout);
            
            // Sync score after answer is processed
            const score = this.getCurrentScore();
            await this.syncScore(score.correct);
            
            console.log('[MathGameAdapter] Score synced:', score);
        };
    }

    /**
     * Setup game end detection
     */
    setupGameEndDetection() {
        // Save original showResults method
        this.originalShowResults = this.game.showResults.bind(this.game);
        
        // Override to detect game end
        this.game.showResults = async () => {
            console.log('[MathGameAdapter] Game ending, syncing final scores...');
            
            // Sync final scores before showing results
            await this.onMultiplayerGameEnd();
            
            // Show results
            this.originalShowResults();
        };
    }

    /**
     * Override init to set up multiplayer hooks
     */
    async init(containerId = null, roomId = null) {
        // Call parent init
        await super.init(containerId, roomId);
        
        // Note: Hooks are now setup in initAsHost/initAsPlayer
        // to ensure proper order of initialization
        
        console.log('[MathGameAdapter] Base initialization complete');
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

console.log('[MathGameAdapter] Adapter class loaded');
