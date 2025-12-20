// ============================================================================
// ROOM UI COMPONENT
// Provides multiplayer panel UI for create/join/start/players/leaderboard
// ============================================================================

class RoomUI {
    constructor(roomClient, gameAdapter) {
        this.roomClient = roomClient;
        this.gameAdapter = gameAdapter;
        this.container = null;
        this.elements = {};
        this.state = {
            inRoom: false,
            isHost: false,
            roomId: null,
            status: 'idle', // idle, waiting, playing, ended
            players: {},
            scores: {}
        };
        
        this.init();
    }

    /**
     * Initialize UI and setup callbacks
     */
    init() {
        this.createUI();
        this.setupCallbacks();
        this.setupEventListeners();
    }

    /**
     * Create UI elements
     */
    createUI() {
        // Create container
        this.container = document.createElement('div');
        this.container.className = 'multiplayer-panel';
        this.container.innerHTML = `
            <div class="multiplayer-header">
                <h3>🎮 Multiplayer</h3>
                <button class="toggle-panel-btn" id="togglePanel">−</button>
            </div>
            
            <div class="multiplayer-content">
                <!-- Lobby Screen -->
                <div class="multiplayer-screen" id="lobbyScreen">
                    <div class="lobby-actions">
                        <button class="btn btn-primary" id="createRoomBtn">
                            Create Room
                        </button>
                        <div class="join-room-form">
                            <input 
                                type="text" 
                                id="roomIdInput" 
                                placeholder="Enter Room ID" 
                                maxlength="8"
                                style="text-transform: uppercase;"
                            />
                            <button class="btn btn-secondary" id="joinRoomBtn">
                                Join
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Room Screen -->
                <div class="multiplayer-screen hidden" id="roomScreen">
                    <div class="room-info">
                        <div class="room-id-display">
                            <span class="label">Room ID:</span>
                            <span class="room-id" id="displayRoomId">------</span>
                            <button class="btn-icon" id="copyRoomIdBtn" title="Copy Room ID">
                                📋
                            </button>
                        </div>
                        <div class="room-status">
                            <span class="status-indicator" id="statusIndicator"></span>
                            <span id="statusText">Waiting</span>
                        </div>
                    </div>

                    <div class="players-section">
                        <h4>Players (<span id="playerCount">0</span>)</h4>
                        <div class="players-list" id="playersList">
                            <!-- Players will be rendered here -->
                        </div>
                    </div>

                    <div class="leaderboard-section hidden" id="leaderboardSection">
                        <h4>Leaderboard</h4>
                        <div class="leaderboard" id="leaderboard">
                            <!-- Scores will be rendered here -->
                        </div>
                    </div>

                    <div class="room-actions">
                        <button class="btn btn-success hidden" id="startGameBtn">
                            Start Game
                        </button>
                        <button class="btn btn-danger hidden" id="endRoomBtn">
                            End Room
                        </button>
                        <button class="btn btn-secondary" id="leaveRoomBtn">
                            Leave Room
                        </button>
                    </div>
                </div>

                <!-- Loading Indicator -->
                <div class="loading-indicator hidden" id="loadingIndicator">
                    <div class="spinner"></div>
                    <p id="loadingText">Loading...</p>
                </div>

                <!-- Error Message -->
                <div class="error-message hidden" id="errorMessage">
                    <span id="errorText"></span>
                    <button class="btn-close" id="closeErrorBtn">×</button>
                </div>
            </div>
        `;

        // Cache element references
        this.elements = {
            // Screens
            lobbyScreen: this.container.querySelector('#lobbyScreen'),
            roomScreen: this.container.querySelector('#roomScreen'),
            loadingIndicator: this.container.querySelector('#loadingIndicator'),
            errorMessage: this.container.querySelector('#errorMessage'),
            
            // Lobby elements
            createRoomBtn: this.container.querySelector('#createRoomBtn'),
            roomIdInput: this.container.querySelector('#roomIdInput'),
            joinRoomBtn: this.container.querySelector('#joinRoomBtn'),
            
            // Room elements
            displayRoomId: this.container.querySelector('#displayRoomId'),
            copyRoomIdBtn: this.container.querySelector('#copyRoomIdBtn'),
            statusIndicator: this.container.querySelector('#statusIndicator'),
            statusText: this.container.querySelector('#statusText'),
            playerCount: this.container.querySelector('#playerCount'),
            playersList: this.container.querySelector('#playersList'),
            leaderboardSection: this.container.querySelector('#leaderboardSection'),
            leaderboard: this.container.querySelector('#leaderboard'),
            startGameBtn: this.container.querySelector('#startGameBtn'),
            endRoomBtn: this.container.querySelector('#endRoomBtn'),
            leaveRoomBtn: this.container.querySelector('#leaveRoomBtn'),
            
            // Other
            togglePanel: this.container.querySelector('#togglePanel'),
            errorText: this.container.querySelector('#errorText'),
            closeErrorBtn: this.container.querySelector('#closeErrorBtn'),
            loadingText: this.container.querySelector('#loadingText')
        };
    }

