// Game data configuration
const games = [
    {
        id: 'math',
        title: 'Quick Math',
        description: 'Practice calculation skills with basic operations',
        icon: '🔢',
        tag: 'Math',
        url: 'games/math-game.html'
    },
    {
        id: 'pixel',
        title: 'Pixel Number',
        description: 'Stack pixel cards to create target digits',
        icon: '🎮',
        tag: 'Logic',
        url: 'games/pixel-game.html'
    },
    {
        id: 'expression',
        title: 'Expression Puzzle',
        description: 'Fill numbers to make equations equal target values',
        icon: '🧮',
        tag: 'Puzzle',
        url: 'games/expression-puzzle.html'
    },
    {
        id: 'dual-n-back',
        title: 'Dual N-Back',
        description: 'Train working memory by tracking positions and letters',
        icon: '🔄',
        tag: 'Memory',
        url: 'games/dual-n-back.html'
    },
    {
        id: 'memory-matrix',
        title: 'Memory Matrix',
        description: 'Remember highlighted cells and tap them back',
        icon: '🔲',
        tag: 'Memory',
        url: 'games/memory-matrix.html'
    },
    {
        id: 'word-recall',
        title: 'Word Recall',
        description: 'Train verbal memory by memorizing and recalling English words',
        icon: '💭',
        tag: 'Memory',
        url: 'games/word-recall.html'
    },
    {
        id: 'memory',
        title: 'Memory Cards',
        description: 'Improve memory with image recognition exercises',
        icon: '🧩',
        tag: 'Memory',
        url: '#',
        comingSoon: true
    },
    {
        id: 'pattern',
        title: 'Pattern Recognition',
        description: 'Develop pattern recognition and logical reasoning',
        icon: '🎯',
        tag: 'Logic',
        url: '#',
        comingSoon: true
    },
    {
        id: 'word',
        title: 'Vocabulary',
        description: 'Expand vocabulary and language skills',
        icon: '📚',
        tag: 'Language',
        url: '#',
        comingSoon: true
    },
    {
        id: 'reaction',
        title: 'Reaction Speed',
        description: 'Increase reaction speed and concentration',
        icon: '⚡',
        tag: 'Speed',
        url: '#',
        comingSoon: true
    },
    {
        id: 'puzzle',
        title: 'Logic Puzzles',
        description: 'Challenge yourself with difficult logic puzzles',
        icon: '🔮',
        tag: 'Puzzle',
        url: '#',
        comingSoon: true
    }
];

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initializeGames();
    initializeMultiplayer();
    initializeRoomCleanup();
});

// Create game cards
function initializeGames() {
    const gamesGrid = document.getElementById('gamesGrid');
    
    games.forEach(game => {
        const gameCard = createGameCard(game);
        gamesGrid.appendChild(gameCard);
    });
}

// Initialize room cleanup
function initializeRoomCleanup() {
    if (typeof roomCleanup !== 'undefined') {
        // Start automatic cleanup (runs every 5 minutes)
        roomCleanup.startAutoCleanup();
        console.log('✅ Room cleanup service started');
    }
}

