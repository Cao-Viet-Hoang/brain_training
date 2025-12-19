// ============================================================================
// MEMORY MATRIX GAME - Complete Implementation
// ============================================================================

// ============================================================================
// MODULE 1: GAME CONFIGURATION
// ============================================================================
class GameConfig {
    constructor(options = {}) {
        // Grid settings
        this.startGridSize = options.startGridSize || 3;
        this.maxGridSize = options.maxGridSize || 7;
        
        // Target cells settings
        this.startTargets = options.startTargets || 3;
        this.maxTargets = options.maxTargets || 20;
        
        // Timing settings
        this.showDurationMsBase = options.showDurationMsBase || 1200;
        this.showDurationMsMin = options.showDurationMsMin || 450;
        this.betweenFlashMs = options.betweenFlashMs || 350;
        this.inputTimeLimitMs = options.inputTimeLimitMs || 0; // 0 = no limit
        this.resultDelayMs = options.resultDelayMs || 800;
        
        // Game mode settings
        this.mode = options.mode || 'classic'; // 'classic', 'sequence', 'timed'
        this.mistakePolicy = options.mistakePolicy || 'fail_level'; // 'fail_level', 'lose_life'
        this.lives = options.lives || 3;
        
        // Scoring settings
        this.baseScorePerLevel = options.baseScorePerLevel || 100;
        this.levelScoreMultiplier = options.levelScoreMultiplier || 15;
        this.maxSpeedBonus = options.maxSpeedBonus || 120;
        this.maxStreakBonus = options.maxStreakBonus || 150;
        
        // Seed for reproducible patterns (optional)
        this.seed = options.seed || null;
    }
}

// ============================================================================
// MODULE 2: LEVEL MANAGER
// Determines parameters for each level
// ============================================================================
class LevelManager {
    constructor(config) {
        this.config = config;
    }

    /**
     * Get all parameters for a specific level
     */
    getLevelParams(level) {
        const gridSize = this.getGridSize(level);
        const targetsCount = this.getTargetsCount(level, gridSize);
        const showDurationMs = this.getShowDuration(level);
        const inputTimeLimitMs = this.getInputTimeLimit(level);
        const betweenFlashMs = this.getBetweenFlashMs(level);

        return {
            gridSize,
            targetsCount,
            showDurationMs,
            inputTimeLimitMs,
            betweenFlashMs
        };
    }

    /**
     * Calculate grid size based on level
     */
    getGridSize(level) {
        if (level <= 4) return Math.max(this.config.startGridSize, 3);
        if (level <= 10) return Math.max(this.config.startGridSize, 4);
        if (level <= 18) return 5;
        if (level <= 28) return 6;
        return Math.min(7, this.config.maxGridSize);
    }

    /**
     * Calculate number of target cells based on level
     */
    getTargetsCount(level, gridSize) {
        const baseTargets = this.config.startTargets + Math.floor((level - 1) / 2);
        const maxPossible = gridSize * gridSize - 2;
        return Math.min(baseTargets, maxPossible, this.config.maxTargets);
    }

    /**
     * Calculate show duration based on level
     */
    getShowDuration(level) {
        const reduction = (level - 1) * 40;
        return Math.max(
            this.config.showDurationMsMin,
            this.config.showDurationMsBase - reduction
        );
    }

    /**
     * Calculate input time limit (for timed mode)
     */
    getInputTimeLimit(level) {
        if (this.config.mode !== 'timed') return 0;
        
        // Start with generous time limit and decrease gradually
        const baseTime = 10000; // 10 seconds at level 1
        const reduction = (level - 1) * 200;
        return Math.max(3500, baseTime - reduction);
    }

    /**
     * Calculate time between flashes (for sequence mode)
     */
    getBetweenFlashMs(level) {
        // Start at 500ms, decrease to minimum 200ms
        const baseTime = 500;
        const minTime = 200;
        const reduction = (level - 1) * 15;
        return Math.max(minTime, baseTime - reduction);
    }
}

