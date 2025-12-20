// ============================================================================
// MULTIPLAYER INITIALIZATION HELPER
// Initializes Firebase and creates RoomUI for game pages
// ============================================================================

/**
 * Initialize multiplayer functionality for a game page
 * @param {Object} gameAdapter - Game adapter object with required interface
 * @param {HTMLElement} targetContainer - Optional target container for UI
 * @returns {Promise<Object>} Returns { firebaseClient, roomClient, roomUI }
 */
async function initializeMultiplayer(gameAdapter, targetContainer = null) {
    try {
        // Verify game adapter interface
        if (!gameAdapter.getGameMeta || 
            !gameAdapter.buildQuestionSet || 
            !gameAdapter.startGameFromQuestionSet || 
            !gameAdapter.onGameEnd) {
            throw new Error('Invalid game adapter: missing required methods');
        }

        // Initialize Firebase
        if (!window.firebaseConfig) {
            console.warn('Firebase config not found. Multiplayer features disabled.');
            return null;
        }

        await firebaseClient.initialize(window.firebaseConfig);
        
        // Sign in anonymously
        const savedName = localStorage.getItem('playerDisplayName');
        await firebaseClient.signInAnonymously(savedName);

        // Create room client
        const roomClient = new RoomClient(firebaseClient);

        // Create room UI
        const roomUI = new RoomUI(roomClient, gameAdapter);

        // Mount UI to target container or body
        const target = targetContainer || document.body;
        roomUI.mount(target);

        // Register game end callback
        gameAdapter.onGameEnd((score, extra) => {
            if (roomClient.getCurrentRoomId()) {
                roomClient.submitScore(score, extra).catch(err => {
                    console.error('Failed to submit score:', err);
                });
            }
        });

        console.log('Multiplayer initialized successfully');

        return {
            firebaseClient,
            roomClient,
            roomUI
        };
    } catch (error) {
        console.error('Failed to initialize multiplayer:', error);
        return null;
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.initializeMultiplayer = initializeMultiplayer;
}
