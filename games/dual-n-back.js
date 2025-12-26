// ============================================================================
// DUAL N-BACK GAME - Complete Implementation
// ============================================================================

// ============================================================================
// MODULE 1: SEQUENCE GENERATOR
// Generates position and letter sequences with controlled match rates
// ============================================================================
class SequenceGenerator {
    constructor(config) {
        this.config = config;
        this.positions = [];
        this.letters = [];
    }

    /**
     * Generate complete sequence for the entire game
     */
    generate() {
        const maxAttempts = 20;
        let attempt = 0;
        let success = false;

        while (attempt < maxAttempts && !success) {
            attempt++;
            this.generateSequence();
            success = this.validate();
            
            if (!success && attempt < maxAttempts) {
                console.log(`Sequence validation failed, regenerating... (attempt ${attempt})`);
            }
        }

        if (!success) {
            console.warn('Could not generate perfect sequence, using best attempt');
        }

        return {
            positions: this.positions,
            letters: this.letters
        };
    }

    /**
     * Generate the actual sequence
     */
    generateSequence() {
        const { totalTrials, N, gridSize, lettersPool } = this.config;
        const totalCells = gridSize * gridSize;
        
        this.positions = [];
        this.letters = [];

        // Step 1: Generate buffer phase (trials 1 to N) - random
        for (let i = 0; i < N; i++) {
            this.positions.push(this.randomInt(0, totalCells - 1));
            this.letters.push(this.randomChoice(lettersPool));
        }

        // Step 2: Calculate target match counts for active phase
        const activeTrials = totalTrials - N;
        const targetPosMatches = Math.round(activeTrials * this.config.targetMatchRatePosition);
        const targetLetMatches = Math.round(activeTrials * this.config.targetMatchRateLetter);
        const targetDualMatches = Math.min(
            Math.round(activeTrials * this.config.targetDualMatchRate),
            Math.min(targetPosMatches, targetLetMatches)
        );

        // Step 3: Create trial type assignments
        const trialTypes = this.createTrialTypeAssignments(
            activeTrials,
            targetPosMatches,
            targetLetMatches,
            targetDualMatches
        );

        // Step 4: Generate active phase trials based on assignments
        for (let i = 0; i < activeTrials; i++) {
            const trialType = trialTypes[i];
            const currentIndex = N + i;
            const lookbackIndex = currentIndex - N;

            switch (trialType) {
                case 'dual':
                    // Both match
                    this.positions.push(this.positions[lookbackIndex]);
                    this.letters.push(this.letters[lookbackIndex]);
                    break;

                case 'position':
                    // Position matches, letter doesn't
                    this.positions.push(this.positions[lookbackIndex]);
                    this.letters.push(this.getRandomDifferent(
                        lettersPool,
                        this.letters[lookbackIndex]
                    ));
                    break;

                case 'letter':
                    // Letter matches, position doesn't
                    this.letters.push(this.letters[lookbackIndex]);
                    this.positions.push(this.getRandomDifferent(
                        Array.from({length: totalCells}, (_, i) => i),
                        this.positions[lookbackIndex]
                    ));
                    break;

                case 'none':
                    // Neither matches
                    this.positions.push(this.getRandomDifferent(
                        Array.from({length: totalCells}, (_, i) => i),
                        this.positions[lookbackIndex]
                    ));
                    this.letters.push(this.getRandomDifferent(
                        lettersPool,
                        this.letters[lookbackIndex]
                    ));
                    break;
            }
        }

        // Step 5: Apply pattern avoidance
        this.applyPatternAvoidance();
    }

    /**
     * Create randomized trial type assignments
     */
    createTrialTypeAssignments(activeTrials, targetPosMatches, targetLetMatches, targetDualMatches) {
        const assignments = [];
        
        // Add dual matches
        for (let i = 0; i < targetDualMatches; i++) {
            assignments.push('dual');
        }
        
        // Add position-only matches
        for (let i = 0; i < targetPosMatches - targetDualMatches; i++) {
            assignments.push('position');
        }
        
        // Add letter-only matches
        for (let i = 0; i < targetLetMatches - targetDualMatches; i++) {
            assignments.push('letter');
        }
        
        // Fill remaining with no matches
        while (assignments.length < activeTrials) {
            assignments.push('none');
        }
        
        // Shuffle to randomize order
        return this.shuffleArray(assignments);
    }

