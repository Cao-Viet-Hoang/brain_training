// ============================================================================
// ROOM LOBBY CONTROLLER
// Manages the multiplayer room lobby interface
// ============================================================================

// Available games configuration
const AVAILABLE_GAMES = [
    {
        id: 'math-game',
        title: 'Quick Math',
        description: 'Practice calculation skills with basic operations',
        icon: '🔢',
        tag: 'Math',
        url: 'games/math-game.html',
        available: true
    },
    {
        id: 'memory-matrix',
        title: 'Memory Matrix',
        description: 'Remember highlighted cells and tap them back',
        icon: '🔲',
        tag: 'Memory',
        url: 'games/memory-matrix.html',
        available: true
    },
    {
        id: 'word-recall',
        title: 'Word Recall',
        description: 'Train verbal memory by memorizing and recalling English words',
        icon: '💭',
        tag: 'Memory',
        url: 'games/word-recall.html',
        available: true
    },
    {
        id: 'expression-puzzle',
        title: 'Expression Puzzle',
        description: 'Fill numbers to make equations equal target values',
        icon: '🧮',
        tag: 'Puzzle',
        url: 'games/expression-puzzle.html',
        available: true
    },
    {
        id: 'dual-n-back',
        title: 'Dual N-Back',
        description: 'Train working memory by tracking positions and letters',
        icon: '🔄',
        tag: 'Memory',
        url: 'games/dual-n-back.html',
        available: true
    }
];

class RoomLobby {
    constructor() {
        this.firebaseClient = null;
        this.roomClient = null;
        this.state = {
            inRoom: false,
            isHost: false,
            roomId: null,
            status: 'idle', // idle, lobby, waiting, playing, ended
            selectedGame: null,
            players: {},
            scores: {}
        };
        this.elements = {};
        
        this.init();
    }

    async init() {
        this.cacheElements();
        this.setupEventListeners();
        await this.initializeFirebase();
    }

    cacheElements() {
        this.elements = {
            // Screens
            lobbyScreen: document.getElementById('lobbyScreen'),
            roomScreen: document.getElementById('roomScreen'),
            
            // Lobby elements
            createRoomBtn: document.getElementById('createRoomBtn'),
            roomIdInput: document.getElementById('roomIdInput'),
            joinRoomBtn: document.getElementById('joinRoomBtn'),
            
            // Room elements
            displayRoomId: document.getElementById('displayRoomId'),
            copyRoomIdBtn: document.getElementById('copyRoomIdBtn'),
            statusIndicator: document.getElementById('statusIndicator'),
            statusText: document.getElementById('statusText'),
            
            // Game selection
            gameSelectionSection: document.getElementById('gameSelectionSection'),
            gamesGrid: document.getElementById('gamesGrid'),
            
            // Game config
            gameConfigSection: document.getElementById('gameConfigSection'),
            selectedGameIcon: document.getElementById('selectedGameIcon'),
            selectedGameTitle: document.getElementById('selectedGameTitle'),
            selectedGameDescription: document.getElementById('selectedGameDescription'),
            gameConfigContainer: document.getElementById('gameConfigContainer'),
            
            // Players
            playerCount: document.getElementById('playerCount'),
            playersList: document.getElementById('playersList'),
            
            // Leaderboard
            leaderboardSection: document.getElementById('leaderboardSection'),
            leaderboard: document.getElementById('leaderboard'),
            
            // Actions
            startGameBtn: document.getElementById('startGameBtn'),
            endRoomBtn: document.getElementById('endRoomBtn'),
            leaveRoomBtn: document.getElementById('leaveRoomBtn'),
            
            // Loading & Error
            loadingIndicator: document.getElementById('loadingIndicator'),
            loadingText: document.getElementById('loadingText'),
            errorMessage: document.getElementById('errorMessage'),
            errorText: document.getElementById('errorText'),
            closeErrorBtn: document.getElementById('closeErrorBtn')
        };
    }