// ============================================================================
// MODULE 3: PATTERN GENERATOR
// Generates fair and challenging target cell patterns
// ============================================================================
class PatternGenerator {
    constructor(config) {
        this.config = config;
        this.rng = this.initRNG(config.seed);
    }

    /**
     * Initialize random number generator (with optional seed)
     */
    initRNG(seed) {
        if (seed !== null && seed !== undefined) {
            // Simple seeded RNG (Mulberry32)
            return () => {
                let t = seed += 0x6D2B79F5;
                t = Math.imul(t ^ t >>> 15, t | 1);
                t ^= t + Math.imul(t ^ t >>> 7, t | 61);
                return ((t ^ t >>> 14) >>> 0) / 4294967296;
            };
        }
        return () => Math.random();
    }

    /**
     * Generate target cells for a level
     */
    generate(gridSize, targetsCount) {
        const maxAttempts = 20;
        let attempt = 0;
        let targetCells = [];

        while (attempt < maxAttempts) {
            attempt++;
            targetCells = this.generateCandidateCells(gridSize, targetsCount);
            
            if (this.validatePattern(targetCells, gridSize)) {
                break;
            }
        }

        return targetCells;
    }

    /**
     * Generate candidate target cells
     */
    generateCandidateCells(gridSize, targetsCount) {
        const totalCells = gridSize * gridSize;
        const allIndices = Array.from({ length: totalCells }, (_, i) => i);
        
        // Shuffle using Fisher-Yates
        for (let i = allIndices.length - 1; i > 0; i--) {
            const j = Math.floor(this.rng() * (i + 1));
            [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
        }

        return allIndices.slice(0, targetsCount);
    }

    /**
     * Validate pattern fairness
     */
    validatePattern(targetCells, gridSize) {
        // Basic validation - always pass for now
        // Can add more sophisticated checks here if needed
        return true;
    }

    /**
     * Convert index to row, col
     */
    indexToRowCol(index, gridSize) {
        return {
            row: Math.floor(index / gridSize),
            col: index % gridSize
        };
    }
}

// ============================================================================
// MODULE 4: GAME ENGINE
// Manages game state, phases, and scoring
// ============================================================================
class GameEngine {
    constructor(config) {
        this.config = config;
        this.levelManager = new LevelManager(config);
        this.patternGenerator = new PatternGenerator(config);
        
        // Game state
        this.state = 'IDLE';
        this.level = 1;
        this.score = 0;
        this.lives = config.lives;
        this.streak = 0;
        this.bestStreak = 0;
        
        // Level data
        this.currentLevelParams = null;
        this.targetCells = [];
        this.selectedCells = [];
        
        // Timers
        this.timers = [];
        this.inputStartTime = null;
        this.inputTimeRemaining = 0;
    }

    /**
     * Start a new game
     */
    startGame() {
        this.level = 1;
        this.score = 0;
        this.lives = this.config.lives;
        this.streak = 0;
        this.bestStreak = 0;
        this.startLevel();
    }

    /**
     * Start a new level
     */
    startLevel() {
        this.clearTimers();
        this.selectedCells = [];
        
        // Get level parameters
        this.currentLevelParams = this.levelManager.getLevelParams(this.level);
        
        // Generate pattern
        this.targetCells = this.patternGenerator.generate(
            this.currentLevelParams.gridSize,
            this.currentLevelParams.targetsCount
        );
        
        // Start show phase
        this.setState('SHOW');
    }

    /**
     * Transition to input phase
     */
    startInputPhase() {
        this.setState('INPUT');
        this.inputStartTime = Date.now();
        this.inputTimeRemaining = this.currentLevelParams.inputTimeLimitMs;
        
        // Start timer if in timed mode
        if (this.currentLevelParams.inputTimeLimitMs > 0) {
            this.startInputTimer();
        }
    }