    /**
     * Validate the generated sequence
     */
    validate() {
        const { totalTrials, N } = this.config;
        const activeTrials = totalTrials - N;
        
        let actualPosMatches = 0;
        let actualLetMatches = 0;
        let actualDualMatches = 0;

        // Count matches in active phase
        for (let i = N; i < totalTrials; i++) {
            const posMatch = this.positions[i] === this.positions[i - N];
            const letMatch = this.letters[i] === this.letters[i - N];
            
            if (posMatch) actualPosMatches++;
            if (letMatch) actualLetMatches++;
            if (posMatch && letMatch) actualDualMatches++;
        }

        // Calculate expected counts
        const expectedPosMatches = Math.round(activeTrials * this.config.targetMatchRatePosition);
        const expectedLetMatches = Math.round(activeTrials * this.config.targetMatchRateLetter);
        const expectedDualMatches = Math.round(activeTrials * this.config.targetDualMatchRate);

        // Allow tolerance of 1 trial
        const tolerance = 1;
        const posValid = Math.abs(actualPosMatches - expectedPosMatches) <= tolerance;
        const letValid = Math.abs(actualLetMatches - expectedLetMatches) <= tolerance;
        const dualValid = Math.abs(actualDualMatches - expectedDualMatches) <= tolerance;

        return posValid && letValid && dualValid;
    }

    /**
     * Apply pattern avoidance rules
     */
    applyPatternAvoidance() {
        const maxConsecutive = 2;
        
        // Fix consecutive repeats in positions
        for (let i = 2; i < this.positions.length; i++) {
            if (this.positions[i] === this.positions[i-1] && 
                this.positions[i] === this.positions[i-2]) {
                // Too many consecutive same positions
                const availablePositions = Array.from(
                    {length: this.config.gridSize * this.config.gridSize}, 
                    (_, idx) => idx
                ).filter(p => p !== this.positions[i]);
                this.positions[i] = this.randomChoice(availablePositions);
            }
        }

        // Fix consecutive repeats in letters
        for (let i = 2; i < this.letters.length; i++) {
            if (this.letters[i] === this.letters[i-1] && 
                this.letters[i] === this.letters[i-2]) {
                // Too many consecutive same letters
                const availableLetters = this.config.lettersPool.filter(
                    l => l !== this.letters[i]
                );
                this.letters[i] = this.randomChoice(availableLetters);
            }
        }
    }

