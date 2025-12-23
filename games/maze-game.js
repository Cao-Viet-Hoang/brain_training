// ============================================================================
// MAZE RUNNER GAME - Brain Training
// Navigate through mazes to train spatial thinking
// ============================================================================

// ============================================================================
// MODULE 1: MAZE GENERATOR
// Uses Recursive Backtracking algorithm to generate perfect mazes
// Creates actual openings in walls for entrance/exit
// Player starts OUTSIDE the maze and must exit through the other opening
// ============================================================================
class MazeGenerator {
    constructor() {
        this.directions = [
            { dx: 0, dy: -2, wallDx: 0, wallDy: -1 }, // Up
            { dx: 0, dy: 2, wallDx: 0, wallDy: 1 },   // Down
            { dx: -2, dy: 0, wallDx: -1, wallDy: 0 }, // Left
            { dx: 2, dy: 0, wallDx: 1, wallDy: 0 }    // Right
        ];
    }

    /**
     * Generate a maze grid with entrance/exit openings
     * Player starts outside and must navigate through to exit
     * @param {number} width - Maze width (should be odd)
     * @param {number} height - Maze height (should be odd)
     * @returns {Object} - { grid, start, exit, entrance, exitOpening, startEdge, exitEdge }
     */
    generate(width, height) {
        // Ensure odd dimensions for proper maze structure
        width = width % 2 === 0 ? width + 1 : width;
        height = height % 2 === 0 ? height + 1 : height;

        // Add 2 extra rows/cols for outside area (player start position)
        const totalWidth = width + 2;
        const totalHeight = height + 2;

        // Initialize grid with walls
        const grid = [];
        for (let y = 0; y < totalHeight; y++) {
            grid[y] = [];
            for (let x = 0; x < totalWidth; x++) {
                // Outer ring is "outside" area
                if (x === 0 || x === totalWidth - 1 || y === 0 || y === totalHeight - 1) {
                    grid[y][x] = 'outside';
                } else {
                    grid[y][x] = 'wall';
                }
            }
        }

        // Generate maze using recursive backtracking (offset by 1 for outer ring)
        this.carve(grid, 2, 2, totalWidth - 1, totalHeight - 1);

        // Create entrance and exit openings
        const openings = this.createOpenings(grid, width, height, totalWidth, totalHeight);

        return {
            grid,
            start: openings.playerStart,        // Where player starts (outside)
            exit: openings.exitOutside,         // Where player needs to reach (outside)
            entrance: openings.entranceInside,  // The opening into maze
            exitOpening: openings.exitInside,   // The opening out of maze
            startEdge: openings.startEdge,
            exitEdge: openings.exitEdge,
            width: totalWidth,
            height: totalHeight
        };
    }

    /**
     * Create entrance and exit openings in the maze walls
     */
    createOpenings(grid, mazeWidth, mazeHeight, totalWidth, totalHeight) {
        const edges = ['top', 'bottom', 'left', 'right'];

        // Randomly select entrance edge
        const startEdgeIndex = Math.floor(Math.random() * 4);
        const startEdge = edges[startEdgeIndex];

        // Select exit edge (opposite or perpendicular, never same)
        let exitEdgeIndex;
        if (Math.random() < 0.7) {
            // 70% chance: opposite edge (more challenging)
            exitEdgeIndex = (startEdgeIndex + 2) % 4;
        } else {
            // 30% chance: perpendicular edge
            exitEdgeIndex = (startEdgeIndex + (Math.random() < 0.5 ? 1 : 3)) % 4;
        }
        const exitEdge = edges[exitEdgeIndex];

        // Find opening positions
        const entrancePos = this.findOpeningPosition(grid, startEdge, totalWidth, totalHeight);
        const exitPos = this.findOpeningPosition(grid, exitEdge, totalWidth, totalHeight);

        // Create the openings (break the wall)
        grid[entrancePos.wallY][entrancePos.wallX] = 'entrance';
        grid[exitPos.wallY][exitPos.wallX] = 'exit';

        // Mark the outside cells for start/end
        grid[entrancePos.outsideY][entrancePos.outsideX] = 'start';
        grid[exitPos.outsideY][exitPos.outsideX] = 'finish';

        return {
            playerStart: { x: entrancePos.outsideX, y: entrancePos.outsideY },
            entranceInside: { x: entrancePos.insideX, y: entrancePos.insideY },
            exitInside: { x: exitPos.insideX, y: exitPos.insideY },
            exitOutside: { x: exitPos.outsideX, y: exitPos.outsideY },
            startEdge,
            exitEdge
        };
    }

