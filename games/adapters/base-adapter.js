/**
 * Brain Training Games
 * Author: Cao Viet Hoang
 * Created: 2025
 */

/**
 * Game Adapter Interface
 * Interface definition for game-specific multiplayer adapters
 * 
 * All game adapters should extend MultiplayerGameAdapter and implement these methods
 */

/**
 * Base interface that all game adapters should follow
 */
const GameAdapterInterface = {
    // ==================== REQUIRED METHODS ====================
    
    /**
     * Get current game configuration
     * Should return an object with game settings (difficulty, time limit, question count, etc.)
     * 
     * @returns {Object} Game configuration object
     * 
     * Example:
     * {
     *   difficulty: 'medium',
     *   questionCount: 20,
     *   timeLimit: 60,
     *   operations: ['+', '-', '*']
     * }
     */
    getGameConfig: () => ({}),
    
    /**
     * Prepare multiplayer game (HOST ONLY)
     * Called when host starts the game from lobby
     * Should generate questions, setup game data, etc.
     * This data will be shared with all players
     * 
     * @returns {Promise<Object>} Game data to be synced across all players
     * 
     * Example:
     * {
     *   questions: [...],
     *   totalQuestions: 20,
     *   timeLimit: 60,
     *   startTime: Date.now()
     * }
     */
    prepareMultiplayerGame: async () => ({}),
    
    /**
     * Start multiplayer game
     * Called on all players when game starts
     * Should initialize game with shared data and start gameplay
     * 
     * @param {Object} gameData - Shared game data from host
     */
    startMultiplayerGame: (gameData) => {},
    
    /**
     * Get current player score
     * Called periodically to sync score with Firebase
     * 
     * @returns {number} Current player score
     */
    getCurrentScore: () => 0,
    
    // ==================== OPTIONAL CALLBACKS ====================
    
    /**
     * Called when opponent/player data updates
     * Use this to update UI showing other players' progress
     * 
     * @param {string} playerId - Player ID
     * @param {Object} data - Player data (score, progress, etc.)
     */
    onOpponentUpdate: (playerId, data) => {},
    
    /**
     * Called when game state changes (host-controlled state)
     * Use this for synchronized game events (e.g., phase changes, time sync)
     * 
     * @param {Object} state - Game state object
     */
    onGameStateSync: (state) => {},
    
    /**
     * End multiplayer game
     * Called when game ends, should return final results
     * 
     * @returns {Object} Final game results
     * 
     * Example:
     * {
     *   score: 150,
     *   correctAnswers: 18,
     *   totalQuestions: 20,
     *   timeSpent: 45
     * }
     */
    endMultiplayerGame: () => ({}),
    
    /**
     * Called when players list updates
     * Use this to track who's in the room, who's ready, etc.
     * 
     * @param {Object} players - Updated players object
     */
    onPlayersUpdate: (players) => {},
    
    /**
     * Called when game data is received from host (NON-HOST ONLY)
     * Use this to prepare game with received data
     * 
     * @param {Object} data - Game data from host
     */
    onGameDataReceived: (data) => {},
    
    /**
     * Called when room is left or closed
     * Use this to cleanup game state, stop timers, etc.
     */
    onRoomLeft: () => {},
};

/**
 * Example implementation pattern:
 * 
 * class MyGameAdapter extends MultiplayerGameAdapter {
 *     constructor(gameInstance) {
 *         super(gameInstance, 'my-game');
 *     }
 * 
 *     getGameConfig() {
 *         return {
 *             difficulty: this.game.difficulty,
 *             level: this.game.level
 *         };
 *     }
 * 
 *     async prepareMultiplayerGame() {
 *         const questions = this.game.generateQuestions();
 *         return { questions, totalQuestions: questions.length };
 *     }
 * 
 *     startMultiplayerGame(gameData) {
 *         this.game.questions = gameData.questions;
 *         this.game.start();
 *     }
 * 
 *     getCurrentScore() {
 *         return this.game.score;
 *     }
 * 
 *     onOpponentUpdate(playerId, data) {
 *         // Update opponent progress display
 *         this.game.updateOpponentScore(playerId, data.score);
 *     }
 * 
 *     onGameStateSync(state) {
 *         // Sync time or phase
 *         if (state.timeRemaining) {
 *             this.game.syncTime(state.timeRemaining);
 *         }
 *     }
 * 
 *     onRoomLeft() {
 *         // Cleanup
 *         this.game.stopTimer();
 *         this.game.reset();
 *     }
 * }
 */

/**
 * Adapter Implementation Checklist:
 * 
 * 1. [ ] Extend MultiplayerGameAdapter
 * 2. [ ] Implement getGameConfig() - return game settings
 * 3. [ ] Implement prepareMultiplayerGame() - generate shared game data (host only)
 * 4. [ ] Implement startMultiplayerGame() - start game with shared data
 * 5. [ ] Implement getCurrentScore() - return current score
 * 6. [ ] Hook game score updates to call syncScore()
 * 7. [ ] Implement onRoomLeft() - cleanup on room exit
 * 8. [ ] (Optional) Implement onOpponentUpdate() - track other players
 * 9. [ ] (Optional) Implement onGameStateSync() - sync game events
 * 10. [ ] (Optional) Implement onGameDataReceived() - handle received data
 * 11. [ ] Test with multiple players
 * 12. [ ] Test host leaving
 * 13. [ ] Test reconnection scenarios
 */

/**
 * Game Integration Steps:
 * 
 * 1. Include multiplayer scripts in game HTML:
 *    - Firebase SDK
 *    - firebase-config.js
 *    - constants.js
 *    - room-validator.js
 *    - room-cleanup.js
 *    - multiplayer-core.js
 *    - multiplayer-ui.js
 *    - multiplayer-adapter.js
 *    - Your game adapter (e.g., math-game-adapter.js)
 * 
 * 2. Add multiplayer container to HTML:
 *    <div id="multiplayerContainer"></div>
 * 
 * 3. Initialize adapter in game JS:
 *    const adapter = new MyGameAdapter(gameInstance);
 *    adapter.init('multiplayerContainer');
 * 
 * 4. Connect game events to adapter:
 *    game.onScoreChange = (score) => adapter.syncScore(score);
 *    game.onGameEnd = (results) => adapter.endMultiplayerGame(results);
 * 
 * 5. Handle multiplayer mode in game logic:
 *    if (adapter.isInMultiplayerMode()) {
 *        // Different behavior for multiplayer
 *    }
 */

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameAdapterInterface };
}