    // ========================================================================
    // UTILITY METHODS
    // ========================================================================

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    getRandomDifferent(array, excludeValue) {
        const filtered = array.filter(item => item !== excludeValue);
        if (filtered.length === 0) return array[0]; // Fallback
        return this.randomChoice(filtered);
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

// ============================================================================
// MODULE 2: ANALYTICS
// Tracks and analyzes game performance
// ============================================================================
class Analytics {
    constructor() {
        this.reset();
    }

    reset() {
        this.trialEvents = [];
        this.trialRecords = []; // Store complete trial information
        this.stats = {
            position: {
                hits: 0,
                misses: 0,
                falseAlarms: 0,
                correctRejects: 0
            },
            letter: {
                hits: 0,
                misses: 0,
                falseAlarms: 0,
                correctRejects: 0
            },
            dualMatchBonuses: 0,
            reactionTimes: []
        };
    }

    /**
     * Log a trial event
     */
    logTrial(trialData) {
        this.trialEvents.push({
            ...trialData,
            timestamp: Date.now()
        });
    }

    /**
     * Record complete trial information for review
     */
    recordTrialComplete(trialNumber, position, letter, correctPos, correctLet, 
                        pressedPos, pressedLet, isBuffer, posResult, letResult, scoreChange) {
        this.trialRecords.push({
            trialNumber,
            position,
            letter,
            correctPos,
            correctLet,
            pressedPos,
            pressedLet,
            isBuffer,
            posResult,
            letResult,
            scoreChange
        });
    }

    /**
     * Record trial result for scoring
     */
    recordTrialResult(trialNumber, correctPos, correctLet, pressedPos, pressedLet, reactionTime) {
        // Position channel
        if (correctPos && pressedPos) {
            this.stats.position.hits++;
        } else if (correctPos && !pressedPos) {
            this.stats.position.misses++;
        } else if (!correctPos && pressedPos) {
            this.stats.position.falseAlarms++;
        } else {
            this.stats.position.correctRejects++;
        }

        // Letter channel
        if (correctLet && pressedLet) {
            this.stats.letter.hits++;
        } else if (correctLet && !pressedLet) {
            this.stats.letter.misses++;
        } else if (!correctLet && pressedLet) {
            this.stats.letter.falseAlarms++;
        } else {
            this.stats.letter.correctRejects++;
        }

        // Dual match bonus
        if (correctPos && correctLet && pressedPos && pressedLet) {
            this.stats.dualMatchBonuses++;
        }

        // Reaction time
        if (reactionTime > 0) {
            this.stats.reactionTimes.push(reactionTime);
        }
    }

    /**
     * Calculate final statistics
     */
    calculateFinalStats() {
        const posHits = this.stats.position.hits;
        const posMisses = this.stats.position.misses;
        const letHits = this.stats.letter.hits;
        const letMisses = this.stats.letter.misses;

        const posAccuracy = (posHits + posMisses) > 0 
            ? (posHits / (posHits + posMisses) * 100).toFixed(1) 
            : 'N/A';

        const letAccuracy = (letHits + letMisses) > 0 
            ? (letHits / (letHits + letMisses) * 100).toFixed(1) 
            : 'N/A';

        const avgReactionTime = this.stats.reactionTimes.length > 0
            ? (this.stats.reactionTimes.reduce((a, b) => a + b, 0) / this.stats.reactionTimes.length).toFixed(0)
            : 'N/A';

        return {
            position: {
                accuracy: posAccuracy,
                hits: posHits,
                misses: posMisses,
                falseAlarms: this.stats.position.falseAlarms,
                correctRejects: this.stats.position.correctRejects
            },
            letter: {
                accuracy: letAccuracy,
                hits: letHits,
                misses: letMisses,
                falseAlarms: this.stats.letter.falseAlarms,
                correctRejects: this.stats.letter.correctRejects
            },
            dualMatchBonuses: this.stats.dualMatchBonuses,
            avgReactionTime: avgReactionTime
        };
    }
}

// ============================================================================
// MODULE 3: GAME ENGINE
// Manages game state, trials, and scoring
// ============================================================================
class GameEngine {
    constructor(config, analytics) {
        this.config = config;
        this.analytics = analytics;
        this.state = 'IDLE';
        this.reset();
    }

    reset() {
        this.currentTrial = 0;
        this.score = 0;
        this.sequence = null;
        this.trialStartTime = 0;
        this.pressedPosition = false;
        this.pressedLetter = false;
        this.trialTimer = null;
        this.analytics.reset();
    }

    /**
     * Start the game
     */
    start() {
        this.reset();
        this.state = 'RUNNING';
        
        // Generate sequence
        const generator = new SequenceGenerator(this.config);
        this.sequence = generator.generate();
        
        return true;
    }

    /**
     * Check if current trial is in buffer phase
     */
    isBufferPhase() {
        return this.currentTrial < this.config.N;
    }

    /**
     * Get current trial data
     */
    getCurrentTrialData() {
        if (!this.sequence) return null;
        
        return {
            trialNumber: this.currentTrial,
            position: this.sequence.positions[this.currentTrial],
            letter: this.sequence.letters[this.currentTrial],
            isBuffer: this.isBufferPhase()
        };
    }

    /**
     * Handle button press
     */
    handleButtonPress(buttonType) {
        if (this.isBufferPhase()) {
            return; // Ignore presses during buffer phase
        }

        const reactionTime = Date.now() - this.trialStartTime;

        if (buttonType === 'position') {
            if (!this.pressedPosition) {
                this.pressedPosition = true;
                this.analytics.logTrial({
                    trial: this.currentTrial,
                    action: 'position_press',
                    reactionTime: reactionTime
                });
            }
        } else if (buttonType === 'letter') {
            if (!this.pressedLetter) {
                this.pressedLetter = true;
                this.analytics.logTrial({
                    trial: this.currentTrial,
                    action: 'letter_press',
                    reactionTime: reactionTime
                });
            }
        }
    }

    /**
     * Start a new trial
     */
    startTrial() {
        this.pressedPosition = false;
        this.pressedLetter = false;
        this.trialStartTime = Date.now();
    }

    /**
     * End current trial and calculate score
     */
    endTrial() {
        if (this.isBufferPhase()) {
            // No scoring during buffer phase
            return {
                isBuffer: true,
                scoreChange: 0
            };
        }

        // Determine correct answers
        const lookbackIndex = this.currentTrial - this.config.N;
        const correctPos = this.sequence.positions[this.currentTrial] === 
                          this.sequence.positions[lookbackIndex];
        const correctLet = this.sequence.letters[this.currentTrial] === 
                          this.sequence.letters[lookbackIndex];

        // Calculate score change
        let scoreChange = 0;
        let posResult = '';
        let letResult = '';

        // Position channel scoring
        if (correctPos && this.pressedPosition) {
            scoreChange += 10; // Hit
            posResult = 'hit';
        } else if (correctPos && !this.pressedPosition) {
            scoreChange -= 4; // Miss
            posResult = 'miss';
        } else if (!correctPos && this.pressedPosition) {
            scoreChange -= 6; // False Alarm
            posResult = 'false-alarm';
        } else {
            // Correct Reject - no points
            posResult = 'correct-reject';
        }

        // Letter channel scoring
        if (correctLet && this.pressedLetter) {
            scoreChange += 10; // Hit
            letResult = 'hit';
        } else if (correctLet && !this.pressedLetter) {
            scoreChange -= 4; // Miss
            letResult = 'miss';
        } else if (!correctLet && this.pressedLetter) {
            scoreChange -= 6; // False Alarm
            letResult = 'false-alarm';
        } else {
            // Correct Reject - no points
            letResult = 'correct-reject';
        }

        // Dual match bonus
        if (correctPos && correctLet && this.pressedPosition && this.pressedLetter) {
            scoreChange += 8;
        }

        this.score += scoreChange;

        // Record in analytics
        const reactionTime = this.pressedPosition || this.pressedLetter 
            ? Date.now() - this.trialStartTime 
            : 0;
            
        this.analytics.recordTrialResult(
            this.currentTrial,
            correctPos,
            correctLet,
            this.pressedPosition,
            this.pressedLetter,
            reactionTime
        );

        return {
            isBuffer: false,
            scoreChange: scoreChange,
            correctPos: correctPos,
            correctLet: correctLet,
            pressedPos: this.pressedPosition,
            pressedLet: this.pressedLetter,
            posResult: posResult,
            letResult: letResult
        };
    }

    /**
     * Advance to next trial
     */
    nextTrial() {
        this.currentTrial++;
        
        if (this.currentTrial >= this.config.totalTrials) {
            this.state = 'FINISHED';
            return false;
        }
        
        return true;
    }

    /**
     * Get final results
     */
    getFinalResults() {
        return {
            score: this.score,
            stats: this.analytics.calculateFinalStats(),
            trialRecords: this.analytics.trialRecords
        };
    }

    isFinished() {
        return this.state === 'FINISHED';
    }
}

// ============================================================================
// MODULE 4: UI CONTROLLER
// Handles all UI rendering and user interactions
// ============================================================================
class UIController {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.screens = {
            config: document.getElementById('configScreen'),
            game: document.getElementById('gameScreen'),
            result: document.getElementById('resultScreen')
        };
        this.currentTrialTimeout = null;
        this.init();
        this.loadSavedSettings();
    }
    
    /**
     * Load saved settings from localStorage into UI
     */
    loadSavedSettings() {
        if (!window.GAME_SETTINGS) return;
        
        const settings = window.GAME_SETTINGS;
        
        // Restore N-back level button
        if (settings.N !== undefined) {
            document.querySelectorAll('#nBackLevelButtons .option-btn').forEach(btn => {
                btn.classList.remove('active');
                if (parseInt(btn.dataset.value) === settings.N) {
                    btn.classList.add('active');
                }
            });
        }
        
        // Restore grid size button
        if (settings.gridSize !== undefined) {
            document.querySelectorAll('#gridSizeButtons .option-btn').forEach(btn => {
                btn.classList.remove('active');
                if (parseInt(btn.dataset.value) === settings.gridSize) {
                    btn.classList.add('active');
                }
            });
        }
        
        // Restore range inputs
        if (settings.totalTrials !== undefined) {
            document.getElementById('totalTrials').value = settings.totalTrials;
            document.getElementById('totalTrialsValue').textContent = settings.totalTrials;
        }
        if (settings.stimulusDurationMs !== undefined) {
            document.getElementById('stimulusDuration').value = settings.stimulusDurationMs;
            document.getElementById('stimulusDurationValue').textContent = settings.stimulusDurationMs + 'ms';
        }
        if (settings.intervalBetweenMs !== undefined) {
            document.getElementById('interTrialInterval').value = settings.intervalBetweenMs;
            document.getElementById('interTrialIntervalValue').textContent = settings.intervalBetweenMs + 'ms';
        }
        
        console.log('[DualNBack] Settings restored:', settings);
    }
    
    /**
     * Save current settings to localStorage
     */
    saveCurrentSettings() {
        if (typeof window.updateGameSettings !== 'function') return;
        
        try {
            const nBackBtn = document.querySelector('#nBackLevelButtons .option-btn.active');
            const gridSizeBtn = document.querySelector('#gridSizeButtons .option-btn.active');
            const totalTrials = parseInt(document.getElementById('totalTrials').value);
            const stimulusDurationMs = parseInt(document.getElementById('stimulusDuration').value);
            const intervalBetweenMs = parseInt(document.getElementById('interTrialInterval').value);
            
            // Only save if valid
            if (nBackBtn && gridSizeBtn && !isNaN(totalTrials) && !isNaN(stimulusDurationMs) && !isNaN(intervalBetweenMs)) {
                window.updateGameSettings({
                    N: parseInt(nBackBtn.dataset.value),
                    gridSize: parseInt(gridSizeBtn.dataset.value),
                    totalTrials,
                    stimulusDurationMs,
                    intervalBetweenMs,
                    targetMatchRatePosition: 0.25,
                    targetMatchRateLetter: 0.25
                });
                console.log('[DualNBack] Settings saved');
            }
        } catch (error) {
            console.error('[DualNBack] Error saving settings:', error);
        }
    }

    init() {
        this.setupConfigScreen();
        this.setupGameScreen();
        this.setupResultScreen();
        this.setupHelpModal();
        this.setupKeyboardControls();
    }

    // ========================================================================
    // CONFIG SCREEN
    // ========================================================================
    setupConfigScreen() {
        // Option button handlers for N-Back Level
        const nBackButtons = document.querySelectorAll('#nBackLevelButtons .option-btn');
        nBackButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                nBackButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Option button handlers for Grid Size
        const gridSizeButtons = document.querySelectorAll('#gridSizeButtons .option-btn');
        gridSizeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                gridSizeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Range input handlers
        const ranges = [
            { id: 'totalTrials', valueId: 'totalTrialsValue' },
            { id: 'stimulusDuration', valueId: 'stimulusDurationValue', suffix: 'ms' },
            { id: 'interTrialInterval', valueId: 'interTrialIntervalValue', suffix: 'ms' }
        ];

        ranges.forEach(range => {
            const input = document.getElementById(range.id);
            const valueDisplay = document.getElementById(range.valueId);
            
            input.addEventListener('input', (e) => {
                let value = e.target.value;
                if (range.suffix === 'ms') {
                    valueDisplay.textContent = `${value}ms`;
                } else {
                    valueDisplay.textContent = value;
                }
            });
        });

        // Start button
        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.startGame();
        });
    }

    startGame() {
        // Save settings when starting game
        this.saveCurrentSettings();
        
        // Get configuration from UI
        const nBackBtn = document.querySelector('#nBackLevelButtons .option-btn.active');
        const gridSizeBtn = document.querySelector('#gridSizeButtons .option-btn.active');
        
        const config = {
            N: parseInt(nBackBtn.dataset.value),
            gridSize: parseInt(gridSizeBtn.dataset.value),
            totalTrials: parseInt(document.getElementById('totalTrials').value),
            stimulusDurationMs: parseInt(document.getElementById('stimulusDuration').value),
            interTrialIntervalMs: parseInt(document.getElementById('interTrialInterval').value),
            lettersPool: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
            targetMatchRatePosition: 0.25,
            targetMatchRateLetter: 0.25,
            targetDualMatchRate: 0.07
        };

        config.responseWindowMs = config.stimulusDurationMs + config.interTrialIntervalMs;

        // Update game engine config
        this.gameEngine.config = config;
        
        // Start the game
        if (this.gameEngine.start()) {
            this.showScreen('game');
            this.setupGameGrid();
            this.updateGameInfo();
            this.startNextTrial();
        }
    }

    // ========================================================================
    // GAME SCREEN
    // ========================================================================
    setupGameScreen() {
        // Button handlers
        document.getElementById('positionMatchBtn').addEventListener('click', () => {
            this.handleMatchButton('position');
        });

        document.getElementById('letterMatchBtn').addEventListener('click', () => {
            this.handleMatchButton('letter');
        });
    }

    setupGameGrid() {
        const gridContainer = document.getElementById('gridContainer');
        const gridSize = this.gameEngine.config.gridSize;
        
        gridContainer.innerHTML = `<div class="position-grid size-${gridSize}"></div>`;
        
        const grid = gridContainer.querySelector('.position-grid');
        const totalCells = gridSize * gridSize;
        
        for (let i = 0; i < totalCells; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.index = i;
            grid.appendChild(cell);
        }
    }

    startNextTrial() {
        if (this.gameEngine.isFinished()) {
            this.showResults();
            return;
        }

        this.gameEngine.startTrial();
        const trialData = this.gameEngine.getCurrentTrialData();
        
        // Update UI
        this.updateGameInfo();
        this.renderStimulus(trialData);
        
        // Enable/disable buttons based on phase
        const isBuffer = this.gameEngine.isBufferPhase();
        document.getElementById('positionMatchBtn').disabled = isBuffer;
        document.getElementById('letterMatchBtn').disabled = isBuffer;
        
        // Update phase indicator
        const phaseIndicator = document.getElementById('phaseIndicator');
        if (isBuffer) {
            phaseIndicator.classList.remove('active-phase');
            phaseIndicator.querySelector('.phase-text').textContent = 'Memorize...';
        } else {
            phaseIndicator.classList.add('active-phase');
            phaseIndicator.querySelector('.phase-text').textContent = 'Active';
        }

        // Schedule trial end
        const config = this.gameEngine.config;
        this.currentTrialTimeout = setTimeout(() => {
            this.endCurrentTrial();
        }, config.stimulusDurationMs + config.interTrialIntervalMs);
    }

    renderStimulus(trialData) {
        const letterDisplay = document.getElementById('letterDisplay');
        const gridContainer = document.getElementById('gridContainer');
        const cells = document.querySelectorAll('.grid-cell');
        
        // Add fade out effect first
        letterDisplay.classList.add('fade-out');
        gridContainer.classList.add('fade-out');
        
        // Short delay then update content with animations
        setTimeout(() => {
            // Update letter
            letterDisplay.textContent = trialData.letter;
            
            // Update grid highlight
            cells.forEach(cell => cell.classList.remove('highlight'));
            cells[trialData.position].classList.add('highlight');
            
            // Remove fade out and trigger blink animation
            letterDisplay.classList.remove('fade-out');
            gridContainer.classList.remove('fade-out');
            letterDisplay.classList.add('blink');
            
            // Remove blink class after animation
            setTimeout(() => {
                letterDisplay.classList.remove('blink');
            }, 250);
        }, 150);
        
        // Reset button states
        document.getElementById('positionMatchBtn').classList.remove('pressed');
        document.getElementById('letterMatchBtn').classList.remove('pressed');
    }

    handleMatchButton(buttonType) {
        if (this.gameEngine.isBufferPhase()) {
            return;
        }

        this.gameEngine.handleButtonPress(buttonType);
        
        // Visual feedback
        const button = buttonType === 'position' 
            ? document.getElementById('positionMatchBtn')
            : document.getElementById('letterMatchBtn');
        
        button.classList.add('pressed');
    }

    endCurrentTrial() {
        const result = this.gameEngine.endTrial();
        const trialData = this.gameEngine.getCurrentTrialData();
        
        // Record complete trial for review
        if (!result.isBuffer) {
            this.gameEngine.analytics.recordTrialComplete(
                trialData.trialNumber,
                trialData.position,
                trialData.letter,
                result.correctPos,
                result.correctLet,
                result.pressedPos,
                result.pressedLet,
                false,
                result.posResult,
                result.letResult,
                result.scoreChange
            );
        } else {
            // Still record buffer trials for review
            this.gameEngine.analytics.recordTrialComplete(
                trialData.trialNumber,
                trialData.position,
                trialData.letter,
                false,
                false,
                false,
                false,
                true,
                'buffer',
                'buffer',
                0
            );
        }
        
        // Update score if not buffer
        if (!result.isBuffer) {
            this.updateScore();
        }
        
        // Move to next trial
        this.gameEngine.nextTrial();
        
        // Small delay before next trial
        setTimeout(() => {
            this.startNextTrial();
        }, 200);
    }

    updateGameInfo() {
        const config = this.gameEngine.config;
        document.getElementById('trialCounter').textContent = 
            `${this.gameEngine.currentTrial + 1} / ${config.totalTrials}`;
        document.getElementById('nBackDisplay').textContent = `N=${config.N}`;
        this.updateScore();
    }

    updateScore() {
        document.getElementById('scoreDisplay').textContent = this.gameEngine.score;
    }

    // ========================================================================
    // RESULT SCREEN
    // ========================================================================
    setupResultScreen() {
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.resetGame();
        });
    }

    showResults() {
        const results = this.gameEngine.getFinalResults();
        
        // Update score
        document.getElementById('finalScore').textContent = results.score;
        
        // Update position stats
        document.getElementById('posAccuracy').textContent = 
            results.stats.position.accuracy !== 'N/A' 
                ? `${results.stats.position.accuracy}%` 
                : results.stats.position.accuracy;
        document.getElementById('posHits').textContent = results.stats.position.hits;
        document.getElementById('posMisses').textContent = results.stats.position.misses;
        document.getElementById('posFalseAlarms').textContent = results.stats.position.falseAlarms;
        
        // Update letter stats
        document.getElementById('letterAccuracy').textContent = 
            results.stats.letter.accuracy !== 'N/A' 
                ? `${results.stats.letter.accuracy}%` 
                : results.stats.letter.accuracy;
        document.getElementById('letterHits').textContent = results.stats.letter.hits;
        document.getElementById('letterMisses').textContent = results.stats.letter.misses;
        document.getElementById('letterFalseAlarms').textContent = results.stats.letter.falseAlarms;
        
        // Update overall stats
        document.getElementById('dualMatchCount').textContent = results.stats.dualMatchBonuses;
        document.getElementById('avgReactionTime').textContent = 
            results.stats.avgReactionTime !== 'N/A' 
                ? `${results.stats.avgReactionTime}ms` 
                : results.stats.avgReactionTime;
        
        // Generate review list
        this.generateReviewList(results.trialRecords);
        
        this.showScreen('result');
    }

    generateReviewList(trialRecords) {
        const reviewList = document.getElementById('reviewList');
        const gridSize = this.gameEngine.config.gridSize;
        const N = this.gameEngine.config.N;
        reviewList.innerHTML = '';
        
        trialRecords.forEach(trial => {
            const item = document.createElement('div');
            item.className = 'review-item';
            
            // Determine item class
            if (trial.isBuffer) {
                item.classList.add('buffer');
            } else {
                const posCorrect = (trial.posResult === 'hit' || trial.posResult === 'correct-reject');
                const letCorrect = (trial.letResult === 'hit' || trial.letResult === 'correct-reject');
                
                if (posCorrect && letCorrect) {
                    item.classList.add('correct');
                } else if (!posCorrect && !letCorrect) {
                    item.classList.add('incorrect');
                } else {
                    item.classList.add('partial');
                }
            }
            
            // Create mini grid
            const totalCells = gridSize * gridSize;
            let gridHTML = `<div class="trial-grid-mini size-${gridSize}">`;
            for (let i = 0; i < totalCells; i++) {
                const highlighted = i === trial.position ? 'highlight' : '';
                gridHTML += `<div class="mini-cell ${highlighted}"></div>`;
            }
            gridHTML += '</div>';
            
            // Create expected vs actual display
            let statusHTML = '';
            if (!trial.isBuffer) {
                // What was expected (N-back matches)
                const expectedPos = trial.correctPos ? '📍' : '';
                const expectedLet = trial.correctLet ? '🔤' : '';
                const expected = expectedPos || expectedLet ? `${expectedPos}${expectedLet}` : '—';
                
                // What user pressed
                const userPos = trial.pressedPos ? '📍' : '';
                const userLet = trial.pressedLet ? '🔤' : '';
                const userPressed = userPos || userLet ? `${userPos}${userLet}` : '—';
                
                statusHTML = `
                    <div class="trial-status">
                        <div class="status-row">
                            <span class="status-label">Match:</span>
                            <span class="status-value">${expected}</span>
                        </div>
                        <div class="status-row">
                            <span class="status-label">You:</span>
                            <span class="status-value">${userPressed}</span>
                        </div>
                    </div>
                `;
            } else {
                statusHTML = '<div class="buffer-label">Buffer Phase</div>';
            }
            
            item.innerHTML = `
                <div class="trial-number">Trial ${trial.trialNumber + 1}</div>
                <div class="trial-display">
                    <div class="trial-letter">${trial.letter}</div>
                    ${gridHTML}
                </div>
                ${statusHTML}
            `;
            
            reviewList.appendChild(item);
        });
    }

    resetGame() {
        if (this.currentTrialTimeout) {
            clearTimeout(this.currentTrialTimeout);
        }
        this.showScreen('config');
    }

    // ========================================================================
    // UTILITY METHODS
    // ========================================================================
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        this.screens[screenName].classList.add('active');
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

    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            // Only handle during game screen
            if (!this.screens.game.classList.contains('active')) {
                return;
            }

            const key = e.key.toLowerCase();
            
            if (key === 'p') {
                e.preventDefault();
                this.handleMatchButton('position');
            } else if (key === 'l') {
                e.preventDefault();
                this.handleMatchButton('letter');
            }
        });
    }
}

