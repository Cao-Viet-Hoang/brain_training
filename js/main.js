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
});

// Create game cards
function initializeGames() {
    const gamesGrid = document.getElementById('gamesGrid');
    
    games.forEach(game => {
        const gameCard = createGameCard(game);
        gamesGrid.appendChild(gameCard);
    });
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