    /**
     * Start input timer
     */
    startInputTimer() {
        const startTime = Date.now();
        const duration = this.currentLevelParams.inputTimeLimitMs;
        
        const timerInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            this.inputTimeRemaining = Math.max(0, duration - elapsed);
            
            if (this.inputTimeRemaining <= 0) {
                clearInterval(timerInterval);
                this.submitInput();
            }
        }, 50);
        
        this.timers.push(timerInterval);
    }

    /**
     * Handle cell selection
     */
    selectCell(cellIndex) {
        if (this.state !== 'INPUT') return false;
        
        const mode = this.config.mode;
        
        if (mode === 'classic' || mode === 'timed') {
            // Toggle selection
            const idx = this.selectedCells.indexOf(cellIndex);
            if (idx >= 0) {
                this.selectedCells.splice(idx, 1);
            } else {
                if (this.selectedCells.length < this.currentLevelParams.targetsCount) {
                    this.selectedCells.push(cellIndex);
                }
            }
        } else if (mode === 'sequence') {
            // Add to sequence, or remove if clicking the last selected cell
            const lastIndex = this.selectedCells.length - 1;
            if (lastIndex >= 0 && this.selectedCells[lastIndex] === cellIndex) {
                // Clicking the last selected cell - remove it (undo)
                this.selectedCells.pop();
            } else if (!this.selectedCells.includes(cellIndex)) {
                // Add new cell to sequence
                if (this.selectedCells.length < this.currentLevelParams.targetsCount) {
                    this.selectedCells.push(cellIndex);
                }
            }
        }
        
        // Auto-submit when all cells selected
        if (this.selectedCells.length === this.currentLevelParams.targetsCount) {
            setTimeout(() => this.submitInput(), 200);
        }
        
        return true;
    }

    /**
     * Submit input and evaluate
     */
    submitInput() {
        if (this.state !== 'INPUT') return;
        
        const inputDuration = Date.now() - this.inputStartTime;
        const result = this.evaluateInput();
        
        // Calculate score
        const scoreData = this.calculateScore(result, inputDuration);
        this.score += scoreData.total;
        
        // Update streak
        if (result.pass) {
            this.streak++;
            this.bestStreak = Math.max(this.bestStreak, this.streak);
        } else {
            this.streak = 0;
        }
        
        // Handle pass/fail
        this.setState('RESULT');
        
        return { result, scoreData };
    }

    /**
     * Evaluate user input
     */
    evaluateInput() {
        const mode = this.config.mode;
        
        if (mode === 'sequence') {
            return this.evaluateSequence();
        } else {
            return this.evaluateSet();
        }
    }

    /**
     * Evaluate set-based input (classic/timed)
     */
    evaluateSet() {
        const targetSet = new Set(this.targetCells);
        const selectedSet = new Set(this.selectedCells);
        
        const hits = [];
        const misses = [];
        const falseAlarms = [];
        
        // Check hits and false alarms
        this.selectedCells.forEach(cell => {
            if (targetSet.has(cell)) {
                hits.push(cell);
            } else {
                falseAlarms.push(cell);
            }
        });
        
        // Check misses
        this.targetCells.forEach(cell => {
            if (!selectedSet.has(cell)) {
                misses.push(cell);
            }
        });
        
        const pass = falseAlarms.length === 0 && misses.length === 0;
        
        return {
            pass,
            hits,
            misses,
            falseAlarms
        };
    }

    /**
     * Evaluate sequence-based input
     */
    evaluateSequence() {
        const pass = this.selectedCells.length === this.targetCells.length &&
                     this.selectedCells.every((cell, i) => cell === this.targetCells[i]);
        
        const hits = [];
        const misses = [];
        const falseAlarms = [];
        
        if (pass) {
            hits.push(...this.targetCells);
        } else {
            // Mark correct positions as hits, others as errors
            this.selectedCells.forEach((cell, i) => {
                if (i < this.targetCells.length && cell === this.targetCells[i]) {
                    hits.push(cell);
                } else {
                    falseAlarms.push(cell);
                }
            });
            
            this.targetCells.forEach((cell, i) => {
                if (i >= this.selectedCells.length || this.selectedCells[i] !== cell) {
                    misses.push(cell);
                }
            });
        }
        
        return { pass, hits, misses, falseAlarms };
    }

    /**
     * Calculate score for current attempt
     */
    calculateScore(result, inputDuration) {
        const base = this.config.baseScorePerLevel + 
                     this.level * this.config.levelScoreMultiplier;
        
        let speedBonus = 0;
        if (result.pass && this.currentLevelParams.inputTimeLimitMs > 0) {
            const timeLimit = this.currentLevelParams.inputTimeLimitMs;
            const remaining = timeLimit - inputDuration;
            speedBonus = Math.max(0, Math.min(
                this.config.maxSpeedBonus,
                Math.floor((remaining / timeLimit) * this.config.maxSpeedBonus)
            ));
        }
        
        let streakBonus = 0;
        if (result.pass && this.streak > 0) {
            streakBonus = Math.min(
                this.config.maxStreakBonus,
                this.streak * 10
            );
        }
        
        const total = result.pass ? (base + speedBonus + streakBonus) : 0;
        
        return { base, speedBonus, streakBonus, total };
    }

    /**
     * Progress to next level or end game
     */
    processResult(result) {
        if (result.pass) {
            this.level++;
            return { continue: true, reason: 'pass' };
        } else {
            // Handle failure based on policy
            if (this.config.mistakePolicy === 'fail_level') {
                return { continue: false, reason: 'fail' };
            } else if (this.config.mistakePolicy === 'lose_life') {
                this.lives--;
                if (this.lives <= 0) {
                    return { continue: false, reason: 'no_lives' };
                } else {
                    return { continue: true, reason: 'life_lost' };
                }
            }
        }
    }

    /**
     * Set game state
     */
    setState(newState) {
        this.state = newState;
    }

    /**
     * Clear all timers
     */
    clearTimers() {
        this.timers.forEach(timer => clearInterval(timer));
        this.timers = [];
    }

    /**
     * Restart game
     */
    restart() {
        this.clearTimers();
        this.startGame();
    }
}