// ============================================================================
// MAIN GAME INITIALIZATION
// ============================================================================
let gameEngine;
let uiController;

document.addEventListener('DOMContentLoaded', async () => {
    // Create initial config (will be overwritten when game starts)
    const initialConfig = {
        N: 2,
        gridSize: 3,
        totalTrials: 40,
        stimulusDurationMs: 900,
        interTrialIntervalMs: 600,
        responseWindowMs: 1500,
        lettersPool: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
        targetMatchRatePosition: 0.25,
        targetMatchRateLetter: 0.25,
        targetDualMatchRate: 0.07
    };

    // Initialize modules
    const analytics = new Analytics();
    gameEngine = new GameEngine(initialConfig, analytics);
    uiController = new UIController(gameEngine);

    console.log('Dual N-Back game initialized successfully!');

    // Check if multiplayer mode
    const roomId = sessionStorage.getItem('multiplayerRoomId');
    const role = sessionStorage.getItem('multiplayerRole');

    if (roomId && typeof DualNBackMultiplayerAdapter !== 'undefined') {
        console.log('[DualNBack] Checking multiplayer room validity:', { roomId, role });

        // Initialize Firebase first
        if (typeof initFirebase === 'function') {
            initFirebase();
        }

        // Validate room exists and is still active
        try {
            if (!database) {
                throw new Error('Firebase not initialized');
            }
            const roomRef = database.ref(`rooms/${roomId}`);
            const snapshot = await roomRef.once('value');
            const roomData = snapshot.val();

            // Check if room exists and is in valid state
            if (!roomData || roomData.meta.status === 'closed' || roomData.meta.status === 'finished') {
                console.log('[DualNBack] Room no longer valid, clearing multiplayer state');
                sessionStorage.removeItem('multiplayerRoomId');
                sessionStorage.removeItem('multiplayerRole');
                return; // Exit and let game run in single player mode
            }

            console.log('[DualNBack] Room valid, initializing multiplayer mode');
            const adapter = new DualNBackMultiplayerAdapter(gameEngine, uiController);

            if (role === 'host') {
                adapter.initAsHost(roomId);
            } else if (role === 'player') {
                adapter.initAsPlayer(roomId);
            }

            // Expose adapter globally for debugging
            window.dualNBackAdapter = adapter;
        } catch (error) {
            console.error('[DualNBack] Error checking room validity:', error);
            sessionStorage.removeItem('multiplayerRoomId');
            sessionStorage.removeItem('multiplayerRole');
        }
    }
});