    /**
     * Find a valid position for an opening on a given edge
     */
    findOpeningPosition(grid, edge, totalWidth, totalHeight) {
        const candidates = [];

        switch (edge) {
            case 'top':
                // Top wall is at y=1, find x positions where y=2 is a path
                for (let x = 2; x < totalWidth - 2; x += 2) {
                    if (grid[2][x] === 'path') {
                        candidates.push({
                            wallX: x, wallY: 1,
                            insideX: x, insideY: 2,
                            outsideX: x, outsideY: 0
                        });
                    }
                }
                break;
            case 'bottom':
                // Bottom wall is at y=totalHeight-2
                for (let x = 2; x < totalWidth - 2; x += 2) {
                    if (grid[totalHeight - 3][x] === 'path') {
                        candidates.push({
                            wallX: x, wallY: totalHeight - 2,
                            insideX: x, insideY: totalHeight - 3,
                            outsideX: x, outsideY: totalHeight - 1
                        });
                    }
                }
                break;
            case 'left':
                // Left wall is at x=1
                for (let y = 2; y < totalHeight - 2; y += 2) {
                    if (grid[y][2] === 'path') {
                        candidates.push({
                            wallX: 1, wallY: y,
                            insideX: 2, insideY: y,
                            outsideX: 0, outsideY: y
                        });
                    }
                }
                break;
            case 'right':
                // Right wall is at x=totalWidth-2
                for (let y = 2; y < totalHeight - 2; y += 2) {
                    if (grid[y][totalWidth - 3] === 'path') {
                        candidates.push({
                            wallX: totalWidth - 2, wallY: y,
                            insideX: totalWidth - 3, insideY: y,
                            outsideX: totalWidth - 1, outsideY: y
                        });
                    }
                }
                break;
        }

        // Pick a position near the middle with some randomness
        if (candidates.length === 0) {
            return this.forceCreateOpening(grid, edge, totalWidth, totalHeight);
        }

        // Sort by distance from center
        const centerX = Math.floor(totalWidth / 2);
        const centerY = Math.floor(totalHeight / 2);

        candidates.sort((a, b) => {
            const distA = Math.abs(a.wallX - centerX) + Math.abs(a.wallY - centerY);
            const distB = Math.abs(b.wallX - centerX) + Math.abs(b.wallY - centerY);
            return distA - distB;
        });

        // Pick from first half (closer to center)
        const pickRange = Math.max(1, Math.floor(candidates.length / 2));
        return candidates[Math.floor(Math.random() * pickRange)];
    }

    /**
     * Force create an opening if no natural path exists
     */
    forceCreateOpening(grid, edge, totalWidth, totalHeight) {
        let wallX, wallY, insideX, insideY, outsideX, outsideY;

        switch (edge) {
            case 'top':
                wallX = 2 + Math.floor(Math.random() * Math.floor((totalWidth - 4) / 2)) * 2;
                wallY = 1;
                insideX = wallX;
                insideY = 2;
                outsideX = wallX;
                outsideY = 0;
                break;
            case 'bottom':
                wallX = 2 + Math.floor(Math.random() * Math.floor((totalWidth - 4) / 2)) * 2;
                wallY = totalHeight - 2;
                insideX = wallX;
                insideY = totalHeight - 3;
                outsideX = wallX;
                outsideY = totalHeight - 1;
                break;
            case 'left':
                wallX = 1;
                wallY = 2 + Math.floor(Math.random() * Math.floor((totalHeight - 4) / 2)) * 2;
                insideX = 2;
                insideY = wallY;
                outsideX = 0;
                outsideY = wallY;
                break;
            case 'right':
                wallX = totalWidth - 2;
                wallY = 2 + Math.floor(Math.random() * Math.floor((totalHeight - 4) / 2)) * 2;
                insideX = totalWidth - 3;
                insideY = wallY;
                outsideX = totalWidth - 1;
                outsideY = wallY;
                break;
        }

        // Ensure path exists
        grid[insideY][insideX] = 'path';

        return { wallX, wallY, insideX, insideY, outsideX, outsideY };
    }

