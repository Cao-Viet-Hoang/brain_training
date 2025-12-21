// Pixel Number Game Logic

// Constants
const GRID_WIDTH = 5;
const GRID_HEIGHT = 7;
const PIXEL_SIZE = 20;
const PIXEL_GAP = 2;

// Digit Masks (5x7 pixel grid for digits 0-9)
const DIGIT_MASKS = {
    0: [
        [1,1,1,1,1],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [1,1,1,1,1]
    ],
    1: [
        [0,0,1,0,0],
        [0,1,1,0,0],
        [0,0,1,0,0],
        [0,0,1,0,0],
        [0,0,1,0,0],
        [0,0,1,0,0],
        [0,1,1,1,0]
    ],
    2: [
        [0,1,1,1,0],
        [1,0,0,0,1],
        [0,0,0,0,1],
        [0,0,0,1,0],
        [0,0,1,0,0],
        [0,1,0,0,0],
        [1,1,1,1,1]
    ],
    3: [
        [1,1,1,1,0],
        [0,0,0,0,1],
        [0,0,0,0,1],
        [0,1,1,1,0],
        [0,0,0,0,1],
        [0,0,0,0,1],
        [1,1,1,1,0]
    ],
    4: [
        [0,0,0,1,0],
        [0,0,1,1,0],
        [0,1,0,1,0],
        [1,0,0,1,0],
        [1,1,1,1,1],
        [0,0,0,1,0],
        [0,0,0,1,0]
    ],
    5: [
        [1,1,1,1,1],
        [1,0,0,0,0],
        [1,0,0,0,0],
        [1,1,1,1,0],
        [0,0,0,0,1],
        [0,0,0,0,1],
        [1,1,1,1,0]
    ],
    6: [
        [0,1,1,1,0],
        [1,0,0,0,0],
        [1,0,0,0,0],
        [1,1,1,1,0],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [0,1,1,1,0]
    ],
    7: [
        [1,1,1,1,1],
        [0,0,0,0,1],
        [0,0,0,1,0],
        [0,0,1,0,0],
        [0,1,0,0,0],
        [0,1,0,0,0],
        [0,1,0,0,0]
    ],
    8: [
        [0,1,1,1,0],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [0,1,1,1,0],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [0,1,1,1,0]
    ],
    9: [
        [0,1,1,1,0],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [0,1,1,1,1],
        [0,0,0,0,1],
        [0,0,0,0,1],
        [0,1,1,1,0]
    ]
};

