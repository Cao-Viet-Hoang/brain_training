/**
 * Multiplayer UI Manager
 * Handles all UI rendering and interactions for multiplayer feature
 */
class MultiplayerUI {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentView = 'menu'; // menu | create | join | lobby
        this.isMinimized = false;
        this.isOpen = false;

        // State
        this.roomData = null;
        this.players = {};
        this.currentPlayerId = null;
        this.isHost = false;
        this.isReady = false;
        this.playerName = '';

        // Callbacks
        this.callbacks = {
            onCreateRoom: null,
            onJoinRoom: null,
            onLeaveRoom: null,
            onToggleReady: null,
            onStartGame: null
        };

        this.init();
    }

    init() {
        this.injectHTML();
        this.cacheElements();
        this.bindEvents();
    }

    injectHTML() {
        const html = `
            <!-- Multiplayer FAB Button -->
            <button id="multiplayerFab" class="multiplayer-fab">
                <span class="fab-icon">👥</span>
                <span class="fab-text">Multiplayer</span>
            </button>

            <!-- Multiplayer Modal -->
            <div id="multiplayerModal" class="multiplayer-modal">
                <div class="multiplayer-modal-content">
                    <div class="mp-modal-header">
                        <h3 id="mpModalTitle">👥 Multiplayer</h3>
                        <div class="mp-modal-actions">
                            <button id="mpMinimizeBtn" title="Minimize">−</button>
                            <button id="mpCloseBtn" title="Close">×</button>
                        </div>
                    </div>
                    <div class="mp-modal-body" id="mpModalBody">
                        <!-- Dynamic content rendered here -->
                    </div>
                </div>
            </div>

            <!-- Minimized Popup -->
            <div id="multiplayerPopup" class="multiplayer-popup">
                <div class="mp-popup-header" id="mpPopupHeader">
                    <div class="mp-popup-info">
                        <span class="mp-popup-room" id="mpPopupRoom">XXXX</span>
                        <span class="mp-popup-players" id="mpPopupPlayers">0/4 players</span>
                    </div>
                    <button class="mp-popup-expand">↑</button>
                </div>
            </div>
        `;
        this.container.innerHTML = html;
    }

    cacheElements() {
        this.fab = document.getElementById('multiplayerFab');
        this.modal = document.getElementById('multiplayerModal');
        this.modalBody = document.getElementById('mpModalBody');
        this.modalTitle = document.getElementById('mpModalTitle');
        this.minimizeBtn = document.getElementById('mpMinimizeBtn');
        this.closeBtn = document.getElementById('mpCloseBtn');
        this.popup = document.getElementById('multiplayerPopup');
        this.popupHeader = document.getElementById('mpPopupHeader');
    }

    bindEvents() {
        // FAB click
        this.fab.addEventListener('click', () => this.openModal());

        // Modal controls
        this.minimizeBtn.addEventListener('click', () => this.minimize());
        this.closeBtn.addEventListener('click', () => this.closeModal());

        // Click outside modal to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal && this.currentView === 'menu') {
                this.closeModal();
            }
        });

        // Popup click to expand
        this.popupHeader.addEventListener('click', () => this.maximize());
    }

    // ==================== VIEW RENDERING ====================

    renderMenuView() {
        this.currentView = 'menu';
        this.modalTitle.textContent = '👥 Multiplayer';

        this.modalBody.innerHTML = `
            <div class="mp-menu">
                <button class="mp-menu-btn" id="mpCreateRoomBtn">
                    <span class="icon">🏠</span>
                    <div class="text">
                        <h4>Create Room</h4>
                        <p>Start a new game room and invite friends</p>
                    </div>
                </button>
                <button class="mp-menu-btn" id="mpJoinRoomBtn">
                    <span class="icon">🚪</span>
                    <div class="text">
                        <h4>Join Room</h4>
                        <p>Enter a room code to join an existing game</p>
                    </div>
                </button>
            </div>
        `;

        document.getElementById('mpCreateRoomBtn').addEventListener('click', () => {
            this.renderCreateRoomView();
        });

        document.getElementById('mpJoinRoomBtn').addEventListener('click', () => {
            this.renderJoinRoomView();
        });
    }

    renderCreateRoomView(gameConfig = {}) {
        this.currentView = 'create';
        this.modalTitle.textContent = '🏠 Create Room';

        this.modalBody.innerHTML = `
            <div class="mp-form">
                <div class="mp-form-group">
                    <label for="mpPlayerName">Your Name</label>
                    <input type="text" id="mpPlayerName" placeholder="Enter your name"
                           maxlength="20" value="${this.playerName}">
                </div>

                <div class="mp-form-actions">
                    <button class="mp-btn-secondary" id="mpBackBtn">Back</button>
                    <button class="mp-btn-primary" id="mpCreateBtn">Create Room</button>
                </div>
            </div>
        `;

        const nameInput = document.getElementById('mpPlayerName');
        const createBtn = document.getElementById('mpCreateBtn');

        // Validate
        const validate = () => {
            createBtn.disabled = nameInput.value.trim().length < 2;
        };
        nameInput.addEventListener('input', validate);
        validate();

        document.getElementById('mpBackBtn').addEventListener('click', () => {
            this.renderMenuView();
        });

        createBtn.addEventListener('click', () => {
            this.playerName = nameInput.value.trim();
            this.showLoading('Creating room...');
            this.callbacks.onCreateRoom?.(this.playerName, gameConfig);
        });
    }

    renderJoinRoomView() {
        this.currentView = 'join';
        this.modalTitle.textContent = '🚪 Join Room';

        this.modalBody.innerHTML = `
            <div class="mp-form">
                <div class="mp-form-group">
                    <label for="mpRoomCode">Room Code</label>
                    <input type="text" id="mpRoomCode" class="room-code-input"
                           placeholder="XXXX" maxlength="6">
                </div>

                <div class="mp-form-group">
                    <label for="mpPlayerNameJoin">Your Name</label>
                    <input type="text" id="mpPlayerNameJoin" placeholder="Enter your name"
                           maxlength="20" value="${this.playerName}">
                </div>

                <div class="mp-form-actions">
                    <button class="mp-btn-secondary" id="mpBackBtn">Back</button>
                    <button class="mp-btn-primary" id="mpJoinBtn" disabled>Join Room</button>
                </div>
            </div>
        `;

        const codeInput = document.getElementById('mpRoomCode');
        const nameInput = document.getElementById('mpPlayerNameJoin');
        const joinBtn = document.getElementById('mpJoinBtn');

        // Auto uppercase and validate
        const validate = () => {
            const code = codeInput.value.trim();
            const name = nameInput.value.trim();
            joinBtn.disabled = code.length < 4 || name.length < 2;
        };

        codeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            validate();
        });
        nameInput.addEventListener('input', validate);

        document.getElementById('mpBackBtn').addEventListener('click', () => {
            this.renderMenuView();
        });

        joinBtn.addEventListener('click', () => {
            const roomCode = codeInput.value.trim();
            this.playerName = nameInput.value.trim();
            this.showLoading('Joining room...');
            this.callbacks.onJoinRoom?.(roomCode, this.playerName);
        });
    }

    renderLobbyView(roomData, players, currentPlayerId, isHost) {
        this.currentView = 'lobby';
        this.roomData = roomData;
        this.players = players;
        this.currentPlayerId = currentPlayerId;
        this.isHost = isHost;

        this.modalTitle.textContent = '🎮 Game Lobby';

        const playerCount = Object.keys(players).length;
        const maxPlayers = roomData.maxPlayers || 4;
        const currentPlayer = players[currentPlayerId] || {};
        this.isReady = currentPlayer.isReady || false;

        const allReady = Object.values(players).every(p => p.isReady || p.isHost);
        const canStart = isHost && allReady && playerCount >= 2;

        this.modalBody.innerHTML = `
            <div class="mp-lobby">
                <!-- Room Info -->
                <div class="mp-room-info">
                    <div class="mp-room-code">
                        <span class="label">Room Code</span>
                        <span class="code">${roomData.roomId}</span>
                    </div>
                    <button class="mp-copy-btn" id="mpCopyCode">
                        📋 Copy
                    </button>
                </div>

                <!-- Players List -->
                <div class="mp-players">
                    <div class="mp-players-header">
                        <h4>Players</h4>
                        <span class="mp-players-count">${playerCount}/${maxPlayers}</span>
                    </div>
                    <div class="mp-players-list" id="mpPlayersList">
                        ${this.renderPlayersList(players, currentPlayerId)}
                    </div>
                </div>

                <!-- Actions -->
                <div class="mp-lobby-actions">
                    ${isHost ? `
                        <button class="mp-start-btn" id="mpStartBtn" ${!canStart ? 'disabled' : ''}>
                            🚀 Start Game
                        </button>
                    ` : `
                        <button class="mp-ready-btn ${this.isReady ? 'is-ready' : 'not-ready'}" id="mpReadyBtn">
                            ${this.isReady ? '⏳ Cancel Ready' : '✅ Ready'}
                        </button>
                    `}
                    <button class="mp-leave-btn" id="mpLeaveBtn">Leave Room</button>
                </div>
            </div>
        `;

        // Bind events
        document.getElementById('mpCopyCode').addEventListener('click', () => {
            navigator.clipboard.writeText(roomData.roomId);
            const btn = document.getElementById('mpCopyCode');
            btn.textContent = '✅ Copied!';
            setTimeout(() => btn.innerHTML = '📋 Copy', 2000);
        });

        if (isHost) {
            document.getElementById('mpStartBtn')?.addEventListener('click', () => {
                this.callbacks.onStartGame?.();
            });
        } else {
            document.getElementById('mpReadyBtn')?.addEventListener('click', () => {
                this.isReady = !this.isReady;
                this.callbacks.onToggleReady?.(this.isReady);
            });
        }

        document.getElementById('mpLeaveBtn').addEventListener('click', () => {
            this.callbacks.onLeaveRoom?.();
        });

        // Update FAB state
        this.fab.classList.add('in-room');

        // Update popup info
        this.updatePopupInfo(roomData.roomId, playerCount, maxPlayers);
    }

    renderPlayersList(players, currentPlayerId) {
        return Object.entries(players).map(([id, player]) => {
            const isYou = id === currentPlayerId;
            const isReady = player.isReady;
            const isHost = player.isHost;

            return `
                <div class="mp-player-item ${isYou ? 'is-you' : ''} ${isReady ? 'is-ready' : ''}"
                     data-player-id="${id}">
                    <div class="mp-player-info">
                        <div class="mp-player-avatar">${player.name.charAt(0).toUpperCase()}</div>
                        <span class="mp-player-name">
                            ${player.name}
                            ${isHost ? '<span class="host-badge">👑</span>' : ''}
                            ${isYou ? '<span class="you-badge">YOU</span>' : ''}
                        </span>
                    </div>
                    <span class="mp-player-status ${isReady || isHost ? 'ready' : 'waiting'}">
                        ${isHost ? 'Host' : (isReady ? 'Ready' : 'Waiting')}
                    </span>
                </div>
            `;
        }).join('');
    }

    // ==================== UI STATE METHODS ====================

    showLoading(message = 'Loading...') {
        this.modalBody.innerHTML = `
            <div class="mp-loading">
                <div class="mp-spinner"></div>
                <p>${message}</p>
            </div>
        `;
    }

    showError(message) {
        this.modalBody.innerHTML = `
            <div class="mp-error" style="text-align: center; padding: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                <p style="color: var(--accent-color); margin-bottom: 1rem;">${message}</p>
                <button class="mp-btn-secondary" id="mpErrorBack">Go Back</button>
            </div>
        `;
        document.getElementById('mpErrorBack').addEventListener('click', () => {
            this.renderMenuView();
        });
    }

    openModal() {
        this.isOpen = true;
        this.modal.classList.add('active');
        this.popup.classList.remove('active');

        if (this.currentView === 'lobby' && this.roomData) {
            this.renderLobbyView(this.roomData, this.players, this.currentPlayerId, this.isHost);
        } else if (!this.roomData) {
            this.renderMenuView();
        }
    }

    closeModal() {
        if (this.currentView === 'lobby') {
            // Can't close while in lobby, minimize instead
            this.minimize();
        } else {
            this.isOpen = false;
            this.modal.classList.remove('active');
        }
    }

    minimize() {
        this.isMinimized = true;
        this.isOpen = false;
        this.modal.classList.remove('active');
        if (this.roomData) {
            this.popup.classList.add('active');
        }
    }

    maximize() {
        this.isMinimized = false;
        this.openModal();
    }

    updatePopupInfo(roomCode, playerCount, maxPlayers) {
        document.getElementById('mpPopupRoom').textContent = roomCode;
        document.getElementById('mpPopupPlayers').textContent = `${playerCount}/${maxPlayers} players`;
    }

    // ==================== UPDATE METHODS ====================

    updatePlayers(players) {
        this.players = players;
        if (this.currentView === 'lobby') {
            const listEl = document.getElementById('mpPlayersList');
            if (listEl) {
                listEl.innerHTML = this.renderPlayersList(players, this.currentPlayerId);
            }

            // Update player count
            const playerCount = Object.keys(players).length;
            const maxPlayers = this.roomData?.maxPlayers || 4;
            const countEl = document.querySelector('.mp-players-count');
            if (countEl) {
                countEl.textContent = `${playerCount}/${maxPlayers}`;
            }

            // Update start button state
            if (this.isHost) {
                const allReady = Object.values(players).every(p => p.isReady || p.isHost);
                const canStart = allReady && playerCount >= 2;
                const startBtn = document.getElementById('mpStartBtn');
                if (startBtn) {
                    startBtn.disabled = !canStart;
                }
            }

            // Update popup
            this.updatePopupInfo(this.roomData.roomId, playerCount, maxPlayers);
        }
    }

    reset() {
        this.currentView = 'menu';
        this.roomData = null;
        this.players = {};
        this.isHost = false;
        this.isReady = false;
        this.fab.classList.remove('in-room');
        this.popup.classList.remove('active');
        this.closeModal();
    }

    // ==================== CALLBACK SETTERS ====================

    onCreateRoom(callback) { this.callbacks.onCreateRoom = callback; }
    onJoinRoom(callback) { this.callbacks.onJoinRoom = callback; }
    onLeaveRoom(callback) { this.callbacks.onLeaveRoom = callback; }
    onToggleReady(callback) { this.callbacks.onToggleReady = callback; }
    onStartGame(callback) { this.callbacks.onStartGame = callback; }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiplayerUI;
}