    /**
     * Recursive backtracking to carve passages
     */
    carve(grid, x, y, maxX, maxY) {
        grid[y][x] = 'path';

        const shuffledDirections = this.shuffleArray([...this.directions]);

        for (const dir of shuffledDirections) {
            const newX = x + dir.dx;
            const newY = y + dir.dy;

            if (
                newX > 1 && newX < maxX - 1 &&
                newY > 1 && newY < maxY - 1 &&
                grid[newY][newX] === 'wall'
            ) {
                grid[y + dir.wallDy][x + dir.wallDx] = 'path';
                this.carve(grid, newX, newY, maxX, maxY);
            }
        }
    }

    /**
     * Fisher-Yates shuffle
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

// ============================================================================
// MODULE 2: GAME CONFIGURATION
// ============================================================================
class MazeGameConfig {
    constructor(options = {}) {
        // Game mode
        this.mode = options.mode || 'classic'; // 'classic', 'fog_light', 'fog_heavy'

        // Difficulty settings
        this.difficulty = options.difficulty || 'easy'; // 'easy', 'medium', 'hard'

        // Number of rounds
        this.totalRounds = options.totalRounds || 5;

        // Base maze sizes for each difficulty
        this.baseMazeSize = {
            easy: 7,
            medium: 11,
            hard: 15
        };

        // Time limits (in seconds) for each difficulty
        this.baseTime = {
            easy: 60,
            medium: 90,
            hard: 120
        };

        // Scoring
        this.baseScore = 100;
        this.timeBonus = 2; // Points per second remaining
        this.stepPenalty = 0; // No penalty for extra steps
        this.errorPenalty = 5; // Points lost per wall hit
    }

    /**
     * Get maze size for a specific round
     */
    getMazeSize(round) {
        const baseSize = this.baseMazeSize[this.difficulty];
        const increase = Math.floor((round - 1) / 2) * 2; // Increase every 2 rounds
        const maxSize = 21;
        return Math.min(baseSize + increase, maxSize);
    }

    /**
     * Get time limit for a specific round
     */
    getTimeLimit(round) {
        const baseTime = this.baseTime[this.difficulty];
        const reduction = (round - 1) * 5; // Reduce 5 seconds per round
        const minTime = 20;
        return Math.max(baseTime - reduction, minTime);
    }
}

// ============================================================================
// MODULE 3: GAME STATE MANAGER
// ============================================================================
class GameStateManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.currentRound = 1;
        this.totalScore = 0;
        this.totalSteps = 0;
        this.totalErrors = 0;
        this.roundsCompleted = 0;

        // Current round state
        this.roundScore = 0;
        this.roundSteps = 0;
        this.roundErrors = 0;
        this.timeRemaining = 0;

        // Player position
        this.playerPos = { x: 0, y: 0 };

        // Game status
        this.isPlaying = false;
        this.isPaused = false;
    }

    startRound(startPos, timeLimit) {
        this.playerPos = { ...startPos };
        this.timeRemaining = timeLimit;
        this.roundSteps = 0;
        this.roundErrors = 0;
        this.roundScore = 0;
        this.isPlaying = true;
    }

    recordStep() {
        this.roundSteps++;
        this.totalSteps++;
    }

    recordError() {
        this.roundErrors++;
        this.totalErrors++;
    }

    calculateRoundScore(config) {
        const baseScore = config.baseScore;
        const timeBonus = Math.floor(this.timeRemaining * config.timeBonus);
        const errorDeduction = this.roundErrors * config.errorPenalty;

        this.roundScore = Math.max(0, baseScore + timeBonus - errorDeduction);
        this.totalScore += this.roundScore;
        this.roundsCompleted++;

        return this.roundScore;
    }

    nextRound() {
        this.currentRound++;
    }

    isGameOver(totalRounds) {
        return this.currentRound > totalRounds;
    }
}