    /**
     * Setup room client callbacks
     */
    setupCallbacks() {
        this.roomClient.onRoomStatusChange((status) => {
            this.state.status = status;
            this.updateRoomStatus(status);
        });

        this.roomClient.onQuestionSetReceived((questionSet) => {
            this.handleQuestionSetReceived(questionSet);
        });

        this.roomClient.onPlayersChange((players) => {
            this.state.players = players;
            this.renderPlayers(players);
        });

        this.roomClient.onScoresChange((scores) => {
            this.state.scores = scores;
            this.renderLeaderboard(scores);
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Create room
        this.elements.createRoomBtn.addEventListener('click', () => {
            this.handleCreateRoom();
        });

        // Join room
        this.elements.joinRoomBtn.addEventListener('click', () => {
            this.handleJoinRoom();
        });

        this.elements.roomIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleJoinRoom();
            }
        });

        // Convert input to uppercase
        this.elements.roomIdInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        // Copy room ID
        this.elements.copyRoomIdBtn.addEventListener('click', () => {
            this.copyRoomId();
        });

        // Start game (host only)
        this.elements.startGameBtn.addEventListener('click', () => {
            this.handleStartGame();
        });

        // End room (host only)
        this.elements.endRoomBtn.addEventListener('click', () => {
            this.handleEndRoom();
        });

        // Leave room
        this.elements.leaveRoomBtn.addEventListener('click', () => {
            this.handleLeaveRoom();
        });

        // Toggle panel
        this.elements.togglePanel.addEventListener('click', () => {
            this.togglePanel();
        });

