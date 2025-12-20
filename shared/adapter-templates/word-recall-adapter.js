// ============================================================================
// WORD RECALL MULTIPLAYER ADAPTER - IMPLEMENTATION TEMPLATE
// Add this code to the end of games/word-recall.js
// ============================================================================

const wordRecallGameAdapter = {
    /**
     * Get game metadata
     */
    getGameMeta() {
        return {
            gameId: 'word-recall',
            version: '1.0.0',
            title: 'Word Recall'
        };
    },

    /**
     * Build question set from configuration
     * For Word Recall, generate word lists for all rounds
     */
    buildQuestionSet(config) {
        if (!window.gameInstance) {
            console.error('Word Recall game not initialized');
            return null;
        }

        // Wait for word bank to be loaded
        if (!window.wordBankService?.loaded) {
            throw new Error('Word bank not loaded yet. Please wait.');
        }

        // Get current config or use default
        const gameConfig = config && Object.keys(config).length > 0 
            ? config 
            : window.gameInstance.config;

        // Generate word lists for all rounds
        const rounds = [];
        const wordSelector = new WordSelector(window.wordBankService, gameConfig);

        for (let roundIndex = 0; roundIndex < gameConfig.rounds; roundIndex++) {
            const K = gameConfig.wordsPerRoundStart + 
                      Math.floor(roundIndex / gameConfig.roundsToIncrement);
            
            const words = wordSelector.selectWords(K, roundIndex);
            
            rounds.push({
                roundNumber: roundIndex + 1,
                words: words,
                K: K
            });
        }

        return {
            config: gameConfig,
            rounds: rounds
        };
    },

    /**
     * Start game from question set
     */
    startGameFromQuestionSet(questionSet, roomContext) {
        if (!window.gameInstance) {
            console.error('Word Recall game not initialized');
            return;
        }

        const game = window.gameInstance;
        
        // Update config
        game.config = questionSet.config;
        
        // Store pre-generated rounds
        game.multiplayerRounds = questionSet.rounds;
        game.currentRoundIndex = 0;
        game.roomContext = roomContext;
        
        // Reset game state
        game.state = 'RUNNING';
        game.currentRound = 1;
        game.score = 0;
        game.totalCorrectRecalls = 0;
        game.totalMissedWords = 0;
        game.totalFalseAlarms = 0;
        
        // Update UI and start first round
        if (window.uiController) {
            window.uiController.showScreen('game');
            game.startRoundWithWords(questionSet.rounds[0]);
        }
    },

    /**
     * Register callback for game end
     */
    onGameEnd(callback) {
        if (window.gameInstance) {
            window.gameInstance.onGameEndCallback = callback;
        }
    },

    /**
     * Get current configuration (optional)
     */
    getConfig() {
        if (window.gameInstance?.config) {
            return window.gameInstance.config;
        }
        return null;
    }
};

// Make globally available
window.wordRecallGameAdapter = wordRecallGameAdapter;

// ============================================================================
// MODIFICATIONS NEEDED IN GAME CODE
// ============================================================================

/**
 * 1. Make game instance and services global in initialization:
 * 
 * document.addEventListener('DOMContentLoaded', async () => {
 *     const wordBankService = new WordBankService();
 *     await wordBankService.load();
 *     
 *     const config = new GameConfig();
 *     const wordSelector = new WordSelector(wordBankService, config);
 *     const gameEngine = new GameEngine(config, wordBankService, wordSelector);
 *     const uiController = new UIController(gameEngine);
 *     
 *     // Make globally available
 *     window.gameInstance = gameEngine;
 *     window.wordBankService = wordBankService;
 *     window.uiController = uiController;
 * });
 */

/**
 * 2. Add method to GameEngine class to start round with pre-selected words:
 * 
 * startRoundWithWords(roundData) {
 *     this.currentRound = roundData.roundNumber;
 *     this.currentWords = roundData.words;
 *     this.K = roundData.K;
 *     
 *     // Continue with normal round start (memorization phase)
 *     this.phase = 'MEMORIZE';
 *     this.currentWordIndex = 0;
 *     
 *     // Start showing words
 *     this.showNextWord();
 * }
 */

/**
 * 3. Modify WordSelector to support deterministic selection:
 * 
 * Instead of using Math.random(), use a seeded RNG:
 * 
 * selectWords(K, roundIndex) {
 *     // Use roundIndex as seed for reproducibility
 *     const rng = new SeededRandom(roundIndex);
 *     
 *     // Use rng.next() instead of Math.random() for shuffling
 * }
 * 
 * Add SeededRandom class:
 * 
 * class SeededRandom {
 *     constructor(seed) {
 *         this.seed = seed;
 *     }
 *     
 *     next() {
 *         this.seed = (this.seed * 9301 + 49297) % 233280;
 *         return this.seed / 233280;
 *     }
 * }
 */

/**
 * 4. Add callback invocation when game ends:
 * 
 * In the endGame() method, add:
 * 
 * if (this.onGameEndCallback) {
 *     const accuracy = (this.totalCorrectRecalls / 
 *                      (this.totalCorrectRecalls + this.totalMissedWords + this.totalFalseAlarms)) * 100;
 *     const extra = {
 *         roundsCompleted: this.currentRound,
 *         accuracy: accuracy,
 *         correctRecalls: this.totalCorrectRecalls,
 *         missedWords: this.totalMissedWords,
 *         falseAlarms: this.totalFalseAlarms
 *     };
 *     this.onGameEndCallback(this.score, extra);
 * }
 */

/**
 * 5. Handle word bank loading in multiplayer context:
 * 
 * Before building questionSet, ensure word bank is loaded:
 * 
 * if (!window.wordBankService.loaded) {
 *     alert('Word bank is still loading. Please wait a moment and try again.');
 *     return;
 * }
 */
