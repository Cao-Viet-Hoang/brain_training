// ============================================================================
// MEMORY MATRIX MULTIPLAYER ADAPTER - IMPLEMENTATION TEMPLATE
// Add this code to the end of games/memory-matrix.js
// ============================================================================

const memoryMatrixGameAdapter = {
    /**
     * Get game metadata
     */
    getGameMeta() {
        return {
            gameId: 'memory-matrix',
            version: '1.0.0',
            title: 'Memory Matrix'
        };
    },

    /**
     * Build question set from configuration
     * For Memory Matrix, we need to generate levels with target patterns
     */
    buildQuestionSet(config) {
        // Get current game config or use default
        const gameConfig = config && Object.keys(config).length > 0 
            ? config 
            : (window.gameInstance?.config || new GameConfig());

        // Generate fixed number of levels (e.g., 10 levels)
        const numLevels = 10;
        const levels = [];

        // Access game components (assume they're globally available)
        const levelManager = window.levelManager || new LevelManager(gameConfig);
        const patternGenerator = window.patternGenerator || new PatternGenerator();

        for (let level = 1; level <= numLevels; level++) {
            const params = levelManager.getLevelParams(level);
            
            // Generate pattern for this level
            const pattern = patternGenerator.generate(
                params.gridSize,
                params.targetsCount,
                level // Use level as seed for reproducibility
            );

            levels.push({
                levelNumber: level,
                params: params,
                pattern: pattern // Array of cell indices
            });
        }

        return {
            config: gameConfig,
            levels: levels
        };
    },

    /**
     * Start game from question set
     */
    startGameFromQuestionSet(questionSet, roomContext) {
        if (!window.gameInstance) {
            console.error('Memory Matrix game not initialized');
            return;
        }

        const game = window.gameInstance;
        
        // Update config
        game.config = questionSet.config;
        
        // Store pre-generated levels
        game.multiplayerLevels = questionSet.levels;
        game.currentLevelIndex = 0;
        game.roomContext = roomContext;
        
        // Reset game state
        game.state = 'RUNNING';
        game.currentLevel = 1;
        game.lives = game.config.lives;
        game.score = 0;
        game.totalCorrect = 0;
        game.totalMistakes = 0;
        game.streak = 0;
        
        // Update UI and start first level
        if (window.uiController) {
            window.uiController.showScreen('game');
            game.startLevelFromPattern(questionSet.levels[0]);
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
window.memoryMatrixGameAdapter = memoryMatrixGameAdapter;

// ============================================================================
// MODIFICATIONS NEEDED IN GAME CODE
// ============================================================================

/**
 * 1. Make game instance global in initialization:
 * 
 * document.addEventListener('DOMContentLoaded', () => {
 *     const config = new GameConfig();
 *     const levelManager = new LevelManager(config);
 *     const patternGenerator = new PatternGenerator();
 *     const gameEngine = new GameEngine(config, levelManager, patternGenerator);
 *     const uiController = new UIController(gameEngine);
 *     
 *     // Make globally available
 *     window.gameInstance = gameEngine;
 *     window.levelManager = levelManager;
 *     window.patternGenerator = patternGenerator;
 *     window.uiController = uiController;
 * });
 */

/**
 * 2. Add method to GameEngine class to start level from pre-generated pattern:
 * 
 * startLevelFromPattern(levelData) {
 *     this.currentLevel = levelData.levelNumber;
 *     const params = levelData.params;
 *     
 *     // Use pre-generated pattern instead of generating new one
 *     this.currentPattern = levelData.pattern;
 *     this.gridSize = params.gridSize;
 *     this.targetsCount = params.targetsCount;
 *     
 *     // Continue with normal level start
 *     this.showPhase = 'PREPARE';
 *     // ... rest of level start logic
 * }
 */

/**
 * 3. Add callback invocation when game ends:
 * 
 * In the endGame() or gameOver() method, add:
 * 
 * if (this.onGameEndCallback) {
 *     const extra = {
 *         levelsCompleted: this.currentLevel,
 *         accuracy: (this.totalCorrect / (this.totalCorrect + this.totalMistakes)) * 100,
 *         maxStreak: this.maxStreak
 *     };
 *     this.onGameEndCallback(this.score, extra);
 * }
 */

/**
 * 4. Add deterministic pattern generation (optional but recommended):
 * 
 * In PatternGenerator.generate(), add seed parameter:
 * 
 * generate(gridSize, targetsCount, seed) {
 *     // Use seed for reproducible random generation
 *     const rng = new SeededRandom(seed);
 *     
 *     // Rest of generation logic using rng instead of Math.random()
 * }
 * 
 * You may need to add SeededRandom class from expression-puzzle.js
 */