// ============================================================================
// MODULE 4: MAZE RENDERER
// ============================================================================
class MazeRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.cells = [];
        this.playerDirection = 'down';
    }

    render(mazeData, playerPos) {
        const { grid, width, height, startEdge, exitEdge } = mazeData;

        // Clear container
        this.container.innerHTML = '';
        this.cells = [];

        // Set grid size class
        this.container.className = `maze-grid size-${width}`;

        // Create cells
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const cell = document.createElement('div');
                cell.className = 'maze-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;

                const cellType = grid[y][x];

                switch (cellType) {
                    case 'wall':
                        cell.classList.add('wall');
                        break;
                    case 'path':
                        cell.classList.add('path');
                        break;
                    case 'outside':
                        cell.classList.add('outside');
                        break;
                    case 'start':
                        // Player starting position (outside maze)
                        cell.classList.add('outside', 'start-zone');
                        if (startEdge) cell.classList.add(`start-${startEdge}`);
                        break;
                    case 'finish':
                        // Exit destination (outside maze)
                        cell.classList.add('outside', 'finish-zone');
                        if (exitEdge) cell.classList.add(`finish-${exitEdge}`);
                        break;
                    case 'entrance':
                        // Opening in wall (entrance)
                        cell.classList.add('path', 'entrance-opening');
                        if (startEdge) cell.classList.add(`opening-${startEdge}`);
                        break;
                    case 'exit':
                        // Opening in wall (exit)
                        cell.classList.add('path', 'exit-opening');
                        if (exitEdge) cell.classList.add(`opening-${exitEdge}`);
                        break;
                    default:
                        cell.classList.add('path');
                }

                // Check if player is here
                if (playerPos.x === x && playerPos.y === y) {
                    cell.classList.add('player');
                    if (startEdge) {
                        this.playerDirection = this.getInitialDirection(startEdge);
                        cell.classList.add(`facing-${this.playerDirection}`);
                    }
                }

                this.container.appendChild(cell);

                if (!this.cells[y]) this.cells[y] = [];
                this.cells[y][x] = cell;
            }
        }
    }

    getInitialDirection(startEdge) {
        switch (startEdge) {
            case 'top': return 'down';
            case 'bottom': return 'up';
            case 'left': return 'right';
            case 'right': return 'left';
            default: return 'down';
        }
    }

    getDirectionFromMove(dx, dy) {
        if (dy < 0) return 'up';
        if (dy > 0) return 'down';
        if (dx < 0) return 'left';
        if (dx > 0) return 'right';
        return this.playerDirection;
    }

    updatePlayerPosition(oldPos, newPos, direction = null) {
        if (direction) {
            this.playerDirection = this.getDirectionFromMove(direction.dx, direction.dy);
        } else {
            const dx = newPos.x - oldPos.x;
            const dy = newPos.y - oldPos.y;
            this.playerDirection = this.getDirectionFromMove(dx, dy);
        }

        // Remove player from old position
        if (this.cells[oldPos.y] && this.cells[oldPos.y][oldPos.x]) {
            const oldCell = this.cells[oldPos.y][oldPos.x];
            oldCell.classList.remove('player', 'facing-up', 'facing-down', 'facing-left', 'facing-right', 'player-moving');

            // Mark as visited if it's a path inside the maze
            if (oldCell.classList.contains('path') && !oldCell.classList.contains('entrance-opening')) {
                oldCell.classList.add('visited');
            }
        }

        // Add player to new position
        if (this.cells[newPos.y] && this.cells[newPos.y][newPos.x]) {
            const newCell = this.cells[newPos.y][newPos.x];
            newCell.classList.add('player', `facing-${this.playerDirection}`, 'player-moving');

            setTimeout(() => {
                newCell.classList.remove('player-moving');
            }, 200);
        }
    }

    highlightClickableCells(playerPos, grid) {
        this.container.querySelectorAll('.clickable').forEach(cell => {
            cell.classList.remove('clickable');
        });

        const adjacentOffsets = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 }
        ];

        for (const offset of adjacentOffsets) {
            const x = playerPos.x + offset.dx;
            const y = playerPos.y + offset.dy;

            if (this.cells[y] && this.cells[y][x]) {
                const cell = this.cells[y][x];
                // Can move to: path, entrance, exit, finish (but not wall or regular outside)
                const isWalkable = cell.classList.contains('path') ||
                                   cell.classList.contains('finish-zone') ||
                                   cell.classList.contains('entrance-opening') ||
                                   cell.classList.contains('exit-opening');

                if (isWalkable && !cell.classList.contains('player')) {
                    cell.classList.add('clickable');
                }
            }
        }
    }

    showWallHitFeedback(playerPos, direction) {
        const playerCell = this.cells[playerPos.y][playerPos.x];
        playerCell.classList.add('error');

        if (direction) {
            const newDirection = this.getDirectionFromMove(direction.dx, direction.dy);
            playerCell.classList.remove('facing-up', 'facing-down', 'facing-left', 'facing-right');
            playerCell.classList.add(`facing-${newDirection}`);
            this.playerDirection = newDirection;
        }

        setTimeout(() => {
            playerCell.classList.remove('error');
        }, 300);
    }

    getCell(x, y) {
        return this.cells[y] && this.cells[y][x];
    }
}

