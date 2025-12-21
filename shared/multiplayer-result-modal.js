/**
 * Multiplayer Result Modal
 * Shows game results with real-time updates and ranking
 */
class MultiplayerResultModal {
    constructor() {
        this.modalElement = null;
        this.isVisible = false;
        this.results = {};
        this.players = {};
        this.currentPlayerId = null;
        this.roomRef = null;
        this.unsubscribeResults = null;
        this.unsubscribePlayers = null;
        this.gameType = null;

        // Callbacks
        this.onExitRoom = null;
        this.onKickPlayer = null;
    }

    /**
     * Initialize the result modal
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        this.currentPlayerId = options.playerId;
        this.roomRef = options.roomRef;
        this.gameType = options.gameType;
        this.isHost = options.isHost || false;

        this.createModal();
        this.setupListeners();
    }

    /**
     * Create the modal DOM structure
     */
    createModal() {
        // Remove existing modal if any
        const existingModal = document.getElementById('multiplayerResultModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'multiplayerResultModal';
        modal.className = 'mp-result-modal';
        modal.innerHTML = `
            <div class="mp-result-modal-content">
                <div class="mp-result-header">
                    <h2>Game Results</h2>
                    <div class="mp-result-status">
                        <span class="mp-waiting-indicator"></span>
                        <span class="mp-waiting-text">Waiting for other players...</span>
                    </div>
                </div>
                <div class="mp-result-body">
                    <div class="mp-result-list"></div>
                </div>
                <div class="mp-result-footer">
                    <button class="mp-btn-exit" id="mpExitRoom">
                        <span class="btn-icon">🏠</span>
                        <span>Back to Home</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.modalElement = modal;

        // Setup button event listeners
        this.setupButtonListeners();
    }

    /**
     * Setup button event listeners
     */
    setupButtonListeners() {
        const exitRoomBtn = document.getElementById('mpExitRoom');

        if (exitRoomBtn) {
            exitRoomBtn.addEventListener('click', () => {
                if (this.onExitRoom) {
                    this.onExitRoom();
                }
            });
        }
    }

    /**
     * Setup Firebase listeners for real-time updates
     */
    setupListeners() {
        if (!this.roomRef) {
            console.warn('[ResultModal] No room reference provided');
            return;
        }

        // Listen for player results updates
        this.unsubscribeResults = this.roomRef.child('results').on('value', (snapshot) => {
            const results = snapshot.val() || {};
            this.results = results;
            this.updateResultsList();
        });

        // Listen for player info updates
        this.unsubscribePlayers = this.roomRef.child('players').on('value', (snapshot) => {
            const players = snapshot.val() || {};
            this.players = players;
            this.updateResultsList();
        });
    }

    /**
     * Show the result modal
     */
    show() {
        if (this.modalElement) {
            this.modalElement.classList.add('active');
            this.isVisible = true;
        }
    }

    /**
     * Hide the result modal
     */
    hide() {
        if (this.modalElement) {
            this.modalElement.classList.remove('active');
            this.isVisible = false;
        }
    }

    /**
     * Submit current player's result
     * @param {Object} result - Player's game result
     */
    async submitResult(result) {
        if (!this.roomRef || !this.currentPlayerId) {
            console.error('[ResultModal] Cannot submit result: missing room reference or player ID');
            return;
        }

        const resultData = {
            score: result.score || 0,
            time: result.time || null, // Time in milliseconds (null if game doesn't track time)
            details: result.details || {},
            finishedAt: firebase.database.ServerValue.TIMESTAMP
        };

        try {
            // Save result to Firebase
            await this.roomRef.child(`results/${this.currentPlayerId}`).set(resultData);

            // Mark player as finished
            await this.roomRef.child(`players/${this.currentPlayerId}/status`).set(MP_CONSTANTS.PLAYER_STATUS.FINISHED);
            await this.roomRef.child(`players/${this.currentPlayerId}/finished`).set(true);
            await this.roomRef.child(`players/${this.currentPlayerId}/finishedAt`).set(firebase.database.ServerValue.TIMESTAMP);

            console.log('[ResultModal] Result submitted:', resultData);
        } catch (error) {
            console.error('[ResultModal] Failed to submit result:', error);
        }
    }

    /**
     * Update the results list UI
     */
    updateResultsList() {
        const listElement = this.modalElement?.querySelector('.mp-result-list');
        if (!listElement) return;

        // Combine player info with results
        const playerResults = [];
        const waitingPlayers = [];

        Object.keys(this.players).forEach(playerId => {
            const player = this.players[playerId];
            const result = this.results[playerId];

            // Check if player has finished (either has result OR finished flag is true)
            const hasFinished = result || player.finished === true || player.status === MP_CONSTANTS.PLAYER_STATUS.FINISHED;

            if (hasFinished) {
                playerResults.push({
                    playerId,
                    name: player.name,
                    isHost: player.isHost,
                    score: result?.score || player.score || 0,
                    time: result?.time || null,
                    details: result?.details || {},
                    finishedAt: result?.finishedAt || player.finishedAt
                });
            } else if (player.status !== MP_CONSTANTS.PLAYER_STATUS.DISCONNECTED) {
                waitingPlayers.push({
                    playerId,
                    name: player.name,
                    isHost: player.isHost
                });
            }
        });

        // Sort by score (descending), then by time (ascending) if scores are equal
        playerResults.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            // If scores are equal and both have time, sort by time (shorter is better)
            if (a.time !== null && b.time !== null) {
                return a.time - b.time;
            }
            // If only one has time, the one with time wins (they tracked it)
            if (a.time !== null) return -1;
            if (b.time !== null) return 1;
            return 0;
        });

        // Update waiting status
        this.updateWaitingStatus(waitingPlayers.length);

        // Generate HTML
        let html = '';

        // Finished players with rankings
        playerResults.forEach((player, index) => {
            const rank = index + 1;
            const isCurrentPlayer = player.playerId === this.currentPlayerId;
            const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
            const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

            html += `
                <div class="mp-result-item ${isCurrentPlayer ? 'is-you' : ''} ${rankClass}">
                    <div class="mp-result-rank">${rankIcon}</div>
                    <div class="mp-result-player-info">
                        <div class="mp-result-player-name">
                            ${this.escapeHtml(player.name)}
                            ${player.isHost ? '<span class="host-badge">👑</span>' : ''}
                            ${isCurrentPlayer ? '<span class="you-badge">YOU</span>' : ''}
                        </div>
                        <div class="mp-result-player-details">
                            ${this.formatResultDetails(player)}
                        </div>
                    </div>
                    <div class="mp-result-score">
                        <div class="score-value">${player.score}</div>
                        <div class="score-label">points</div>
                    </div>
                </div>
            `;
        });

        // Waiting players
        waitingPlayers.forEach(player => {
            const isCurrentPlayer = player.playerId === this.currentPlayerId;
            const canKick = this.isHost && !isCurrentPlayer;

            html += `
                <div class="mp-result-item waiting ${isCurrentPlayer ? 'is-you' : ''}">
                    <div class="mp-result-rank">
                        <div class="mp-waiting-spinner"></div>
                    </div>
                    <div class="mp-result-player-info">
                        <div class="mp-result-player-name">
                            ${this.escapeHtml(player.name)}
                            ${player.isHost ? '<span class="host-badge">👑</span>' : ''}
                            ${isCurrentPlayer ? '<span class="you-badge">YOU</span>' : ''}
                        </div>
                        <div class="mp-result-player-details waiting-text">
                            Still playing...
                        </div>
                    </div>
                    ${canKick ? `
                        <button class="mp-kick-btn" data-player-id="${player.playerId}" title="Remove player from room">
                            Remove
                        </button>
                    ` : ''}
                </div>
            `;
        });

        listElement.innerHTML = html;

        // Setup kick button listeners
        this.setupKickButtonListeners();
    }

    /**
     * Setup kick button event listeners
     */
    setupKickButtonListeners() {
        const kickButtons = this.modalElement?.querySelectorAll('.mp-kick-btn');
        kickButtons?.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playerId = e.currentTarget.dataset.playerId;
                if (playerId && this.onKickPlayer) {
                    this.onKickPlayer(playerId);
                }
            });
        });
    }

    /**
     * Update waiting status indicator
     */
    updateWaitingStatus(waitingCount) {
        const statusElement = this.modalElement?.querySelector('.mp-result-status');
        if (!statusElement) return;

        if (waitingCount === 0) {
            statusElement.innerHTML = `
                <span class="mp-complete-indicator">✓</span>
                <span class="mp-complete-text">All players finished!</span>
            `;
            statusElement.classList.add('complete');
        } else {
            statusElement.innerHTML = `
                <span class="mp-waiting-indicator"></span>
                <span class="mp-waiting-text">Waiting for ${waitingCount} player${waitingCount > 1 ? 's' : ''}...</span>
            `;
            statusElement.classList.remove('complete');
        }
    }

    /**
     * Format result details based on game type
     */
    formatResultDetails(player) {
        const details = player.details || {};
        let timeStr = '';

        // Format time if available
        if (player.time !== null && player.time !== undefined) {
            const seconds = Math.floor(player.time / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;

            if (minutes > 0) {
                timeStr = `${minutes}m ${remainingSeconds}s`;
            } else {
                timeStr = `${remainingSeconds}s`;
            }
        }

        // Build details string based on available data
        const parts = [];

        if (timeStr) {
            parts.push(`<span class="detail-item time">⏱️ ${timeStr}</span>`);
        }

        if (details.accuracy !== undefined) {
            parts.push(`<span class="detail-item accuracy">🎯 ${details.accuracy}%</span>`);
        }

        if (details.correct !== undefined) {
            parts.push(`<span class="detail-item correct">✓ ${details.correct} correct</span>`);
        }

        if (details.streak !== undefined) {
            parts.push(`<span class="detail-item streak">🔥 ${details.streak} streak</span>`);
        }

        return parts.length > 0 ? parts.join(' ') : '';
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Set callback for exit room action
     */
    setOnExitRoom(callback) {
        this.onExitRoom = callback;
    }

    /**
     * Set callback for kick player action
     */
    setOnKickPlayer(callback) {
        this.onKickPlayer = callback;
    }

    /**
     * Cleanup and remove listeners
     */
    destroy() {
        // Remove Firebase listeners
        if (this.roomRef) {
            if (this.unsubscribeResults) {
                this.roomRef.child('results').off('value', this.unsubscribeResults);
            }
            if (this.unsubscribePlayers) {
                this.roomRef.child('players').off('value', this.unsubscribePlayers);
            }
        }

        // Remove modal from DOM
        if (this.modalElement) {
            this.modalElement.remove();
            this.modalElement = null;
        }

        this.isVisible = false;
        this.results = {};
        this.players = {};
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiplayerResultModal;
}

console.log('[MultiplayerResultModal] Class loaded');
