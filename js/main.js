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
});

// Create game cards
function initializeGames() {
    const gamesGrid = document.getElementById('gamesGrid');
    
    games.forEach(game => {
        const gameCard = createGameCard(game);
        gamesGrid.appendChild(gameCard);
    });
}

// Initialize multiplayer UI
function initializeMultiplayer() {
    const mpUI = new MultiplayerUI('multiplayerContainer');
    
    // Set up callbacks for testing/demo purposes
    mpUI.onCreateRoom((playerName, gameConfig) => {
        console.log('Create room requested:', playerName, gameConfig);
        
        // Simulate room creation after 1 second
        setTimeout(() => {
            const mockRoomData = {
                roomId: 'TEST',
                maxPlayers: 4
            };
            
            const mockPlayers = {
                'player1': {
                    name: playerName,
                    isHost: true,
                    isReady: false
                }
            };
            
            mpUI.renderLobbyView(mockRoomData, mockPlayers, 'player1', true);
        }, 1000);
    });
    
    mpUI.onJoinRoom((roomCode, playerName) => {
        console.log('Join room requested:', roomCode, playerName);
        
        // Simulate joining room after 1 second
        setTimeout(() => {
            const mockRoomData = {
                roomId: roomCode,
                maxPlayers: 4
            };
            
            const mockPlayers = {
                'host123': {
                    name: 'Alice',
                    isHost: true,
                    isReady: false
                },
                'player2': {
                    name: playerName,
                    isHost: false,
                    isReady: false
                }
            };
            
            mpUI.renderLobbyView(mockRoomData, mockPlayers, 'player2', false);
        }, 1000);
    });
    
    mpUI.onToggleReady((isReady) => {
        console.log('Ready state changed:', isReady);
        
        // Update UI to reflect ready state
        const mockPlayers = {
            'host123': {
                name: 'Alice',
                isHost: true,
                isReady: false
            },
            'player2': {
                name: mpUI.playerName,
                isHost: false,
                isReady: isReady
            }
        };
        
        mpUI.updatePlayers(mockPlayers);
    });
    
    mpUI.onStartGame(() => {
        console.log('Start game requested');
        alert('Game starting! (Demo mode - Firebase not connected yet)');
    });
    
    mpUI.onLeaveRoom(() => {
        console.log('Leave room requested');
        if (confirm('Are you sure you want to leave the room?')) {
            mpUI.reset();
            mpUI.renderMenuView();
        }
    });
    
    // Make mpUI available globally for testing in console
    window.mpUI = mpUI;
    
    console.log('✅ Multiplayer UI initialized (Demo mode)');
    console.log('💡 You can test it by clicking the Multiplayer button');
    console.log('🔧 Access UI controls via window.mpUI in console');
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