        // Close error
        this.elements.closeErrorBtn.addEventListener('click', () => {
            this.hideError();
        });
    }

    /**
     * Handle create room
     */
    async handleCreateRoom() {
        try {
            this.showLoading('Creating room...');
            
            const gameMeta = this.gameAdapter.getGameMeta();
            const result = await this.roomClient.createRoom(gameMeta);
            
            this.state.inRoom = true;
            this.state.isHost = result.isHost;
            this.state.roomId = result.roomId;
            this.state.status = 'waiting';
            
            this.showRoomScreen();
            this.hideLoading();
            
        } catch (error) {
            this.hideLoading();
            this.showError(error.message);
        }
    }

    /**
     * Handle join room
     */
    async handleJoinRoom() {
        const roomId = this.elements.roomIdInput.value.trim().toUpperCase();
        
        if (!roomId) {
            this.showError('Please enter a room ID');
            return;
        }

        try {
            this.showLoading('Joining room...');
            
            const gameMeta = this.gameAdapter.getGameMeta();
            const result = await this.roomClient.joinRoom(roomId, gameMeta.gameId);
            
            // Check for game mismatch
            if (result.error === 'game_mismatch') {
                this.hideLoading();
                this.showError(`This room is for "${result.roomGameTitle}". Please join from the correct game page.`);
                return;
            }
            
            this.state.inRoom = true;
            this.state.isHost = result.isHost;
            this.state.roomId = result.roomId;
            this.state.status = result.meta.status;
            
            this.showRoomScreen();
            this.hideLoading();
            
        } catch (error) {
            this.hideLoading();
            this.showError(error.message);
        }
    }

    /**
     * Handle start game (host only)
     */
    async handleStartGame() {
        // Verify that only the host can start the game
        if (!this.state.isHost) {
            this.showError('Only the host can start the game');
            return;
        }

        try {
            this.showLoading('Starting game...');
            
            // Get game configuration (if game has a config UI)
            let config = {};
            if (typeof this.gameAdapter.getConfig === 'function') {
                config = this.gameAdapter.getConfig();
            }
            
            // Build question set
            const questionSet = this.gameAdapter.buildQuestionSet(config);
            
            // Publish to room
            await this.roomClient.publishQuestionSet(questionSet);
            
            // Start game locally for host
            const roomContext = {
                roomId: this.state.roomId,
                isHost: true
            };
            this.gameAdapter.startGameFromQuestionSet(questionSet, roomContext);
            
            this.hideLoading();
            
        } catch (error) {
            this.hideLoading();
            this.showError(error.message);
        }
    }

    /**
     * Handle question set received (for non-host players)
     */
    handleQuestionSetReceived(questionSet) {
        // Non-host players should start the game immediately when they receive the questionSet
        // Don't check status because the status update might arrive after the questionSet
        if (!this.state.isHost) {
            console.log('Non-host player starting game from questionSet');
            const roomContext = {
                roomId: this.state.roomId,
                isHost: false
            };
            this.gameAdapter.startGameFromQuestionSet(questionSet, roomContext);
        }
    }

    /**
     * Handle end room (host only)
     */
    async handleEndRoom() {
        if (!confirm('Are you sure you want to end this room?')) {
            return;
        }

        try {
            await this.roomClient.endRoom();
        } catch (error) {
            this.showError(error.message);
        }
    }

    /**
     * Handle leave room
     */
    async handleLeaveRoom() {
        try {
            await this.roomClient.leaveRoom();
            this.state.inRoom = false;
            this.state.isHost = false;
            this.state.roomId = null;
            this.state.status = 'idle';
            this.showLobbyScreen();
        } catch (error) {
            this.showError(error.message);
        }
    }

    /**
     * Update room status display
     */
    updateRoomStatus(status) {
        const statusMap = {
            'waiting': { text: 'Waiting', color: '#ffa500' },
            'playing': { text: 'Playing', color: '#4caf50' },
            'ended': { text: 'Ended', color: '#f44336' }
        };

        const statusInfo = statusMap[status] || statusMap['waiting'];
        this.elements.statusText.textContent = statusInfo.text;
        this.elements.statusIndicator.style.backgroundColor = statusInfo.color;

        // Update button visibility
        if (this.state.isHost) {
            if (status === 'waiting') {
                this.elements.startGameBtn.classList.remove('hidden');
                this.elements.endRoomBtn.classList.add('hidden');
            } else if (status === 'playing') {
                this.elements.startGameBtn.classList.add('hidden');
                this.elements.endRoomBtn.classList.remove('hidden');
            } else if (status === 'ended') {
                this.elements.startGameBtn.classList.add('hidden');
                this.elements.endRoomBtn.classList.add('hidden');
            }
        }
    }

    /**
     * Render players list
     */
    renderPlayers(players) {
        const playerArray = Object.entries(players).map(([uid, data]) => ({
            uid,
            ...data
        }));

        this.elements.playerCount.textContent = playerArray.length;

        this.elements.playersList.innerHTML = playerArray
            .sort((a, b) => a.joinedAt - b.joinedAt)
            .map(player => `
                <div class="player-item ${player.online ? 'online' : 'offline'}">
                    <span class="player-status">●</span>
                    <span class="player-name">${this.escapeHtml(player.name)}</span>
                    ${player.uid === this.roomClient.currentRoom?.meta.hostUid ? '<span class="host-badge">👑</span>' : ''}
                </div>
            `).join('');
    }

    /**
     * Render leaderboard
     */
    renderLeaderboard(scores) {
        if (Object.keys(scores).length === 0) {
            this.elements.leaderboardSection.classList.add('hidden');
            return;
        }

        this.elements.leaderboardSection.classList.remove('hidden');

        const scoreArray = Object.entries(scores).map(([uid, data]) => ({
            uid,
            ...data
        }));

        // Sort by score descending
        scoreArray.sort((a, b) => b.score - a.score);

        this.elements.leaderboard.innerHTML = scoreArray
            .map((item, index) => `
                <div class="leaderboard-item rank-${index + 1}">
                    <span class="rank">#${index + 1}</span>
                    <span class="player-name">${this.escapeHtml(item.name)}</span>
                    <span class="score">${item.score}</span>
                </div>
            `).join('');
    }

    /**
     * Copy room ID to clipboard
     */
    async copyRoomId() {
        try {
            await navigator.clipboard.writeText(this.state.roomId);
            this.elements.copyRoomIdBtn.textContent = '✓';
            setTimeout(() => {
                this.elements.copyRoomIdBtn.textContent = '📋';
            }, 2000);
        } catch (error) {
            this.showError('Failed to copy room ID');
        }
    }

    /**
     * Show lobby screen
     */
    showLobbyScreen() {
        this.elements.lobbyScreen.classList.remove('hidden');
        this.elements.roomScreen.classList.add('hidden');
        this.elements.roomIdInput.value = '';
    }

    /**
     * Show room screen
     */
    showRoomScreen() {
        this.elements.lobbyScreen.classList.add('hidden');
        this.elements.roomScreen.classList.remove('hidden');
        this.elements.displayRoomId.textContent = this.state.roomId;

        // Show/hide host controls
        if (this.state.isHost) {
            this.elements.startGameBtn.classList.remove('hidden');
        } else {
            this.elements.startGameBtn.classList.add('hidden');
            this.elements.endRoomBtn.classList.add('hidden');
        }
    }

    /**
     * Show loading indicator
     */
    showLoading(message = 'Loading...') {
        this.elements.loadingText.textContent = message;
        this.elements.loadingIndicator.classList.remove('hidden');
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        this.elements.loadingIndicator.classList.add('hidden');
    }

    /**
     * Show error message
     */
    showError(message) {
        this.elements.errorText.textContent = message;
        this.elements.errorMessage.classList.remove('hidden');
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }

    /**
     * Hide error message
     */
    hideError() {
        this.elements.errorMessage.classList.add('hidden');
    }

    /**
     * Toggle panel collapsed/expanded
     */
    togglePanel() {
        const content = this.container.querySelector('.multiplayer-content');
        const isCollapsed = content.style.display === 'none';
        
        content.style.display = isCollapsed ? 'block' : 'none';
        this.elements.togglePanel.textContent = isCollapsed ? '−' : '+';
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
     * Mount UI to a container element
     * @param {HTMLElement} target - Target container
     */
    mount(target) {
        target.appendChild(this.container);
    }

    /**
     * Get container element
     * @returns {HTMLElement}
     */
    getContainer() {
        return this.container;
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.RoomUI = RoomUI;
}
