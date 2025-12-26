/**
 * Brain Training Games
 * Author: Cao Viet Hoang
 * Created: 2025
 */

/**
 * Word Recall Game Multiplayer Adapter
 * Extends MultiplayerGameAdapter to integrate multiplayer functionality into Word Recall Game
 */
class WordRecallMultiplayerAdapter extends MultiplayerGameAdapter {
    constructor(app) {
        super(app.gameEngine, 'word-recall');

        this.app = app;
        this.engine = app.gameEngine;
        this.uiController = app.uiController;

        // Store original methods
        this.originalStartGame = null;
        this.originalRenderFinalScreen = null;

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
        console.log('[WordRecallAdapter] Initializing as HOST for room:', roomId);

        this.multiplayerState.isMultiplayerMode = true;
        this.multiplayerState.role = 'host';
        this.isMultiplayerMode = true; // Set base class flag

        // Load saved settings into engine config (ensures settings are applied even if UI not yet updated)
        this.loadSavedSettingsToConfig();

        await this.init(null, roomId);

        this.interceptHostGameStart();
        this.setupScoreSync();
        this.setupGameEndDetection();

        this.showMultiplayerBadge('HOST');

        console.log('[WordRecallAdapter] Host initialization complete');
    }

    /**
     * Load saved settings from window.GAME_SETTINGS into engine config
     * This ensures settings are restored for multiplayer mode
     */
    loadSavedSettingsToConfig() {
        if (!window.GAME_SETTINGS) {
            console.log('[WordRecallAdapter] No saved settings found, using defaults');
            return;
        }

        const settings = window.GAME_SETTINGS;
        console.log('[WordRecallAdapter] Loading saved settings into config:', settings);

        // Apply saved settings to engine config
        if (settings.sessionRounds !== undefined) {
            this.engine.config.sessionRounds = settings.sessionRounds;
        }
        if (settings.startK !== undefined) {
            this.engine.config.startK = settings.startK;
        }
        if (settings.maxK !== undefined) {
            this.engine.config.maxK = settings.maxK;
        }
        if (settings.memorizeMsBase !== undefined) {
            this.engine.config.memorizeMsBase = settings.memorizeMsBase;
        }
        if (settings.testTimeLimitMs !== undefined) {
            this.engine.config.testTimeLimitMs = settings.testTimeLimitMs;
        }
        if (settings.distractorEnabled !== undefined) {
            this.engine.config.distractorEnabled = settings.distractorEnabled;
        }

        console.log('[WordRecallAdapter] Config after loading settings:', this.engine.config);
    }

    /**
     * Initialize adapter as PLAYER
     * @param {string} roomId - Room ID from sessionStorage
     */
    async initAsPlayer(roomId) {
        console.log('[WordRecallAdapter] Initializing as PLAYER for room:', roomId);

        this.multiplayerState.isMultiplayerMode = true;
        this.multiplayerState.role = 'player';
        this.isMultiplayerMode = true; // Set base class flag

        await this.init(null, roomId);

        this.setupScoreSync();
        this.setupGameEndDetection();

        await this.waitForGameDataAndStart();

        this.showMultiplayerBadge('PLAYER');

        console.log('[WordRecallAdapter] Player initialization complete');
    }

    /**
     * Intercept host's game start
     */
    interceptHostGameStart() {
        this.originalStartGame = this.uiController.handleStartGame.bind(this.uiController);

        this.uiController.handleStartGame = async () => {
            console.log('[WordRecallAdapter] Host starting game - intercepted');

            // Save settings when starting multiplayer game (same as single player)
            this.uiController.saveCurrentSettings();

            try {
                const gameData = await this.prepareMultiplayerGame();

                console.log('[WordRecallAdapter] Publishing game data to Firebase...');
                await this.core.publishGameData(gameData);

                await this.core.setRoomStatus(MP_CONSTANTS.ROOM_STATUS.PLAYING);

                console.log('[WordRecallAdapter] Game data published, starting host game');

                this.startMultiplayerGame(gameData);
                this.syncScore(0);

            } catch (error) {
                console.error('[WordRecallAdapter] Failed to start multiplayer game:', error);
                alert('Failed to start multiplayer game: ' + error.message);
            }
        };
    }

