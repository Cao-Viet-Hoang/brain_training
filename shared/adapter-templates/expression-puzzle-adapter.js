// ============================================================================
// EXPRESSION PUZZLE MULTIPLAYER ADAPTER - IMPLEMENTATION TEMPLATE
// Add this code to the end of games/expression-puzzle.js
// ============================================================================

const expressionPuzzleGameAdapter = {
    /**
     * Get game metadata
     */
    getGameMeta() {
        return {
            gameId: 'expression-puzzle',
            version: '1.0.0',
            title: 'Expression Puzzle'
        };
    },

    /**
     * Build question set from configuration
     * For Expression Puzzle, generate puzzles with deterministic seed
     */
    buildQuestionSet(config) {
        if (!window.gameInstance) {
            console.error('Expression Puzzle game not initialized');
            return null;
        }

        // Get current config or use default
        const gameConfig = config && Object.keys(config).length > 0 
            ? config 
            : window.gameInstance.config;

        // Generate puzzles with deterministic seed
        const seed = Date.now(); // Same seed for all players in room
        const puzzles = [];
        
        const puzzleGenerator = new PuzzleGenerator(gameConfig, seed);

        for (let i = 0; i < gameConfig.puzzleCount; i++) {
            const puzzle = puzzleGenerator.generate();
            
            // Convert puzzle to JSON-safe format
            puzzles.push({
                expressionTemplate: puzzle.expressionTemplate,
                target: puzzle.target,
                solutionNumbers: puzzle.solutionNumbers,
                numSlots: puzzle.numSlots,
                metadata: puzzle.metadata
            });
        }

        return {
            config: gameConfig,
            seed: seed,
            puzzles: puzzles
        };
    },

    /**
     * Start game from question set
     */
    startGameFromQuestionSet(questionSet, roomContext) {
        if (!window.gameInstance) {
            console.error('Expression Puzzle game not initialized');
            return;
        }

        const game = window.gameInstance;
        
        // Update config
        game.config = questionSet.config;
        
        // Store pre-generated puzzles
        game.multiplayerPuzzles = questionSet.puzzles;
        game.currentPuzzleIndex = 0;
        game.roomContext = roomContext;
        
        // Reset game state
        game.state = 'RUNNING';
        game.currentPuzzle = 0;
        game.score = 0;
        game.correctCount = 0;
        game.wrongCount = 0;
        game.hintsUsed = 0;
        
        // Update UI and start first puzzle
        if (window.uiController) {
            window.uiController.showScreen('game');
            game.loadPuzzleFromData(questionSet.puzzles[0]);
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
window.expressionPuzzleGameAdapter = expressionPuzzleGameAdapter;

// ============================================================================
// MODIFICATIONS NEEDED IN GAME CODE
// ============================================================================

/**
 * 1. Make game instance global in initialization:
 * 
 * document.addEventListener('DOMContentLoaded', () => {
 *     const config = new PuzzleConfig();
 *     const puzzleGenerator = new PuzzleGenerator(config);
 *     const gameEngine = new GameEngine(config, puzzleGenerator);
 *     const uiController = new UIController(gameEngine);
 *     
 *     // Make globally available
 *     window.gameInstance = gameEngine;
 *     window.uiController = uiController;
 * });
 */

/**
 * 2. Ensure SeededRandom is used consistently:
 * 
 * The game already uses SeededRandom class. Make sure:
 * - PuzzleGenerator accepts seed in constructor
 * - All random generation uses the seeded RNG
 * - Same seed produces identical puzzles
 */

/**
 * 3. Add method to GameEngine to load puzzle from data:
 * 
 * loadPuzzleFromData(puzzleData) {
 *     // Reconstruct Puzzle object from data
 *     this.currentPuzzle = new Puzzle(
 *         puzzleData.expressionTemplate,
 *         puzzleData.target,
 *         puzzleData.solutionNumbers,
 *         this.config
 *     );
 *     
 *     // Generate shuffled options
 *     this.shuffledOptions = this.shuffleArray([...puzzleData.solutionNumbers]);
 *     this.selectedSlots = [];
 *     
 *     // Update UI
 *     this.renderPuzzle();
 * }
 */

/**
 * 4. Add callback invocation when game ends:
 * 
 * In the endGame() or showResults() method, add:
 * 
 * if (this.onGameEndCallback) {
 *     const accuracy = (this.correctCount / this.config.puzzleCount) * 100;
 *     const extra = {
 *         accuracy: accuracy,
 *         correctCount: this.correctCount,
 *         wrongCount: this.wrongCount,
 *         hintsUsed: this.hintsUsed,
 *         avgTimePerPuzzle: this.avgTimePerPuzzle
 *     };
 *     this.onGameEndCallback(this.score, extra);
 * }
 */

/**
 * 5. Verify JSON-safety of puzzle data:
 * 
 * Ensure Puzzle class properties are all JSON-serializable:
 * - expressionTemplate: string ✓
 * - target: number ✓
 * - solutionNumbers: array of numbers ✓
 * - numSlots: number ✓
 * - metadata: object with primitives ✓
 * 
 * No functions, no DOM references, no Date objects
 */

/**
 * 6. Test deterministic generation:
 * 
 * Verify that same seed produces identical puzzles:
 * 
 * const seed = 12345;
 * const gen1 = new PuzzleGenerator(config, seed);
 * const gen2 = new PuzzleGenerator(config, seed);
 * 
 * const puzzle1 = gen1.generate();
 * const puzzle2 = gen2.generate();
 * 
 * // These should be identical
 * console.assert(puzzle1.expressionTemplate === puzzle2.expressionTemplate);
 * console.assert(puzzle1.target === puzzle2.target);
 * console.assert(JSON.stringify(puzzle1.solutionNumbers) === JSON.stringify(puzzle2.solutionNumbers));
 */