// Main Game Class
class PixelNumberGame {
    constructor() {
        this.config = {
            gameMode: 'single',
            cardCount: 15,
            targetCount: 3,
            roundTimeLimit: 300,
            answerTimeLimit: 10,
            penaltyMode: 'score'
        };

        this.gameState = {
            round: null,
            selectedCardIds: new Set(),
            completedTargets: new Set(),
            score: 0,
            correctSubmissions: 0,
            wrongSubmissions: 0,
            timer: null,
            timeRemaining: 0,
            startTime: null
        };

        this.screens = {
            config: document.getElementById('configScreen'),
            game: document.getElementById('gameScreen'),
            result: document.getElementById('resultScreen')
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupHelpModal();
        this.showScreen('config');
    }

    setupHelpModal() {
        const helpBtn = document.getElementById('helpBtn');
        const helpModal = document.getElementById('helpModal');
        const closeBtn = document.getElementById('closeHelpModal');
        
        helpBtn.addEventListener('click', () => {
            helpModal.classList.add('active');
        });
        
        closeBtn.addEventListener('click', () => {
            helpModal.classList.remove('active');
        });
        
        // Close modal when clicking outside
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.classList.remove('active');
            }
        });
    }

    setupEventListeners() {
        // Game mode change
        document.getElementById('gameMode').addEventListener('change', (e) => {
            const buzzerGroup = document.getElementById('answerTimeLimitGroup');
            buzzerGroup.style.display = e.target.value === 'buzzer' ? 'block' : 'none';
        });

        // Start game
        document.getElementById('startGameBtn').addEventListener('click', () => this.startGame());

        // Reset selection
        document.getElementById('resetSelectionBtn').addEventListener('click', () => this.resetSelection());

        // Submit answer
        document.getElementById('submitAnswerBtn').addEventListener('click', () => this.submitAnswer());

        // Quit game
        document.getElementById('quitGameBtn').addEventListener('click', () => this.quitGame());

        // Play again
        document.getElementById('playAgainBtn').addEventListener('click', () => this.resetGame());
    }

    showScreen(screenName) {
        Object.keys(this.screens).forEach(key => {
            this.screens[key].classList.remove('active');
        });
        this.screens[screenName].classList.add('active');
    }

    validateConfig() {
        const cardCount = parseInt(document.getElementById('cardCount').value);
        const targetCount = parseInt(document.getElementById('targetCount').value);

        if (cardCount < 10 || cardCount > 20) {
            alert('Card count must be between 10 and 20!');
            return false;
        }

        if (targetCount < 1 || targetCount > 5) {
            alert('Target count must be between 1 and 5!');
            return false;
        }

        if (targetCount > 10) {
            alert('Target count cannot exceed 10!');
            return false;
        }

        return true;
    }

    startGame() {
        if (!this.validateConfig()) return;

        // Read configuration
        this.config = {
            gameMode: document.getElementById('gameMode').value,
            cardCount: parseInt(document.getElementById('cardCount').value),
            targetCount: parseInt(document.getElementById('targetCount').value),
            roundTimeLimit: parseInt(document.getElementById('roundTimeLimit').value),
            answerTimeLimit: parseInt(document.getElementById('answerTimeLimit').value),
            penaltyMode: document.getElementById('penaltyMode').value
        };

        // Reset game state
        this.gameState = {
            round: null,
            selectedCardIds: new Set(),
            completedTargets: new Set(),
            score: 0,
            correctSubmissions: 0,
            wrongSubmissions: 0,
            timer: null,
            timeRemaining: this.config.roundTimeLimit,
            startTime: Date.now()
        };

        // Generate round
        this.gameState.round = this.generateRound(this.config);

        // Show game screen
        this.showScreen('game');
        this.renderGame();
        this.startTimer();
    }

    generateRound(config) {
        // Select random unique target digits
        const availableDigits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        const targets = [];
        for (let i = 0; i < config.targetCount; i++) {
            const idx = Math.floor(Math.random() * availableDigits.length);
            targets.push(availableDigits.splice(idx, 1)[0]);
        }

        const cards = [];
        const solutions = {};
        let cardIdCounter = 0;

        // Generate solution cards for each target
        targets.forEach(targetDigit => {
            const digitMask = DIGIT_MASKS[targetDigit];
            const solutionCards = this.splitDigitIntoCards(digitMask, targetDigit);
            
            const cardIds = [];
            solutionCards.forEach(cardMask => {
                const card = {
                    id: cardIdCounter++,
                    mask: cardMask
                };
                cards.push(card);
                cardIds.push(card.id);
            });
            
            solutions[targetDigit] = cardIds;
        });

        // Add decoy cards
        const decoyCount = config.cardCount - cards.length;
        for (let i = 0; i < decoyCount; i++) {
            const decoyCard = this.generateDecoyCard(targets);
            cards.push({
                id: cardIdCounter++,
                mask: decoyCard
            });
        }

        // Shuffle cards
        this.shuffleArray(cards);

        return {
            cards,
            targets,
            solutions
        };
    }

    splitDigitIntoCards(digitMask, targetDigit) {
        // Get all active pixels
        const activePixels = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (digitMask[y][x] === 1) {
                    activePixels.push({ x, y });
                }
            }
        }

        // Randomly decide how many pieces (2-4)
        const pieceCount = 2 + Math.floor(Math.random() * 3); // 2, 3, or 4
        
        // Shuffle pixels
        this.shuffleArray(activePixels);

        // Distribute pixels among pieces
        const cards = [];
        const pixelsPerPiece = Math.ceil(activePixels.length / pieceCount);

        for (let i = 0; i < pieceCount; i++) {
            const cardMask = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
            
            const startIdx = i * pixelsPerPiece;
            const endIdx = Math.min(startIdx + pixelsPerPiece, activePixels.length);
            
            for (let j = startIdx; j < endIdx; j++) {
                const pixel = activePixels[j];
                cardMask[pixel.y][pixel.x] = 1;
            }
            
            cards.push(cardMask);
        }

        // Ensure all cards are non-empty and OR equals original
        const verifyMask = this.orMasks(cards);
        if (!this.masksEqual(verifyMask, digitMask)) {
            // Fallback: split horizontally
            return this.splitDigitHorizontally(digitMask);
        }

        return cards;
    }

    splitDigitHorizontally(digitMask) {
        // Simple fallback: split into top and bottom halves
        const midRow = Math.floor(GRID_HEIGHT / 2);
        
        const topCard = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
        const bottomCard = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
        
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (digitMask[y][x] === 1) {
                    if (y < midRow) {
                        topCard[y][x] = 1;
                    } else {
                        bottomCard[y][x] = 1;
                    }
                }
            }
        }
        
        return [topCard, bottomCard];
    }

    generateDecoyCard(targets) {
        const cardMask = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
        
        // Strategy: take a random subset from a random digit (possibly not in targets)
        const allDigits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        const randomDigit = allDigits[Math.floor(Math.random() * allDigits.length)];
        const sourceMask = DIGIT_MASKS[randomDigit];
        
        // Copy 30-70% of pixels randomly
        const copyProbability = 0.3 + Math.random() * 0.4;
        
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (sourceMask[y][x] === 1 && Math.random() < copyProbability) {
                    cardMask[y][x] = 1;
                }
            }
        }
        
        // Optionally add some noise pixels
        if (Math.random() < 0.3) {
            const noiseCount = 1 + Math.floor(Math.random() * 3);
            for (let i = 0; i < noiseCount; i++) {
                const x = Math.floor(Math.random() * GRID_WIDTH);
                const y = Math.floor(Math.random() * GRID_HEIGHT);
                cardMask[y][x] = 1;
            }
        }
        
        return cardMask;
    }

    orMasks(masks) {
        const result = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
        
        masks.forEach(mask => {
            for (let y = 0; y < GRID_HEIGHT; y++) {
                for (let x = 0; x < GRID_WIDTH; x++) {
                    if (mask[y][x] === 1) {
                        result[y][x] = 1;
                    }
                }
            }
        });
        
        return result;
    }

    masksEqual(mask1, mask2) {
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (mask1[y][x] !== mask2[y][x]) {
                    return false;
                }
            }
        }
        return true;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    renderGame() {
        this.renderTargets();
        this.renderCards();
        this.renderPreview();
        this.updateScore();
        this.updateTargetSelect();
    }

    renderTargets() {
        const targetsGrid = document.getElementById('targetsGrid');
        targetsGrid.innerHTML = '';

        this.gameState.round.targets.forEach(digit => {
            const targetDiv = document.createElement('div');
            targetDiv.className = 'target-item';
            targetDiv.dataset.digit = digit;
            
            if (this.gameState.completedTargets.has(digit)) {
                targetDiv.classList.add('completed');
            }

            const canvas = document.createElement('canvas');
            canvas.width = GRID_WIDTH * (PIXEL_SIZE + PIXEL_GAP);
            canvas.height = GRID_HEIGHT * (PIXEL_SIZE + PIXEL_GAP);
            
            this.drawPixelGrid(canvas, DIGIT_MASKS[digit]);
            
            const label = document.createElement('div');
            label.className = 'target-label';
            label.textContent = `Target: ${digit}`;
            
            targetDiv.appendChild(canvas);
            targetDiv.appendChild(label);
            targetsGrid.appendChild(targetDiv);
        });
    }

    renderCards() {
        const cardsGrid = document.getElementById('cardsGrid');
        cardsGrid.innerHTML = '';

        this.gameState.round.cards.forEach((card, index) => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card-item';
            cardDiv.dataset.cardId = card.id;
            
            if (this.gameState.selectedCardIds.has(card.id)) {
                cardDiv.classList.add('selected');
            }

            const canvas = document.createElement('canvas');
            canvas.width = GRID_WIDTH * (PIXEL_SIZE + PIXEL_GAP);
            canvas.height = GRID_HEIGHT * (PIXEL_SIZE + PIXEL_GAP);
            
            this.drawPixelGrid(canvas, card.mask);
            
            const label = document.createElement('div');
            label.className = 'card-label';
            label.textContent = `Card ${index + 1}`;
            
            cardDiv.appendChild(canvas);
            cardDiv.appendChild(label);
            
            cardDiv.addEventListener('click', () => this.toggleCardSelection(card.id));
            
            cardsGrid.appendChild(cardDiv);
        });
    }

    drawPixelGrid(canvas, mask, color = '#4CAF50') {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const px = x * (PIXEL_SIZE + PIXEL_GAP);
                const py = y * (PIXEL_SIZE + PIXEL_GAP);
                
                if (mask[y][x] === 1) {
                    ctx.fillStyle = color;
                    ctx.fillRect(px, py, PIXEL_SIZE, PIXEL_SIZE);
                } else {
                    ctx.fillStyle = '#e0e0e0';
                    ctx.fillRect(px, py, PIXEL_SIZE, PIXEL_SIZE);
                }
            }
        }
    }

    toggleCardSelection(cardId) {
        if (this.gameState.selectedCardIds.has(cardId)) {
            this.gameState.selectedCardIds.delete(cardId);
        } else {
            this.gameState.selectedCardIds.add(cardId);
        }
        
        this.renderCards();
        this.renderPreview();
        document.getElementById('selectedCount').textContent = this.gameState.selectedCardIds.size;
    }

    resetSelection() {
        this.gameState.selectedCardIds.clear();
        this.renderCards();
        this.renderPreview();
        document.getElementById('selectedCount').textContent = 0;
    }

    renderPreview() {
        const canvas = document.getElementById('previewCanvas');
        canvas.width = GRID_WIDTH * (PIXEL_SIZE + PIXEL_GAP) * 1.5;
        canvas.height = GRID_HEIGHT * (PIXEL_SIZE + PIXEL_GAP) * 1.5;
        
        if (this.gameState.selectedCardIds.size === 0) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#999';
            ctx.font = '14px Quicksand';
            ctx.textAlign = 'center';
            ctx.fillText('No cards selected', canvas.width / 2, canvas.height / 2);
            return;
        }

        const selectedMasks = [];
        this.gameState.selectedCardIds.forEach(cardId => {
            const card = this.gameState.round.cards.find(c => c.id === cardId);
            if (card) {
                selectedMasks.push(card.mask);
            }
        });

        const resultMask = this.orMasks(selectedMasks);
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const scale = 1.5;
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const px = x * (PIXEL_SIZE + PIXEL_GAP) * scale;
                const py = y * (PIXEL_SIZE + PIXEL_GAP) * scale;
                
                if (resultMask[y][x] === 1) {
                    ctx.fillStyle = '#2196F3';
                    ctx.fillRect(px, py, PIXEL_SIZE * scale, PIXEL_SIZE * scale);
                } else {
                    ctx.fillStyle = '#e0e0e0';
                    ctx.fillRect(px, py, PIXEL_SIZE * scale, PIXEL_SIZE * scale);
                }
            }
        }
    }

    updateTargetSelect() {
        const select = document.getElementById('targetSelect');
        select.innerHTML = '';
        
        this.gameState.round.targets.forEach(digit => {
            if (!this.gameState.completedTargets.has(digit)) {
                const option = document.createElement('option');
                option.value = digit;
                option.textContent = `Target ${digit}`;
                select.appendChild(option);
            }
        });

        if (select.options.length === 0) {
            const option = document.createElement('option');
            option.textContent = 'All targets completed!';
            select.appendChild(option);
            select.disabled = true;
            document.getElementById('submitAnswerBtn').disabled = true;
        } else {
            select.disabled = false;
            document.getElementById('submitAnswerBtn').disabled = false;
        }
    }

    submitAnswer() {
        const targetSelect = document.getElementById('targetSelect');
        const targetDigit = parseInt(targetSelect.value);
        
        if (isNaN(targetDigit)) {
            return;
        }

        const selectedIds = Array.from(this.gameState.selectedCardIds);
        const validation = this.validate(targetDigit, selectedIds);

        if (validation.correct) {
            this.handleCorrectAnswer(targetDigit);
        } else {
            this.handleWrongAnswer(validation);
        }
    }

    validate(targetDigit, selectedCardIds) {
        if (selectedCardIds.length < 2) {
            return {
                correct: false,
                reason: 'You must select at least 2 cards!',
                extraPixels: [],
                missingPixels: []
            };
        }

        const selectedMasks = selectedCardIds.map(id => {
            return this.gameState.round.cards.find(c => c.id === id).mask;
        });

        const resultMask = this.orMasks(selectedMasks);
        const targetMask = DIGIT_MASKS[targetDigit];

        const extraPixels = [];
        const missingPixels = [];

        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (resultMask[y][x] === 1 && targetMask[y][x] === 0) {
                    extraPixels.push({ x, y });
                }
                if (resultMask[y][x] === 0 && targetMask[y][x] === 1) {
                    missingPixels.push({ x, y });
                }
            }
        }

        const correct = extraPixels.length === 0 && missingPixels.length === 0;

        return {
            correct,
            reason: correct ? 'Perfect match!' : 'Does not match target exactly',
            extraPixels,
            missingPixels
        };
    }

    handleCorrectAnswer(targetDigit) {
        this.gameState.score++;
        this.gameState.correctSubmissions++;
        this.gameState.completedTargets.add(targetDigit);
        
        this.showFeedback('✓ Correct! Target completed!', 'success');
        this.resetSelection();
        this.renderTargets();
        this.updateScore();
        this.updateTargetSelect();

        // Check if all targets completed
        if (this.gameState.completedTargets.size === this.gameState.round.targets.length) {
            setTimeout(() => this.endGame(), 1500);
        }
    }

    handleWrongAnswer(validation) {
        this.gameState.wrongSubmissions++;
        
        if (this.config.penaltyMode === 'score') {
            this.gameState.score = Math.max(0, this.gameState.score - 1);
        }
        
        let message = `✗ Wrong! ${validation.reason}`;
        if (validation.extraPixels.length > 0) {
            message += `\nExtra pixels: ${validation.extraPixels.length}`;
        }
        if (validation.missingPixels.length > 0) {
            message += `\nMissing pixels: ${validation.missingPixels.length}`;
        }
        
        this.showFeedback(message, 'error');
        this.updateScore();
    }

    showFeedback(message, type) {
        const feedbackDiv = document.getElementById('feedbackMessage');
        feedbackDiv.textContent = message;
        feedbackDiv.className = `feedback-message ${type}`;
        feedbackDiv.style.display = 'block';

        setTimeout(() => {
            feedbackDiv.style.display = 'none';
        }, 3000);
    }

    updateScore() {
        document.getElementById('scoreValue').textContent = this.gameState.score;
    }

    startTimer() {
        this.updateTimerDisplay();
        
        this.gameState.timer = setInterval(() => {
            this.gameState.timeRemaining--;
            this.updateTimerDisplay();
            
            if (this.gameState.timeRemaining <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.gameState.timeRemaining / 60);
        const seconds = this.gameState.timeRemaining % 60;
        document.getElementById('timerValue').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    quitGame() {
        if (confirm('Are you sure you want to quit? Your progress will be lost.')) {
            this.endGame();
        }
    }

    endGame() {
        if (this.gameState.timer) {
            clearInterval(this.gameState.timer);
        }

        const timeUsed = this.config.roundTimeLimit - this.gameState.timeRemaining;
        const minutes = Math.floor(timeUsed / 60);
        const seconds = timeUsed % 60;

        document.getElementById('finalScore').textContent = this.gameState.score;
        document.getElementById('targetsCompleted').textContent = 
            `${this.gameState.completedTargets.size} / ${this.gameState.round.targets.length}`;
        document.getElementById('timeUsed').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('correctSubmissions').textContent = this.gameState.correctSubmissions;
        document.getElementById('wrongSubmissions').textContent = this.gameState.wrongSubmissions;

        // Performance message
        const performanceDiv = document.getElementById('performanceMessage');
        let performanceText = '';
        
        if (this.gameState.completedTargets.size === this.gameState.round.targets.length) {
            performanceText = '🎉 Perfect! All targets completed!';
        } else if (this.gameState.completedTargets.size >= this.gameState.round.targets.length * 0.7) {
            performanceText = '👍 Great job! Most targets completed!';
        } else if (this.gameState.completedTargets.size >= this.gameState.round.targets.length * 0.4) {
            performanceText = '👌 Good effort! Keep practicing!';
        } else {
            performanceText = '💪 Keep trying! Practice makes perfect!';
        }
        
        performanceDiv.textContent = performanceText;

        this.showScreen('result');
    }

    resetGame() {
        this.showScreen('config');
    }
}

// Initialize game when page loads
let gameInstance;

document.addEventListener('DOMContentLoaded', async () => {
    gameInstance = new PixelNumberGame();

    // Check if multiplayer mode
    const roomId = sessionStorage.getItem('multiplayerRoomId');
    const role = sessionStorage.getItem('multiplayerRole');

    if (roomId && typeof PixelGameMultiplayerAdapter !== 'undefined') {
        console.log('[PixelGame] Checking multiplayer room validity:', { roomId, role });

        // Validate room exists and is still active
        try {
            const roomRef = database.ref(`rooms/${roomId}`);
            const snapshot = await roomRef.once('value');
            const roomData = snapshot.val();

            // Check if room exists and is in valid state
            if (!roomData || roomData.meta.status === 'closed' || roomData.meta.status === 'finished') {
                console.log('[PixelGame] Room no longer valid, clearing multiplayer state');
                sessionStorage.removeItem('multiplayerRoomId');
                sessionStorage.removeItem('multiplayerRole');
                return; // Exit and let game run in single player mode
            }

            console.log('[PixelGame] Room valid, initializing multiplayer mode');
            const adapter = new PixelGameMultiplayerAdapter(gameInstance);

            if (role === 'host') {
                adapter.initAsHost(roomId);
            } else if (role === 'player') {
                adapter.initAsPlayer(roomId);
            }

            // Expose adapter globally for debugging
            window.pixelGameAdapter = adapter;
        } catch (error) {
            console.error('[PixelGame] Error checking room validity:', error);
            sessionStorage.removeItem('multiplayerRoomId');
            sessionStorage.removeItem('multiplayerRole');
        }
    }
});