// ============================================================================
// MODULE 5: TIMER MANAGER
// ============================================================================
class TimerManager {
    constructor() {
        this.timeRemaining = 0;
        this.totalTime = 0;
        this.intervalId = null;
        this.onTick = null;
        this.onTimeUp = null;
    }

    start(duration, onTick, onTimeUp) {
        this.totalTime = duration;
        this.timeRemaining = duration;
        this.onTick = onTick;
        this.onTimeUp = onTimeUp;

        this.intervalId = setInterval(() => {
            this.timeRemaining--;

            if (this.onTick) {
                this.onTick(this.timeRemaining, this.totalTime);
            }

            if (this.timeRemaining <= 0) {
                this.stop();
                if (this.onTimeUp) {
                    this.onTimeUp();
                }
            }
        }, 1000);

        // Initial tick
        if (this.onTick) {
            this.onTick(this.timeRemaining, this.totalTime);
        }
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    pause() {
        this.stop();
    }

    resume(onTick, onTimeUp) {
        if (this.timeRemaining > 0) {
            this.onTick = onTick;
            this.onTimeUp = onTimeUp;

            this.intervalId = setInterval(() => {
                this.timeRemaining--;

                if (this.onTick) {
                    this.onTick(this.timeRemaining, this.totalTime);
                }

                if (this.timeRemaining <= 0) {
                    this.stop();
                    if (this.onTimeUp) {
                        this.onTimeUp();
                    }
                }
            }, 1000);
        }
    }

    getTimeRemaining() {
        return this.timeRemaining;
    }
}

// ============================================================================
// MODULE 6: INPUT HANDLER
// ============================================================================
class InputHandler {
    constructor() {
        this.onMove = null;
        this.enabled = false;

        this.keyDownHandler = this.handleKeyDown.bind(this);
    }

    enable(onMove) {
        this.onMove = onMove;
        this.enabled = true;
        document.addEventListener('keydown', this.keyDownHandler);
    }

    disable() {
        this.enabled = false;
        this.onMove = null;
        document.removeEventListener('keydown', this.keyDownHandler);
    }

    handleKeyDown(event) {
        if (!this.enabled || !this.onMove) return;

        let direction = null;

        switch (event.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                direction = { dx: 0, dy: -1 };
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                direction = { dx: 0, dy: 1 };
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                direction = { dx: -1, dy: 0 };
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                direction = { dx: 1, dy: 0 };
                break;
        }

        if (direction) {
            event.preventDefault();
            this.onMove(direction);
        }
    }

    handleCellClick(x, y, playerPos) {
        if (!this.enabled || !this.onMove) return;

        const dx = x - playerPos.x;
        const dy = y - playerPos.y;

        // Only allow adjacent moves (not diagonal)
        if ((Math.abs(dx) === 1 && dy === 0) || (dx === 0 && Math.abs(dy) === 1)) {
            this.onMove({ dx, dy });
        }
    }
}

// ============================================================================
// MODULE 7: MAIN GAME CLASS
// ============================================================================
class MazeGame {
    constructor() {
        // Initialize modules
        this.mazeGenerator = new MazeGenerator();
        this.config = new MazeGameConfig();
        this.state = new GameStateManager();
        this.renderer = new MazeRenderer('mazeGrid');
        this.timer = new TimerManager();
        this.input = new InputHandler();

        // Current maze data
        this.currentMaze = null;

        // DOM elements
        this.screens = {
            config: document.getElementById('configScreen'),
            game: document.getElementById('gameScreen'),
            roundComplete: document.getElementById('roundCompleteScreen'),
            result: document.getElementById('resultScreen')
        };

        this.elements = {
            // Stats
            roundDisplay: document.getElementById('roundDisplay'),
            scoreDisplay: document.getElementById('scoreDisplay'),
            stepsDisplay: document.getElementById('stepsDisplay'),
            errorsDisplay: document.getElementById('errorsDisplay'),

            // Timer
            timerFill: document.getElementById('timerFill'),
            timerText: document.getElementById('timerText'),

            // Round complete
            roundIcon: document.getElementById('roundIcon'),
            roundTitle: document.getElementById('roundTitle'),
            roundTimeRemaining: document.getElementById('roundTimeRemaining'),
            roundSteps: document.getElementById('roundSteps'),
            roundErrors: document.getElementById('roundErrors'),
            roundScore: document.getElementById('roundScore'),

            // Results
            resultIcon: document.getElementById('resultIcon'),
            resultTitle: document.getElementById('resultTitle'),
            finalRounds: document.getElementById('finalRounds'),
            finalScore: document.getElementById('finalScore'),
            totalSteps: document.getElementById('totalSteps'),
            totalErrors: document.getElementById('totalErrors')
        };

        // Initialize
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupHelpModal();
        this.showScreen('config');
    }