// ============================================================================
// MODULE 5: UI CONTROLLER
// Manages all UI interactions and rendering
// ============================================================================
class UIController {
    constructor(gameEngine) {
        this.engine = gameEngine;
        this.elements = this.cacheElements();
        this.setupEventListeners();
        this.currentGridCells = [];
        this.debounceTimers = new Map();
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        return {
            // Screens
            configScreen: document.getElementById('configScreen'),
            gameScreen: document.getElementById('gameScreen'),
            resultScreen: document.getElementById('resultScreen'),
            
            // Config
            gameModeButtons: document.getElementById('gameModeButtons'),
            mistakePolicyButtons: document.getElementById('mistakePolicyButtons'),
            startGridButtons: document.getElementById('startGridButtons'),
            startGameBtn: document.getElementById('startGameBtn'),
            
            // Game
            levelDisplay: document.getElementById('levelDisplay'),
            scoreDisplay: document.getElementById('scoreDisplay'),
            livesDisplay: document.getElementById('livesDisplay'),
            livesContainer: document.getElementById('livesContainer'),
            timerDisplay: document.getElementById('timerDisplay'),
            timerContainer: document.getElementById('timerContainer'),
            streakDisplay: document.getElementById('streakDisplay'),
            phaseDisplay: document.getElementById('phaseDisplay'),
            instructionDisplay: document.getElementById('instructionDisplay'),
            memoryGrid: document.getElementById('memoryGrid'),
            continueBtn: document.getElementById('continueBtn'),
            continueContainer: document.getElementById('continueContainer'),
            
            // Result
            resultIcon: document.getElementById('resultIcon'),
            resultTitle: document.getElementById('resultTitle'),
            finalLevel: document.getElementById('finalLevel'),
            finalScore: document.getElementById('finalScore'),
            bestStreak: document.getElementById('bestStreak'),
            playAgainBtn: document.getElementById('playAgainBtn'),
            backToMenuBtn: document.getElementById('backToMenuBtn'),
            
            // Modal
            helpBtn: document.getElementById('helpBtn'),
            helpModal: document.getElementById('helpModal'),
            closeHelpModal: document.getElementById('closeHelpModal')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Config option buttons
        this.setupOptionButtons(this.elements.gameModeButtons);
        this.setupOptionButtons(this.elements.mistakePolicyButtons);
        this.setupOptionButtons(this.elements.startGridButtons);
        
        // Start game
        this.elements.startGameBtn.addEventListener('click', () => this.handleStartGame());
        
        // Continue button
        this.elements.continueBtn.addEventListener('click', () => this.handleContinue());
        
        // Result actions
        this.elements.playAgainBtn.addEventListener('click', () => this.handlePlayAgain());
        this.elements.backToMenuBtn.addEventListener('click', () => this.handleBackToMenu());
        
        // Help modal
        this.elements.helpBtn.addEventListener('click', () => this.showHelpModal());
        this.elements.closeHelpModal.addEventListener('click', () => this.hideHelpModal());
        this.elements.helpModal.addEventListener('click', (e) => {
            if (e.target === this.elements.helpModal) {
                this.hideHelpModal();
            }
        });
    }

    /**
     * Setup option buttons (config)
     */
    setupOptionButtons(container) {
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    /**
     * Get selected config values
     */
    getConfigValues() {
        const mode = this.elements.gameModeButtons.querySelector('.option-btn.active').dataset.value;
        const mistakePolicy = this.elements.mistakePolicyButtons.querySelector('.option-btn.active').dataset.value;
        const startGridSize = parseInt(this.elements.startGridButtons.querySelector('.option-btn.active').dataset.value);
        
        return { mode, mistakePolicy, startGridSize };
    }

    /**
     * Handle start game
     */
    handleStartGame() {
        const config = this.getConfigValues();
        
        // Update engine config
        this.engine.config.mode = config.mode;
        this.engine.config.mistakePolicy = config.mistakePolicy;
        this.engine.config.startGridSize = config.startGridSize;
        
        // Show/hide lives based on policy
        if (config.mistakePolicy === 'lose_life') {
            this.elements.livesContainer.style.display = 'block';
            this.engine.lives = 3;
        } else {
            this.elements.livesContainer.style.display = 'none';
        }
        
        // Show/hide timer based on mode
        if (config.mode === 'timed') {
            this.elements.timerContainer.style.display = 'block';
        } else {
            this.elements.timerContainer.style.display = 'none';
        }
        
        // Start game
        this.showScreen('game');
        this.engine.startGame();
        this.renderLevel();
    }

    /**
     * Render current level
     */
    renderLevel() {
        // Update stats
        this.updateStats();
        
        // Build grid
        this.buildGrid();
        
        // Start show phase
        this.startShowPhase();
    }

    /**
     * Update stats display
     */
    updateStats() {
        this.elements.levelDisplay.textContent = this.engine.level;
        this.elements.scoreDisplay.textContent = this.engine.score;
        this.elements.livesDisplay.textContent = this.engine.lives;
        this.elements.streakDisplay.textContent = this.engine.streak;
    }

    /**
     * Build grid
     */
    buildGrid() {
        const gridSize = this.engine.currentLevelParams.gridSize;
        const totalCells = gridSize * gridSize;
        
        // Clear existing grid
        this.elements.memoryGrid.innerHTML = '';
        this.elements.memoryGrid.className = `memory-grid size-${gridSize}`;
        this.currentGridCells = [];
        
        // Create cells
        for (let i = 0; i < totalCells; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell disabled';
            cell.dataset.index = i;
            
            cell.addEventListener('click', () => this.handleCellClick(i));
            
            this.elements.memoryGrid.appendChild(cell);
            this.currentGridCells.push(cell);
        }
    }

    /**
     * Start show phase
     */
    startShowPhase() {
        this.elements.phaseDisplay.textContent = 'Watch!';
        this.elements.instructionDisplay.textContent = 'Memorize the highlighted cells...';
        
        // Hide continue button
        this.elements.continueContainer.style.display = 'none';
        
        // Reset timer display immediately if in timed mode
        if (this.engine.config.mode === 'timed' && this.engine.currentLevelParams.inputTimeLimitMs > 0) {
            const timeLimit = this.engine.currentLevelParams.inputTimeLimitMs;
            this.elements.timerDisplay.textContent = (timeLimit / 1000).toFixed(1) + 's';
        }
        
        // Disable all cells
        this.currentGridCells.forEach(cell => {
            cell.classList.add('disabled');
            cell.classList.remove('showing', 'selected');
        });
        
        // Show pattern (simultaneous flash)
        setTimeout(() => {
            this.showPattern();
        }, 500);
    }

    /**
     * Show pattern to memorize
     */
    showPattern() {
        const duration = this.engine.currentLevelParams.showDurationMs;
        const mode = this.engine.config.mode;
        
        if (mode === 'sequence') {
            // Flash cells sequentially for sequence mode
            this.showPatternSequential();
        } else {
            // Flash all cells simultaneously for classic/timed mode
            this.showPatternSimultaneous(duration);
        }
    }

    /**
     * Show pattern simultaneously (classic/timed mode)
     */
    showPatternSimultaneous(duration) {
        // Highlight target cells
        this.engine.targetCells.forEach(cellIndex => {
            this.currentGridCells[cellIndex].classList.add('showing');
        });
        
        // After duration, clear and start input
        setTimeout(() => {
            this.currentGridCells.forEach(cell => {
                cell.classList.remove('showing');
            });
            
            setTimeout(() => {
                this.startInputPhase();
            }, 200);
        }, duration);
    }

    /**
     * Show pattern sequentially (sequence mode)
     */
    showPatternSequential() {
        const betweenFlash = this.engine.currentLevelParams.betweenFlashMs;
        const holdDuration = 800; // Hold all cells visible for 800ms after all shown
        let currentIndex = 0;
        
        const showNextCell = () => {
            if (currentIndex >= this.engine.targetCells.length) {
                // All cells shown, hold them visible for a moment
                setTimeout(() => {
                    // Clear all cells
                    this.currentGridCells.forEach(cell => {
                        cell.classList.remove('showing');
                    });
                    
                    // Start input phase
                    setTimeout(() => {
                        this.startInputPhase();
                    }, 200);
                }, holdDuration);
                return;
            }
            
            const cellIndex = this.engine.targetCells[currentIndex];
            const cell = this.currentGridCells[cellIndex];
            
            // Light up the cell (don't hide it yet)
            cell.classList.add('showing');
            
            // Show next cell after delay
            currentIndex++;
            setTimeout(showNextCell, betweenFlash);
        };
        
        showNextCell();
    }

    /**
     * Start input phase
     */
    startInputPhase() {
        this.engine.startInputPhase();
        
        this.elements.phaseDisplay.textContent = 'Your Turn!';
        this.elements.instructionDisplay.textContent = 
            `Select ${this.engine.currentLevelParams.targetsCount} cells`;
        
        // Enable cells
        this.currentGridCells.forEach(cell => {
            cell.classList.remove('disabled');
        });
        
        // Start timer display if timed mode
        if (this.engine.config.mode === 'timed' && this.engine.currentLevelParams.inputTimeLimitMs > 0) {
            this.startTimerDisplay();
        }
    }

    /**
     * Start timer display
     */
    startTimerDisplay() {
        const updateTimer = () => {
            if (this.engine.state !== 'INPUT') return;
            
            const remaining = this.engine.inputTimeRemaining;
            this.elements.timerDisplay.textContent = (remaining / 1000).toFixed(1) + 's';
            
            if (remaining > 0) {
                requestAnimationFrame(updateTimer);
            }
        };
        
        updateTimer();
    }

    /**
     * Handle cell click
     */
    handleCellClick(cellIndex) {
        // Debounce
        if (this.debounceTimers.has(cellIndex)) return;
        
        this.debounceTimers.set(cellIndex, setTimeout(() => {
            this.debounceTimers.delete(cellIndex);
        }, 100));
        
        // Process selection
        const success = this.engine.selectCell(cellIndex);
        
        if (success) {
            // Update all cells to reflect current selection state
            if (this.engine.config.mode === 'sequence') {
                // Update all cells for sequence mode
                this.currentGridCells.forEach((cell, idx) => {
                    const position = this.engine.selectedCells.indexOf(idx);
                    if (position >= 0) {
                        cell.classList.add('selected');
                        cell.textContent = position + 1;
                    } else {
                        cell.classList.remove('selected');
                        cell.textContent = '';
                    }
                });
            } else {
                // Update single cell for classic/timed mode
                const cell = this.currentGridCells[cellIndex];
                if (this.engine.selectedCells.includes(cellIndex)) {
                    cell.classList.add('selected');
                } else {
                    cell.classList.remove('selected');
                }
            }
        }
    }

    /**
     * Show result phase
     */
    showResult(result, scoreData) {
        this.elements.phaseDisplay.textContent = result.pass ? 'Correct! ✓' : 'Review Answer';
        
        let instruction = '';
        if (result.pass) {
            instruction = `+${scoreData.total} points!`;
        } else {
            if (this.engine.config.mode === 'sequence') {
                instruction = '✓ Correct position | ✗ Wrong | Correct sequence shown';
            } else {
                instruction = '✓ Correct | ✗ Wrong | ! Missed';
            }
        }
        this.elements.instructionDisplay.textContent = instruction;
        
        // Disable cells
        this.currentGridCells.forEach(cell => {
            cell.classList.add('disabled');
            cell.classList.remove('selected');
            cell.textContent = '';
        });
        
        // Show feedback based on mode
        if (this.engine.config.mode === 'sequence') {
            this.showSequenceResult(result);
        } else {
            this.showSetResult(result);
        }
        
        // Update score display
        this.updateStats();
        
        // Process result after delay
        setTimeout(() => {
            if (result.pass) {
                // Auto-continue on success
                const gameStatus = this.engine.processResult(result);
                
                if (gameStatus.continue) {
                    this.engine.startLevel();
                    this.renderLevel();
                } else {
                    this.showResultScreen(gameStatus.reason);
                }
            } else {
                // Wait for user to click continue on failure
                this.elements.instructionDisplay.textContent = 'Review the answer and click Continue';
                this.elements.continueContainer.style.display = 'flex';
                this.currentFailResult = result;
            }
        }, this.engine.config.resultDelayMs);
    }

    /**
     * Show result for set-based modes (classic/timed)
     */
    showSetResult(result) {
        result.hits.forEach(cellIndex => {
            const cell = this.currentGridCells[cellIndex];
            cell.classList.add('correct');
            cell.textContent = '✓'; // Checkmark
        });
        
        result.falseAlarms.forEach(cellIndex => {
            const cell = this.currentGridCells[cellIndex];
            cell.classList.add('wrong');
            cell.textContent = '✗'; // X mark
        });
        
        result.misses.forEach(cellIndex => {
            const cell = this.currentGridCells[cellIndex];
            cell.classList.add('missed');
            cell.textContent = '!'; // Exclamation mark
        });
    }

    /**
     * Show result for sequence mode
     */
    showSequenceResult(result) {
        // Show the correct sequence with numbers
        this.engine.targetCells.forEach((cellIndex, position) => {
            const cell = this.currentGridCells[cellIndex];
            cell.textContent = (position + 1).toString();
            
            // Check if user selected this cell at this position
            const userSelectedCorrectly = this.engine.selectedCells[position] === cellIndex;
            
            if (userSelectedCorrectly) {
                cell.classList.add('correct');
            } else {
                cell.classList.add('missed');
            }
        });
        
        // Mark user's wrong selections
        this.engine.selectedCells.forEach((cellIndex, position) => {
            const correctCellAtPosition = this.engine.targetCells[position];
            
            if (cellIndex !== correctCellAtPosition) {
                const cell = this.currentGridCells[cellIndex];
                // Only mark as wrong if not already marked as correct/missed
                if (!cell.classList.contains('correct') && !cell.classList.contains('missed')) {
                    cell.classList.add('wrong');
                    cell.textContent = '✗';
                }
            }
        });
    }

    /**
     * Show result screen
     */
    showResultScreen(reason) {
        this.showScreen('result');
        
        // Set icon and title based on reason
        if (reason === 'fail') {
            this.elements.resultIcon.textContent = '😔';
            this.elements.resultTitle.textContent = 'Game Over!';
        } else if (reason === 'no_lives') {
            this.elements.resultIcon.textContent = '💔';
            this.elements.resultTitle.textContent = 'Out of Lives!';
        }
        
        // Show stats
        this.elements.finalLevel.textContent = this.engine.level;
        this.elements.finalScore.textContent = this.engine.score;
        this.elements.bestStreak.textContent = this.engine.bestStreak;
    }

    /**
     * Handle continue after failure
     */
    handleContinue() {
        this.elements.continueContainer.style.display = 'none';
        
        const gameStatus = this.engine.processResult(this.currentFailResult);
        
        if (gameStatus.continue) {
            this.engine.startLevel();
            this.renderLevel();
        } else {
            this.showResultScreen(gameStatus.reason);
        }
    }

    /**
     * Handle play again
     */
    handlePlayAgain() {
        this.showScreen('game');
        this.engine.startGame();
        this.renderLevel();
    }

    /**
     * Handle back to menu
     */
    handleBackToMenu() {
        this.showScreen('config');
        this.engine.clearTimers();
    }

    /**
     * Show screen
     */
    showScreen(screenName) {
        this.elements.configScreen.classList.remove('active');
        this.elements.gameScreen.classList.remove('active');
        this.elements.resultScreen.classList.remove('active');
        
        if (screenName === 'config') {
            this.elements.configScreen.classList.add('active');
        } else if (screenName === 'game') {
            this.elements.gameScreen.classList.add('active');
        } else if (screenName === 'result') {
            this.elements.resultScreen.classList.add('active');
        }
    }

    /**
     * Show help modal
     */
    showHelpModal() {
        this.elements.helpModal.classList.add('active');
    }

    /**
     * Hide help modal
     */
    hideHelpModal() {
        this.elements.helpModal.classList.remove('active');
    }
}

// ============================================================================
// MODULE 6: GAME COORDINATOR
// Coordinates between engine and UI
// ============================================================================
class GameCoordinator {
    constructor() {
        this.config = new GameConfig();
        this.engine = new GameEngine(this.config);
        this.ui = new UIController(this.engine);
        
        this.setupEngineCallbacks();
    }

    /**
     * Setup callbacks from engine to UI
     */
    setupEngineCallbacks() {
        // Override engine's submitInput to trigger UI update
        const originalSubmitInput = this.engine.submitInput.bind(this.engine);
        this.engine.submitInput = () => {
            const data = originalSubmitInput();
            if (data) {
                this.ui.showResult(data.result, data.scoreData);
            }
        };
    }
}

// ============================================================================
// INITIALIZE GAME
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const game = new GameCoordinator();
});