    setupEventListeners() {
        // Lobby actions
        this.elements.createRoomBtn.addEventListener('click', () => this.handleCreateRoom());
        this.elements.joinRoomBtn.addEventListener('click', () => this.handleJoinRoom());
        this.elements.roomIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleJoinRoom();
        });
        this.elements.roomIdInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
        
        // Room actions
        this.elements.copyRoomIdBtn.addEventListener('click', () => this.copyRoomId());
        this.elements.startGameBtn.addEventListener('click', () => this.handleStartGame());
        this.elements.endRoomBtn.addEventListener('click', () => this.handleEndRoom());
        this.elements.leaveRoomBtn.addEventListener('click', () => this.handleLeaveRoom());
        
        // Error close
        this.elements.closeErrorBtn.addEventListener('click', () => this.hideError());
    }

    async initializeFirebase() {
        try {
            if (!window.firebaseConfig) {
                throw new Error('Firebase config not found');
            }

            this.showLoading('Connecting to server...');

            // Initialize Firebase
            await firebaseClient.initialize(window.firebaseConfig);
            
            // Sign in anonymously
            const savedName = localStorage.getItem('playerDisplayName');
            await firebaseClient.signInAnonymously(savedName);

            // Create room client
            this.roomClient = new RoomClient(firebaseClient);

            // Setup callbacks
            this.setupRoomCallbacks();

            this.hideLoading();
            console.log('Firebase initialized successfully');

        } catch (error) {
            this.hideLoading();
            this.showError('Failed to connect: ' + error.message);
            console.error('Firebase initialization error:', error);
        }
    }

    setupRoomCallbacks() {
        this.roomClient.onRoomStatusChange((status) => {
            this.state.status = status;
            this.updateRoomStatus(status);
        });

        this.roomClient.onGameMetaChange((meta) => {
            if (meta.gameId && meta.gameId !== this.state.selectedGame) {
                // Game was selected by host
                const game = AVAILABLE_GAMES.find(g => g.id === meta.gameId);
                if (game) {
                    this.state.selectedGame = meta.gameId;
                    this.showGameConfig(game);
                }
            }
        });

        this.roomClient.onPlayersChange((players) => {
            this.state.players = players;
            this.renderPlayers(players);
        });

        this.roomClient.onScoresChange((scores) => {
            this.state.scores = scores;
            this.renderLeaderboard(scores);
        });

        this.roomClient.onQuestionSetReceived((questionSet) => {
            // Redirect to game page with room context
            if (this.state.selectedGame) {
                const game = AVAILABLE_GAMES.find(g => g.id === this.state.selectedGame);
                if (game) {
                    const url = `${game.url}?roomId=${this.state.roomId}&multiplayer=true`;
                    window.location.href = url;
                }
            }
        });
    }

    // ========================================================================
    // ROOM ACTIONS
    // ========================================================================

    async handleCreateRoom() {
        try {
            this.showLoading('Creating room...');
            
            const result = await this.roomClient.createRoom();
            
            this.state.inRoom = true;
            this.state.isHost = result.isHost;
            this.state.roomId = result.roomId;
            this.state.status = 'lobby';
            
            this.showRoomScreen();
            this.renderGames();
            this.hideLoading();
            
        } catch (error) {
            this.hideLoading();
            this.showError(error.message);
        }
    }

    async handleJoinRoom() {
        const roomId = this.elements.roomIdInput.value.trim().toUpperCase();
        
        if (!roomId) {
            this.showError('Please enter a room ID');
            return;
        }

        try {
            this.showLoading('Joining room...');
            
            const result = await this.roomClient.joinRoom(roomId);
            
            if (result.error) {
                this.hideLoading();
                this.showError(result.message);
                return;
            }
            
            this.state.inRoom = true;
            this.state.isHost = result.isHost;
            this.state.roomId = result.roomId;
            this.state.status = result.meta.status;
            
            // If game already selected, show config
            if (result.meta.gameId) {
                const game = AVAILABLE_GAMES.find(g => g.id === result.meta.gameId);
                if (game) {
                    this.state.selectedGame = result.meta.gameId;
                    this.showGameConfig(game);
                }
            }
            
            this.showRoomScreen();
            this.hideLoading();
            
        } catch (error) {
            this.hideLoading();
            this.showError(error.message);
        }
    }

    async handleLeaveRoom() {
        try {
            await this.roomClient.leaveRoom();
            this.resetState();
            this.showLobbyScreen();
        } catch (error) {
            this.showError(error.message);
        }
    }

    async handleEndRoom() {
        if (!confirm('Are you sure you want to end this room?')) {
            return;
        }

        try {
            await this.roomClient.endRoom();
            this.resetState();
            this.showLobbyScreen();
        } catch (error) {
            this.showError(error.message);
        }
    }

    async handleStartGame() {
        if (!this.state.isHost) {
            this.showError('Only the host can start the game');
            return;
        }

        if (!this.state.selectedGame) {
            this.showError('Please select a game first');
            return;
        }

        try {
            this.showLoading('Starting game...');
            
            // Get selected game
            const game = AVAILABLE_GAMES.find(g => g.id === this.state.selectedGame);
            if (!game) {
                throw new Error('Game not found');
            }

            // Create game metadata
            const gameMeta = {
                gameId: game.id,
                version: '1.0',
                title: game.title
            };

            // If room doesn't have game set yet (status = lobby), set it
            if (this.state.status === 'lobby') {
                await this.roomClient.setRoomGame(gameMeta);
            }

            // Build basic question set (game-specific logic will be on game page)
            const questionSet = {
                timestamp: Date.now(),
                gameId: game.id
            };

            // Publish question set
            await this.roomClient.publishQuestionSet(questionSet);

            // Redirect to game page
            const url = `${game.url}?roomId=${this.state.roomId}&multiplayer=true&isHost=true`;
            window.location.href = url;
            
        } catch (error) {
            this.hideLoading();
            this.showError(error.message);
        }
    }

    // ========================================================================
    // GAME SELECTION
    // ========================================================================

    renderGames() {
        if (!this.state.isHost) {
            this.elements.gameSelectionSection.classList.add('hidden');
            return;
        }

        this.elements.gamesGrid.innerHTML = AVAILABLE_GAMES
            .filter(game => game.available)
            .map(game => `
                <div class="game-card-small ${game.id === this.state.selectedGame ? 'selected' : ''}" 
                     data-game-id="${game.id}">
                    <div class="game-icon">${game.icon}</div>
                    <div class="game-title">${game.title}</div>
                    <div class="game-tag">${game.tag}</div>
                </div>
            `).join('');

        // Add click listeners
        this.elements.gamesGrid.querySelectorAll('.game-card-small').forEach(card => {
            card.addEventListener('click', () => {
                const gameId = card.dataset.gameId;
                const game = AVAILABLE_GAMES.find(g => g.id === gameId);
                if (game) {
                    this.selectGame(game);
                }
            });
        });
    }

    selectGame(game) {
        if (!this.state.isHost) return;

        this.state.selectedGame = game.id;
        
        // Update UI
        this.renderGames();
        this.showGameConfig(game);
    }

    showGameConfig(game) {
        this.elements.gameSelectionSection.classList.add('hidden');
        this.elements.gameConfigSection.classList.remove('hidden');
        
        this.elements.selectedGameIcon.textContent = game.icon;
        this.elements.selectedGameTitle.textContent = game.title;
        this.elements.selectedGameDescription.textContent = game.description;
        
        // Show start button for host
        if (this.state.isHost) {
            this.elements.startGameBtn.classList.remove('hidden');
        }
        
        // Simple config message for now
        this.elements.gameConfigContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #6b7280;">
                <p>Game will be configured on the game page</p>
                <p style="margin-top: 0.5rem;">Click "Start Game" when ready</p>
            </div>
        `;
    }

    // ========================================================================
    // RENDERING
    // ========================================================================

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

    updateRoomStatus(status) {
        const statusMap = {
            'lobby': { text: 'Lobby', color: '#3b82f6' },
            'waiting': { text: 'Waiting', color: '#ffa500' },
            'playing': { text: 'Playing', color: '#10b981' },
            'ended': { text: 'Ended', color: '#ef4444' }
        };

        const statusInfo = statusMap[status] || statusMap['lobby'];
        this.elements.statusText.textContent = statusInfo.text;
        this.elements.statusIndicator.style.backgroundColor = statusInfo.color;

        // Update UI based on status
        if (this.state.isHost) {
            if (status === 'lobby') {
                this.elements.gameSelectionSection.classList.remove('hidden');
                this.elements.startGameBtn.classList.add('hidden');
                this.elements.endRoomBtn.classList.add('hidden');
            } else if (status === 'waiting') {
                if (this.state.selectedGame) {
                    this.elements.startGameBtn.classList.remove('hidden');
                }
                this.elements.endRoomBtn.classList.add('hidden');
            } else if (status === 'playing') {
                this.elements.startGameBtn.classList.add('hidden');
                this.elements.endRoomBtn.classList.remove('hidden');
            }
        }
    }

    // ========================================================================
    // UI HELPERS
    // ========================================================================

    showLobbyScreen() {
        this.elements.lobbyScreen.classList.remove('hidden');
        this.elements.roomScreen.classList.add('hidden');
        this.elements.roomIdInput.value = '';
    }

    showRoomScreen() {
        this.elements.lobbyScreen.classList.add('hidden');
        this.elements.roomScreen.classList.remove('hidden');
        this.elements.displayRoomId.textContent = this.state.roomId;

        // Show/hide sections based on role
        if (this.state.isHost && this.state.status === 'lobby') {
            this.elements.gameSelectionSection.classList.remove('hidden');
        } else {
            this.elements.gameSelectionSection.classList.add('hidden');
        }

        if (!this.state.isHost) {
            this.elements.startGameBtn.classList.add('hidden');
            this.elements.endRoomBtn.classList.add('hidden');
        }
    }

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

    showLoading(message = 'Loading...') {
        this.elements.loadingText.textContent = message;
        this.elements.loadingIndicator.classList.remove('hidden');
    }

    hideLoading() {
        this.elements.loadingIndicator.classList.add('hidden');
    }

    showError(message) {
        this.elements.errorText.textContent = message;
        this.elements.errorMessage.classList.remove('hidden');
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }

    hideError() {
        this.elements.errorMessage.classList.add('hidden');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    resetState() {
        this.state = {
            inRoom: false,
            isHost: false,
            roomId: null,
            status: 'idle',
            selectedGame: null,
            players: {},
            scores: {}
        };
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.roomLobby = new RoomLobby();
});