    setupEventListeners() {
        // Config screen buttons
        this.setupOptionButtons('gameModeButtons', (value) => {
            this.config.mode = value;
        });

        this.setupOptionButtons('difficultyButtons', (value) => {
            this.config.difficulty = value;
        });

        this.setupOptionButtons('roundButtons', (value) => {
            this.config.totalRounds = parseInt(value);
        });

        // Start button
        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.startGame();
        });

        // Next round button
        document.getElementById('nextRoundBtn').addEventListener('click', () => {
            this.startNextRound();
        });

        // Result screen buttons
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.resetGame();
        });

        document.getElementById('backToMenuBtn').addEventListener('click', () => {
            window.location.href = '../index.html';
        });

        // Maze cell clicks
        this.renderer.container.addEventListener('click', (e) => {
            const cell = e.target.closest('.maze-cell');
            if (cell && cell.classList.contains('clickable')) {
                const x = parseInt(cell.dataset.x);
                const y = parseInt(cell.dataset.y);
                this.input.handleCellClick(x, y, this.state.playerPos);
            }
        });
    }

    setupOptionButtons(containerId, onChange) {
        const container = document.getElementById(containerId);
        const buttons = container.querySelectorAll('.option-btn:not(.disabled)');

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active from all
                buttons.forEach(b => b.classList.remove('active'));
                // Add active to clicked
                btn.classList.add('active');
                // Call change handler
                onChange(btn.dataset.value);
            });
        });
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

        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.classList.remove('active');
            }
        });
    }

    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        this.screens[screenName].classList.add('active');
    }

    startGame() {
        this.state.reset();
        this.startRound();
    }

    startRound() {
        // Generate maze for current round
        const mazeSize = this.config.getMazeSize(this.state.currentRound);
        this.currentMaze = this.mazeGenerator.generate(mazeSize, mazeSize);

        // Get time limit
        const timeLimit = this.config.getTimeLimit(this.state.currentRound);

        // Initialize round state
        this.state.startRound(this.currentMaze.start, timeLimit);

        // Render maze
        this.renderer.render(this.currentMaze, this.state.playerPos);
        this.renderer.highlightClickableCells(this.state.playerPos, this.currentMaze.grid);

        // Update UI
        this.updateDisplay();

        // Enable input
        this.input.enable((direction) => this.handleMove(direction));

        // Start timer
        this.timer.start(
            timeLimit,
            (remaining, total) => this.updateTimer(remaining, total),
            () => this.handleTimeUp()
        );

        // Show game screen
        this.showScreen('game');
    }

    handleMove(direction) {
        if (!this.state.isPlaying) return;

        const newX = this.state.playerPos.x + direction.dx;
        const newY = this.state.playerPos.y + direction.dy;

        // Check bounds
        if (newX < 0 || newX >= this.currentMaze.width ||
            newY < 0 || newY >= this.currentMaze.height) {
            return;
        }

        const targetCell = this.currentMaze.grid[newY][newX];

        // Check if wall or blocked outside area
        if (targetCell === 'wall' || targetCell === 'outside') {
            this.state.recordError();
            this.renderer.showWallHitFeedback(this.state.playerPos, direction);
            this.updateDisplay();
            return;
        }

        // Valid move
        const oldPos = { ...this.state.playerPos };
        this.state.playerPos.x = newX;
        this.state.playerPos.y = newY;
        this.state.recordStep();

        // Update renderer with direction for animation
        this.renderer.updatePlayerPosition(oldPos, this.state.playerPos, direction);
        this.renderer.highlightClickableCells(this.state.playerPos, this.currentMaze.grid);

        // Update display
        this.updateDisplay();

        // Check if reached finish zone (exited the maze!)
        if (targetCell === 'finish') {
            this.completeRound(true);
        }
    }

    completeRound(success) {
        // Stop game
        this.state.isPlaying = false;
        this.input.disable();
        this.timer.stop();

        // Update time remaining in state
        this.state.timeRemaining = this.timer.getTimeRemaining();

        // Calculate score
        const roundScore = this.state.calculateRoundScore(this.config);

        // Update round complete screen
        if (success) {
            this.elements.roundIcon.textContent = '✅';
            this.elements.roundTitle.textContent = 'Round Complete!';
        } else {
            this.elements.roundIcon.textContent = '⏰';
            this.elements.roundTitle.textContent = 'Time\'s Up!';
        }

        this.elements.roundTimeRemaining.textContent = `${this.state.timeRemaining}s`;
        this.elements.roundSteps.textContent = this.state.roundSteps;
        this.elements.roundErrors.textContent = this.state.roundErrors;
        this.elements.roundScore.textContent = roundScore;

        // Update button text based on whether there are more rounds
        const nextRoundBtn = document.getElementById('nextRoundBtn');
        if (this.state.currentRound >= this.config.totalRounds) {
            nextRoundBtn.textContent = '🏆 View Results';
        } else {
            nextRoundBtn.textContent = '➡️ Next Round';
        }

        // Show round complete screen
        this.showScreen('roundComplete');
    }

    startNextRound() {
        this.state.nextRound();

        if (this.state.isGameOver(this.config.totalRounds)) {
            this.showResults();
        } else {
            this.startRound();
        }
    }

    handleTimeUp() {
        this.completeRound(false);
    }

    showResults() {
        // Determine result icon and title based on performance
        const completionRate = this.state.roundsCompleted / this.config.totalRounds;

        if (completionRate >= 0.8) {
            this.elements.resultIcon.textContent = '🏆';
            this.elements.resultTitle.textContent = 'Excellent!';
        } else if (completionRate >= 0.5) {
            this.elements.resultIcon.textContent = '⭐';
            this.elements.resultTitle.textContent = 'Good Job!';
        } else {
            this.elements.resultIcon.textContent = '💪';
            this.elements.resultTitle.textContent = 'Keep Practicing!';
        }

        // Update stats
        this.elements.finalRounds.textContent = `${this.state.roundsCompleted}/${this.config.totalRounds}`;
        this.elements.finalScore.textContent = this.state.totalScore;
        this.elements.totalSteps.textContent = this.state.totalSteps;
        this.elements.totalErrors.textContent = this.state.totalErrors;

        this.showScreen('result');
    }

    updateDisplay() {
        this.elements.roundDisplay.textContent = `${this.state.currentRound}/${this.config.totalRounds}`;
        this.elements.scoreDisplay.textContent = this.state.totalScore;
        this.elements.stepsDisplay.textContent = this.state.roundSteps;
        this.elements.errorsDisplay.textContent = this.state.roundErrors;
    }

    updateTimer(remaining, total) {
        const percentage = (remaining / total) * 100;
        this.elements.timerFill.style.width = `${percentage}%`;
        this.elements.timerText.textContent = `${remaining}s`;

        // Update timer styling based on remaining time
        this.elements.timerFill.classList.remove('warning', 'danger');
        this.elements.timerText.classList.remove('warning', 'danger');

        if (percentage <= 20) {
            this.elements.timerFill.classList.add('danger');
            this.elements.timerText.classList.add('danger');
        } else if (percentage <= 40) {
            this.elements.timerFill.classList.add('warning');
            this.elements.timerText.classList.add('warning');
        }
    }

    resetGame() {
        this.state.reset();
        this.showScreen('config');
    }
}

// ============================================================================
// INITIALIZE GAME
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    window.mazeGame = new MazeGame();
});