// Initialize multiplayer UI
async function initializeMultiplayer() {
    const mpUI = new MultiplayerUI('multiplayerContainer');
    const mpCore = new MultiplayerCore();

    // Set up callbacks
    mpUI.onCreateRoom(async (playerName, gameType, gameConfig) => {
        console.log('Create room requested:', playerName, 'Game:', gameType, gameConfig);
        
        try {
            const roomCode = await mpCore.createRoom(gameType, gameConfig, playerName);
            
            // Get initial room data
            const roomData = {
                roomId: roomCode,
                gameType: gameType,
                maxPlayers: gameConfig?.maxPlayers || MP_CONSTANTS.MAX_PLAYERS
            };
            
            const players = {
                [mpCore.getPlayerId()]: {
                    name: playerName,
                    isHost: true,
                    isReady: false
                }
            };
            
            mpUI.renderLobbyView(roomData, players, mpCore.getPlayerId(), true);
            
            // Listen for player changes
            mpCore.onPlayersChange((updatedPlayers) => {
                mpUI.updatePlayers(updatedPlayers);
            });
            
            // Listen for status changes (for players to auto-navigate)
            mpCore.onStatusChange((status) => {
                if (status === MP_CONSTANTS.ROOM_STATUS.PLAYING && !mpCore.isRoomHost()) {
                    console.log('🎮 Game starting, navigating to game...');
                    
                    // Store room info for player
                    sessionStorage.setItem('multiplayerRoomId', roomCode);
                    sessionStorage.setItem('multiplayerRole', 'player');
                    
                    // Get game URL based on gameType
                    const gameUrls = {
                        'math-game': 'games/math-game.html',
                        'pixel-game': 'games/pixel-game.html',
                        'expression-puzzle': 'games/expression-puzzle.html',
                        'dual-n-back': 'games/dual-n-back.html',
                        'memory-matrix': 'games/memory-matrix.html',
                        'word-recall': 'games/word-recall.html'
                    };
                    const gameUrl = gameUrls[gameType] || 'games/math-game.html';
                    window.location.href = gameUrl;
                }
            });
            
        } catch (error) {
            console.error('Error creating room:', error);
            mpUI.showError(error.message || 'Failed to create room');
        }
    });
    
    mpUI.onJoinRoom(async (roomCode, playerName) => {
        console.log('Join room requested:', roomCode, playerName);
        
        try {
            const roomData = await mpCore.joinRoom(roomCode, playerName);
            
            const lobbyData = {
                roomId: roomCode,
                gameType: roomData.meta.gameType,
                maxPlayers: roomData.meta.maxPlayers
            };
            
            mpUI.renderLobbyView(lobbyData, roomData.players, mpCore.getPlayerId(), false);
            
            // Listen for player changes
            mpCore.onPlayersChange((updatedPlayers) => {
                mpUI.updatePlayers(updatedPlayers);
            });
            
            // Listen for status changes (for players to auto-navigate)
            mpCore.onStatusChange((status) => {
                if (status === MP_CONSTANTS.ROOM_STATUS.PLAYING && !mpCore.isRoomHost()) {
                    console.log('🎮 Game starting, navigating to game...');

                    // Store room info for player
                    sessionStorage.setItem('multiplayerRoomId', roomCode);
                    sessionStorage.setItem('multiplayerRole', 'player');

                    // Get game URL based on gameType from room data
                    const gameType = roomData.meta.gameType;
                    const gameUrls = {
                        'math-game': 'games/math-game.html',
                        'pixel-game': 'games/pixel-game.html',
                        'expression-puzzle': 'games/expression-puzzle.html',
                        'dual-n-back': 'games/dual-n-back.html',
                        'memory-matrix': 'games/memory-matrix.html',
                        'word-recall': 'games/word-recall.html'
                    };
                    const gameUrl = gameUrls[gameType] || 'games/math-game.html';
                    window.location.href = gameUrl;
                }
            });
            
            // Listen for room closed event
            mpCore.onRoomClosed(() => {
                console.log('⚠️ Room closed by host');
                mpUI.reset();
                alert('The host has left and closed the room. You have been disconnected.');
                mpUI.renderMenuView();
            });
            
        } catch (error) {
            console.error('Error joining room:', error);
            mpUI.showError(error.message || 'Failed to join room');
        }
    });
    
    mpUI.onToggleReady(async (isReady) => {
        console.log('Ready state changed:', isReady);
        
        try {
            await mpCore.setPlayerReady(isReady);
        } catch (error) {
            console.error('Error setting ready state:', error);
        }
    });
    
    mpUI.onStartGame(async () => {
        console.log('Start game requested');
        
        try {
            await mpCore.setRoomStatus(MP_CONSTANTS.ROOM_STATUS.PLAYING);
            alert('Game starting! (Phase 2 - Room management complete. Game integration in later phases)');
        } catch (error) {
            console.error('Error starting game:', error);
            alert('Failed to start game: ' + error.message);
        }
    });
    
    mpUI.onLeaveRoom(async () => {
        console.log('Leave room requested');
        
        if (confirm('Are you sure you want to leave the room?')) {
            try {
                await mpCore.leaveRoom();
                mpUI.reset();
                mpUI.renderMenuView();
            } catch (error) {
                console.error('Error leaving room:', error);
            }
        }
    });
    
    // Make instances available globally for testing in console
    window.mpUI = mpUI;
    window.mpCore = mpCore;
    
    console.log('✅ Multiplayer system initialized (Phase 2 - Firebase connected)');
    console.log('💡 Click the Multiplayer button to test');
    console.log('🔧 Access controls via window.mpUI and window.mpCore in console');
}

// Create individual game card
function createGameCard(game) {
    const card = document.createElement('a');
    card.className = 'game-card';
    card.href = game.url;
    
    if (game.comingSoon) {
        card.style.opacity = '0.6';
        card.style.cursor = 'not-allowed';
        card.onclick = (e) => {
            e.preventDefault();
            alert('This game is coming soon! 🎮');
        };
    }
    
    card.innerHTML = `
        <div class="game-icon">${game.icon}</div>
        <h3>${game.title}</h3>
        <p>${game.description}</p>
        <span class="game-tag">${game.tag}</span>
        ${game.comingSoon ? '<span class="game-tag" style="background: #FFB4A2; margin-left: 0.5rem;">Coming Soon</span>' : ''}
    `;
    
    return card;
}