    /**
     * Wait for game data from host
     */
    async waitForGameDataAndStart() {
        console.log('[WordRecallAdapter] Waiting for game data from host...');

        this.showLoadingOverlay('Waiting for host to start game...');

        return new Promise((resolve) => {
            const unsubscribe = this.core.onGameDataUpdate((gameData) => {
                if (gameData && gameData.rounds) {
                    console.log('[WordRecallAdapter] Received game data from host');

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
        return {
            sessionRounds: this.engine.config.sessionRounds,
            startK: this.engine.config.startK,
            maxK: this.engine.config.maxK,
            memorizeMsBase: this.engine.config.memorizeMsBase,
            testTimeLimitMs: this.engine.config.testTimeLimitMs,
            distractorEnabled: this.engine.config.distractorEnabled
        };
    }

    /**
     * Prepare multiplayer game data (HOST ONLY)
     */
    async prepareMultiplayerGame() {
        console.log('[WordRecallAdapter] Preparing multiplayer game');

        // Get configuration from UI
        const config = {
            sessionRounds: parseInt(this.uiController.elements.sessionRounds.value),
            startK: parseInt(this.uiController.elements.startK.value),
            maxK: parseInt(this.uiController.elements.maxK.value),
            memorizeMsBase: parseInt(this.uiController.elements.memorizeMsBase.value),
            testTimeLimitMs: parseInt(this.uiController.elements.testTimeLimitMs.value),
            distractorEnabled: this.uiController.elements.distractorEnabled.checked,
            memorizeMsMin: this.engine.config.memorizeMsMin,
            decoyCountRatio: this.engine.config.decoyCountRatio,
            allowMistakes: this.engine.config.allowMistakes,
            antiRepeatWindow: this.engine.config.antiRepeatWindow,
            distractorMs: this.engine.config.distractorMs
        };

        // Update engine config
        Object.assign(this.engine.config, config);

        // Pre-generate all rounds
        const rounds = [];
        const wordSelector = new WordSelector(this.app.wordBankService, config);
        const decoyGenerator = new DecoyGenerator(this.app.wordBankService, config);

        for (let round = 0; round < config.sessionRounds; round++) {
            const K = this.engine.calculateK(round);
            const wordList = wordSelector.selectWords(K, round);
            const decoys = decoyGenerator.generateDecoys(wordList, K, round);

            // Shuffle options
            const options = this.shuffleArray([...wordList, ...decoys]);

            rounds.push({
                round: round + 1,
                K: K,
                wordList: wordList,
                decoys: decoys,
                options: options,
                memorizeTime: this.engine.calculateMemorizeTime(round)
            });
        }

        const gameData = {
            config: config,
            rounds: rounds,
            generatedAt: Date.now()
        };

        console.log('[WordRecallAdapter] Game data prepared:', {
            totalRounds: rounds.length
        });

        return gameData;
    }

    /**
     * Shuffle array utility
     */
    shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    /**
     * Start multiplayer game with shared data (ALL PLAYERS)
     */
    startMultiplayerGame(gameData) {
        console.log('[WordRecallAdapter] Starting multiplayer game with shared data');

        // Set game start time for tracking
        this.setGameStartTime();

        // Set config
        Object.assign(this.engine.config, gameData.config);

        // Store pre-generated rounds
        this.preGeneratedRounds = gameData.rounds;
        this.currentRoundIndex = 0;

        // Reset engine
        this.engine.reset();
        this.engine.currentRound = 0;

        // Override word selection to use pre-generated data
        this.overrideWordSelection();

        // Start the game
        this.uiController.showScreen('game');
        this.loadNextRound();

        console.log('[WordRecallAdapter] Game started with', gameData.rounds.length, 'rounds');
    }

    /**
     * Override word selection to use pre-generated data
     */
    overrideWordSelection() {
        const self = this;
        const engine = this.engine;

        // Override nextRound method
        const originalNextRound = engine.nextRound.bind(engine);
        engine.nextRound = () => {
            engine.currentRound++;

            if (engine.currentRound > engine.config.sessionRounds) {
                engine.endGame();
                return;
            }

            // Use pre-generated data
            const roundData = self.preGeneratedRounds[engine.currentRound - 1];

            engine.currentWordList = roundData.wordList;
            engine.currentDecoys = roundData.decoys;
            engine.currentOptions = roundData.options;

            engine.selectedWords.clear();
            engine.roundStartTime = Date.now();

            engine.setState('MEMORIZE');
        };
    }

    /**
     * Load next round using pre-generated data
     */
    loadNextRound() {
        this.engine.nextRound();

        if (this.engine.state === 'END') {
            this.uiController.renderFinalScreen();
        } else {
            this.uiController.renderMemorizePhase();
        }
    }

    /**
     * Get current player score
     */
    getCurrentScore() {
        return {
            score: this.engine.totalScore,
            currentRound: this.engine.currentRound,
            totalRounds: this.engine.config.sessionRounds,
            hits: this.engine.stats.totalHits,
            misses: this.engine.stats.totalMiss,
            falseAlarms: this.engine.stats.totalFalse
        };
    }

    /**
     * Setup score syncing
     */
    setupScoreSync() {
        const originalHandleSubmitTest = this.uiController.handleSubmitTest.bind(this.uiController);

        this.uiController.handleSubmitTest = async () => {
            originalHandleSubmitTest();

            // Sync score after submission
            const score = this.getCurrentScore();
            await this.syncScore(score.score);

            console.log('[WordRecallAdapter] Score synced:', score);
        };
    }

    /**
     * Setup game end detection
     */
    setupGameEndDetection() {
        this.originalRenderFinalScreen = this.uiController.renderFinalScreen.bind(this.uiController);

        this.uiController.renderFinalScreen = async () => {
            console.log('[WordRecallAdapter] Game ending, syncing final scores...');

            await this.onMultiplayerGameEnd();
            this.originalRenderFinalScreen();
        };
    }

    /**
     * Handle game end in multiplayer mode
     */
    async onMultiplayerGameEnd() {
        console.log('[WordRecallAdapter] Multiplayer game ended');

        const finalScore = this.getCurrentScore();
        await this.syncScore(finalScore.score);

        const totalWords = this.engine.roundData.reduce((sum, r) => sum + r.K, 0);
        const accuracy = totalWords > 0 ? Math.round((finalScore.hits / totalWords) * 100) : 0;

        await this.endMultiplayerGame({
            score: finalScore.score,
            accuracy: accuracy,
            details: {
                accuracy: accuracy,
                correct: finalScore.hits
            }
        });

        console.log('[WordRecallAdapter] Final scores synced');
    }

    /**
     * Handle room left/closed
     */
    onRoomLeft() {
        console.log('[WordRecallAdapter] Room left or closed');

        this.uiController.clearTimers();

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

console.log('[WordRecallAdapter] Adapter class loaded');
