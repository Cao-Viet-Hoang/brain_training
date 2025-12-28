/**
 * Brain Training Games
 * Author: Cao Viet Hoang
 * Created: 2025
 */

// Number Hunt Game Logic
class NumberHuntGame {
    constructor() {
        this.config = {
            mode: 'missing', // 'missing' or 'extra'
            minRange: 1,
            maxRange: 100,
            roundSize: 20,
            missingCount: 3,
            extraCount: 3,
            totalRounds: 5,
            maxWrongAttempts: 3,
            baseScore: 100,
            timeBonusMax: 50,
            wrongPenalty: 10,
            timeTarget: 20,
            minRoundScore: 0
        };
        
        this.gameState = {
            currentRound: 0,
            totalScore: 0,
            rounds: [],
            currentRoundData: null,
            userAnswers: [],
            wrongAttempts: 0,
            roundStartTime: null,
            timer: null,
            roundResults: []
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
        this.loadSavedSettings();
        this.updateRemoveButtonStates(); // Initialize remove button states
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
        
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.classList.remove('active');
            }
        });
    }
    
    setupEventListeners() {
        // Mode buttons
        const modeBtns = document.querySelectorAll('.mode-btn');
        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                modeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.toggleModeUI(btn.dataset.mode);
            });
        });

        // Add range button
        document.getElementById('addRangeBtn').addEventListener('click', () => this.addRangeInput());
        
        // Delegate remove range button clicks
        document.getElementById('rangesContainer').addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-range-btn')) {
                this.removeRangeInput(e.target);
            }
        });

        // Start game
        document.getElementById('startGameBtn').addEventListener('click', () => this.startGame());
        
        // Number input
        const numberInput = document.getElementById('numberInput');
        numberInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addNumber();
            }
        });
        
        // Add number button
        document.getElementById('addNumberBtn').addEventListener('click', () => this.addNumber());
        
        // Submit answer
        document.getElementById('submitBtn').addEventListener('click', () => this.submitAnswer());
        
        // Next round
        document.getElementById('nextRoundBtn').addEventListener('click', () => this.nextRound());
        
        // Play again
        document.getElementById('playAgainBtn').addEventListener('click', () => this.resetGame());
    }
    
    toggleModeUI(mode) {
        const missingGroup = document.getElementById('missingCountGroup');
        const extraGroup = document.getElementById('extraCountGroup');
        
        if (mode === 'missing') {
            missingGroup.classList.remove('hidden');
            extraGroup.classList.add('hidden');
        } else {
            missingGroup.classList.add('hidden');
            extraGroup.classList.remove('hidden');
        }
    }
    
    addRangeInput() {
        const container = document.getElementById('rangesContainer');
        const rangeCount = container.children.length;
        
        // Create new range input element
        const rangeDiv = document.createElement('div');
        rangeDiv.className = 'range-inputs';
        rangeDiv.setAttribute('data-range-index', rangeCount);
        
        rangeDiv.innerHTML = `
            <input type="number" class="minRange" value="${rangeCount * 100 + 1}" min="0" max="999" placeholder="From" inputmode="numeric" pattern="[0-9]*">
            <span>to</span>
            <input type="number" class="maxRange" value="${(rangeCount + 1) * 100}" min="1" max="1000" placeholder="To" inputmode="numeric" pattern="[0-9]*">
            <button type="button" class="remove-range-btn" title="Remove range">✖</button>
        `;
        
        container.appendChild(rangeDiv);
        
        // Update remove button states
        this.updateRemoveButtonStates();
    }
    
    removeRangeInput(button) {
        const container = document.getElementById('rangesContainer');
        const rangeDiv = button.closest('.range-inputs');
        
        // Don't allow removing if only one range remains
        if (container.children.length <= 1) {
            return;
        }
        
        rangeDiv.remove();
        
        // Re-index remaining ranges
        Array.from(container.children).forEach((child, index) => {
            child.setAttribute('data-range-index', index);
        });
        
        // Update remove button states
        this.updateRemoveButtonStates();
    }
    
    updateRemoveButtonStates() {
        const container = document.getElementById('rangesContainer');
        const removeButtons = container.querySelectorAll('.remove-range-btn');
        
        // Disable remove button if only one range exists
        if (removeButtons.length === 1) {
            removeButtons[0].disabled = true;
        } else {
            removeButtons.forEach(btn => btn.disabled = false);
        }
    }
    
    getAllRanges() {
        const container = document.getElementById('rangesContainer');
        const ranges = [];
        
        container.querySelectorAll('.range-inputs').forEach(rangeDiv => {
            const minInput = rangeDiv.querySelector('.minRange');
            const maxInput = rangeDiv.querySelector('.maxRange');
            
            const min = parseInt(minInput.value);
            const max = parseInt(maxInput.value);
            
            if (!isNaN(min) && !isNaN(max) && min < max) {
                ranges.push({ min, max });
            }
        });
        
        return ranges;
    }
    
    addRange() {
        const minInput = document.getElementById('newMinRange');
        const maxInput = document.getElementById('newMaxRange');
        
        const min = parseInt(minInput.value);
        const max = parseInt(maxInput.value);
        
        if (isNaN(min) || isNaN(max)) {
            alert('Please enter valid numbers for both min and max!');
            return;
        }
        
        if (min >= max) {
            alert('Minimum must be less than maximum!');
            return;
        }
        
        // Check for overlapping ranges
        const newRange = { min, max };
        if (this.hasOverlappingRanges([...this.config.ranges, newRange])) {
            alert('This range overlaps with an existing range! Please enter a non-overlapping range.');
            return;
        }
        
        // Add to config
        this.config.ranges.push(newRange);
        
        // Clear inputs
        minInput.value = '';
        maxInput.value = '';
        
        // Re-render ranges
        this.renderRanges();
    }
    
    removeRange(index) {
        if (this.config.ranges.length <= 1) {
            alert('You must have at least one range!');
            return;
        }
        
        this.config.ranges.splice(index, 1);
        this.renderRanges();
    }
    
    renderRanges() {
        const container = document.getElementById('rangesList');
        container.innerHTML = '';

        if (this.config.ranges.length === 0) {
            container.innerHTML = '<div class="empty-state">No ranges added yet</div>';
            return;
        }

        // Check for overlaps
        const hasOverlap = this.hasOverlappingRanges(this.config.ranges);

        this.config.ranges.forEach((range, index) => {
            const item = document.createElement('div');
            item.className = 'range-row';
            if (hasOverlap) {
                item.classList.add('invalid');
            }

            item.innerHTML = `
                <div class="range-inputs-inline">
                    <input type="number" class="range-min-input" value="${range.min}" min="0" max="999" data-index="${index}" inputmode="numeric" pattern="[0-9]*">
                    <span class="range-separator">to</span>
                    <input type="number" class="range-max-input" value="${range.max}" min="1" max="1000" data-index="${index}" inputmode="numeric" pattern="[0-9]*">
                </div>
                <button class="btn-remove-range" onclick="game.removeRange(${index})">Remove</button>
            `;

            container.appendChild(item);

            // Add event listeners for inline editing
            const minInput = item.querySelector('.range-min-input');
            const maxInput = item.querySelector('.range-max-input');

            minInput.addEventListener('change', (e) => this.updateRangeValue(index, 'min', e.target.value));
            maxInput.addEventListener('change', (e) => this.updateRangeValue(index, 'max', e.target.value));
        });

        // Show error if overlapping
        if (hasOverlap) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'ranges-error';
            errorDiv.textContent = '⚠️ Some ranges are overlapping! Please fix before starting the game.';
            container.appendChild(errorDiv);
        }
    }

    updateRangeValue(index, field, value) {
        const numValue = parseInt(value);
        if (isNaN(numValue)) return;

        this.config.ranges[index][field] = numValue;

        // Re-render to update validation state
        this.renderRanges();
    }
    
    hasOverlappingRanges(ranges) {
        for (let i = 0; i < ranges.length; i++) {
            for (let j = i + 1; j < ranges.length; j++) {
                const r1 = ranges[i];
                const r2 = ranges[j];
                
                // Check if ranges overlap (have more than just touching at boundary)
                // Two ranges [a,b] and [c,d] overlap if they share more than one number
                // Using < instead of <= allows adjacent ranges (e.g., 1-50 and 50-100)
                if (r1.min < r2.max && r2.min < r1.max) {
                    return true;
                }
            }
        }
        return false;
    }
    
    getTotalRangeSize() {
        // Calculate total size of all ranges (sum of individual range sizes)
        return this.config.ranges.reduce((sum, range) => {
            return sum + (range.max - range.min + 1);
        }, 0);
    }
    
    getUnionNumbers() {
        // Get all numbers from all ranges
        const allNumbers = [];
        this.config.ranges.forEach(range => {
            for (let i = range.min; i <= range.max; i++) {
                allNumbers.push(i);
            }
        });
        return allNumbers;
    }
    
    loadSavedSettings() {
        if (!window.GAME_SETTINGS) {
            console.log('[NumberHunt] No saved settings, using defaults');
            // Add default range to list
            this.config.ranges = [{min: 1, max: 100}];
            this.renderRanges();
            return;
        }
        
        const settings = window.GAME_SETTINGS;
        
        // Load mode
        if (settings.mode) {
            const modeBtn = document.querySelector(`.mode-btn[data-mode="${settings.mode}"]`);
            if (modeBtn) {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                modeBtn.classList.add('active');
                this.toggleModeUI(settings.mode);
            }
        }
        
        // Load ranges
        if (settings.ranges && Array.isArray(settings.ranges) && settings.ranges.length > 0) {
            this.config.ranges = settings.ranges;
        } else {
            // No saved ranges, use default
            this.config.ranges = [{min: 1, max: 100}];
        }
        this.renderRanges();
        
        // Load all other config values
        const configFields = [
            'roundSize', 'missingCount', 'extraCount',
            'totalRounds', 'maxWrongAttempts'
        ];
        
        configFields.forEach(field => {
            if (settings[field] !== undefined) {
                const input = document.getElementById(field);
                if (input) {
                    input.value = settings[field];
                }
            }
        });
        
        console.log('[NumberHunt] Settings restored:', settings);
    }
    
    saveCurrentSettings() {
        if (typeof window.updateGameSettings !== 'function') return;
        
        try {
            const activeMode = document.querySelector('.mode-btn.active');
            const mode = activeMode ? activeMode.dataset.mode : 'missing';
            
            const settings = {
                mode,
                ranges: this.config.ranges,
                roundSize: parseInt(document.getElementById('roundSize').value),
                missingCount: parseInt(document.getElementById('missingCount').value),
                extraCount: parseInt(document.getElementById('extraCount').value),
                totalRounds: parseInt(document.getElementById('totalRounds').value),
                maxWrongAttempts: parseInt(document.getElementById('maxWrongAttempts').value)
            };
            
            window.updateGameSettings(settings);
            console.log('[NumberHunt] Settings saved:', settings);
        } catch (error) {
            console.error('[NumberHunt] Error saving settings:', error);
        }
    }
    
    validateConfig() {
        const activeMode = document.querySelector('.mode-btn.active');
        const mode = activeMode ? activeMode.dataset.mode : 'missing';
        
        // Get all ranges from UI
        const ranges = this.getAllRanges();
        
        // Validate ranges
        if (ranges.length === 0) {
            alert('Please add at least one valid number range!');
            return false;
        }
        
        // Check for overlapping ranges
        if (this.hasOverlappingRanges(ranges)) {
            alert('Some ranges are overlapping! Please fix the ranges before starting.');
            return false;
        }
        
        // Temporarily store ranges for validation
        const tempRanges = this.config.ranges;
        this.config.ranges = ranges;
        
        const totalRangeSize = this.getTotalRangeSize();
        const roundSize = parseInt(document.getElementById('roundSize').value);
        const missingCount = parseInt(document.getElementById('missingCount').value);
        const extraCount = parseInt(document.getElementById('extraCount').value);
        const totalRounds = parseInt(document.getElementById('totalRounds').value);
        const maxWrongAttempts = parseInt(document.getElementById('maxWrongAttempts').value);
        
        // Restore ranges
        this.config.ranges = tempRanges;
        
        if (roundSize > totalRangeSize) {
            alert(`Round size cannot be larger than total range size (${totalRangeSize})!`);
            return false;
        }
        
        if (mode === 'missing') {
            if (roundSize <= missingCount) {
                alert('Round size must be greater than missing count!');
                return false;
            }
            if (missingCount > totalRangeSize - roundSize) {
                alert('Missing count is too large for the given ranges!');
                return false;
            }
        } else {
            if (extraCount >= roundSize) {
                alert('Extra count must be less than round size!');
                return false;
            }
        }
        
        if (isNaN(totalRounds) || totalRounds < 1 || totalRounds > 20) {
            alert('Total rounds must be between 1 and 20!');
            return false;
        }
        
        if (isNaN(maxWrongAttempts) || maxWrongAttempts < 1 || maxWrongAttempts > 10) {
            alert('Max wrong attempts must be between 1 and 10!');
            return false;
        }
        
        return true;
    }
    
    startGame() {
        if (!this.validateConfig()) return;
        
        // Save settings
        this.saveCurrentSettings();
        
        // Load config from UI
        const activeMode = document.querySelector('.mode-btn.active');
        this.config.mode = activeMode ? activeMode.dataset.mode : 'missing';
        
        // Get all ranges from UI
        this.config.ranges = this.getAllRanges();
        
        // If no valid ranges, use default
        if (this.config.ranges.length === 0) {
            const minInput = document.querySelector('.minRange');
            const maxInput = document.querySelector('.maxRange');
            const min = parseInt(minInput.value) || 1;
            const max = parseInt(maxInput.value) || 100;
            this.config.ranges = [{ min, max }];
        }
        
        this.config.roundSize = parseInt(document.getElementById('roundSize').value);
        this.config.missingCount = parseInt(document.getElementById('missingCount').value);
        this.config.extraCount = parseInt(document.getElementById('extraCount').value);
        this.config.totalRounds = parseInt(document.getElementById('totalRounds').value);
        this.config.maxWrongAttempts = parseInt(document.getElementById('maxWrongAttempts').value);
        // Use default scoring values from config
        // baseScore, timeBonusMax, wrongPenalty, timeTarget, minRoundScore stay at defaults
        
        // Reset game state
        this.gameState = {
            currentRound: 0,
            totalScore: 0,
            rounds: [],
            currentRoundData: null,
            userAnswers: [],
            wrongAttempts: 0,
            roundStartTime: null,
            timer: null,
            roundResults: []
        };
        
        // Generate all rounds
        this.generateAllRounds();
        
        // Start first round
        this.showScreen('game');
        this.startRound();
    }
    
    generateAllRounds() {
        this.gameState.rounds = [];
        
        for (let i = 0; i < this.config.totalRounds; i++) {
            if (this.config.mode === 'missing') {
                this.gameState.rounds.push(this.generateMissingRound());
            } else {
                this.gameState.rounds.push(this.generateExtraRound());
            }
        }
    }
    
    generateMissingRound() {
        const { roundSize, missingCount } = this.config;
        const allNumbers = this.getUnionNumbers();
        
        // Shuffle all available numbers
        this.shuffleArray(allNumbers);
        
        // Take roundSize + missingCount numbers to create the full sequence
        const neededCount = roundSize + missingCount;
        if (allNumbers.length < neededCount) {
            // If not enough numbers, use what we have
            const fullSequence = allNumbers.slice(0, Math.min(allNumbers.length, neededCount));
            this.shuffleArray(fullSequence);
            
            const actualMissing = Math.min(missingCount, Math.floor(fullSequence.length / 2));
            const missingNumbers = fullSequence.slice(0, actualMissing).sort((a, b) => a - b);
            const displayNumbers = fullSequence.slice(actualMissing);
            this.shuffleArray(displayNumbers);
            
            return {
                type: 'missing',
                displayNumbers,
                correctAnswers: missingNumbers,
                rangeStart: Math.min(...fullSequence),
                rangeEnd: Math.max(...fullSequence)
            };
        }
        
        // Take the numbers we need
        const fullSequence = allNumbers.slice(0, neededCount);
        this.shuffleArray(fullSequence);
        
        // Remove random numbers (these become missing)
        const missingNumbers = fullSequence.slice(0, missingCount).sort((a, b) => a - b);
        
        // Create display numbers (full - missing)
        const displayNumbers = fullSequence.filter(n => !missingNumbers.includes(n));
        this.shuffleArray(displayNumbers);
        
        return {
            type: 'missing',
            displayNumbers,
            correctAnswers: missingNumbers,
            rangeStart: Math.min(...fullSequence),
            rangeEnd: Math.max(...fullSequence)
        };
    }
    
    generateExtraRound() {
        const { roundSize, extraCount } = this.config;
        const allNumbers = this.getUnionNumbers();
        
        // Shuffle all available numbers
        this.shuffleArray(allNumbers);
        
        // Generate base numbers (unique)
        const baseCount = roundSize - extraCount;
        if (allNumbers.length < baseCount) {
            // Not enough numbers, adjust
            const available = Math.min(allNumbers.length, roundSize);
            const actualBase = available - extraCount;
            const baseNumbers = allNumbers.slice(0, actualBase);
            
            // Select numbers to duplicate
            const extraNumbers = [];
            this.shuffleArray(baseNumbers);
            for (let i = 0; i < Math.min(extraCount, baseNumbers.length); i++) {
                extraNumbers.push(baseNumbers[i]);
            }
            extraNumbers.sort((a, b) => a - b);
            
            // Create display numbers
            const displayNumbers = [...baseNumbers, ...extraNumbers];
            this.shuffleArray(displayNumbers);
            
            return {
                type: 'extra',
                displayNumbers,
                correctAnswers: extraNumbers,
                baseNumbers
            };
        }
        
        const baseNumbers = allNumbers.slice(0, baseCount);
        
        // Select numbers to duplicate
        const extraNumbers = [];
        this.shuffleArray(baseNumbers);
        for (let i = 0; i < extraCount; i++) {
            extraNumbers.push(baseNumbers[i]);
        }
        extraNumbers.sort((a, b) => a - b);
        
        // Create display numbers (base + duplicates)
        const displayNumbers = [...baseNumbers, ...extraNumbers];
        this.shuffleArray(displayNumbers);
        
        return {
            type: 'extra',
            displayNumbers,
            correctAnswers: extraNumbers,
            baseNumbers
        };
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    startRound() {
        this.gameState.currentRound++;
        this.gameState.currentRoundData = this.gameState.rounds[this.gameState.currentRound - 1];
        this.gameState.userAnswers = [];
        this.gameState.wrongAttempts = 0;
        this.gameState.roundStartTime = Date.now();
        
        // Update UI
        this.renderRound();
        this.startTimer();
        
        // Hide result panel
        document.getElementById('roundResult').classList.add('hidden');
        
        // Enable input
        document.getElementById('numberInput').disabled = false;
        document.getElementById('addNumberBtn').disabled = false;
    }
    
    renderRound() {
        const { currentRound, currentRoundData } = this.gameState;
        
        // Update header
        document.getElementById('currentMode').textContent = 
            this.config.mode === 'missing' ? 'Missing' : 'Extra';
        document.getElementById('currentRound').textContent = currentRound;
        document.getElementById('totalRoundsDisplay').textContent = this.config.totalRounds;
        document.getElementById('maxWrongDisplay').textContent = this.config.maxWrongAttempts;
        document.getElementById('wrongCount').textContent = 0;
        document.getElementById('currentScore').textContent = this.gameState.totalScore;
        
        // Render number board
        const board = document.getElementById('numberBoard');
        board.innerHTML = '';
        
        currentRoundData.displayNumbers.forEach(num => {
            const chip = document.createElement('div');
            chip.className = 'number-chip';
            chip.textContent = num;
            chip.dataset.number = num;
            board.appendChild(chip);
        });
        
        // Clear answer list
        this.updateAnswerList();
        
        // Clear input
        document.getElementById('numberInput').value = '';
        this.hideInputError();
        
        // Update placeholder
        const placeholder = this.config.mode === 'missing' 
            ? 'Type missing number...'
            : 'Type extra/duplicate number...';
        document.getElementById('numberInput').placeholder = placeholder;
        
        // Update progress
        const targetCount = this.config.mode === 'missing' 
            ? this.config.missingCount 
            : this.config.extraCount;
        document.getElementById('answerProgress').textContent = 
            `Entered 0 / ${targetCount} numbers`;
    }
    
    startTimer() {
        let elapsed = 0;
        
        const updateTimer = () => {
            elapsed = Math.floor((Date.now() - this.gameState.roundStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            document.getElementById('roundTimer').textContent = 
                `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        };
        
        updateTimer();
        this.gameState.timer = setInterval(updateTimer, 1000);
    }
    
    stopTimer() {
        if (this.gameState.timer) {
            clearInterval(this.gameState.timer);
            this.gameState.timer = null;
        }
    }
    
    addNumber() {
        const input = document.getElementById('numberInput');
        const value = input.value.trim();
        
        // Validate input
        if (!value) {
            this.showInputError('Please enter a number');
            return;
        }
        
        const number = parseInt(value);
        if (isNaN(number)) {
            this.showInputError('Invalid number');
            this.shakeInput();
            return;
        }
        
        // Check for duplicate in user answers
        if (this.gameState.userAnswers.includes(number)) {
            this.showInputError('Number already entered');
            this.shakeInput();
            return;
        }
        
        // Validate against range/rules
        const isValid = this.validateNumber(number);
        
        if (!isValid.valid) {
            this.showInputError(isValid.message);
            this.shakeInput();
            this.incrementWrongAttempt();
            return;
        }
        
        // Check if answer is correct
        const isCorrect = this.gameState.currentRoundData.correctAnswers.includes(number);
        
        if (!isCorrect) {
            this.showInputError('Wrong! This is not a correct answer');
            this.shakeInput();
            this.incrementWrongAttempt();
            return;
        }
        
        // Add to answers
        this.gameState.userAnswers.push(number);
        this.hideInputError();
        input.value = '';
        
        // Update UI
        this.updateAnswerList();
        
        // Check if ready to submit
        const targetCount = this.config.mode === 'missing' 
            ? this.config.missingCount 
            : this.config.extraCount;
        
        if (this.gameState.userAnswers.length >= targetCount) {
            document.getElementById('submitBtn').disabled = false;
        }
    }
    
    validateNumber(number) {
        if (this.config.mode === 'missing') {
            const { rangeStart, rangeEnd } = this.gameState.currentRoundData;
            if (number < rangeStart || number > rangeEnd) {
                return { valid: false, message: `Number must be between ${rangeStart} and ${rangeEnd}` };
            }
        } else {
            // For extra mode, number should be in display numbers
            if (!this.gameState.currentRoundData.displayNumbers.includes(number)) {
                return { valid: false, message: 'Number not found on board' };
            }
        }
        
        return { valid: true };
    }
    
    incrementWrongAttempt() {
        this.gameState.wrongAttempts++;
        document.getElementById('wrongCount').textContent = this.gameState.wrongAttempts;
        
        if (this.gameState.wrongAttempts >= this.config.maxWrongAttempts) {
            this.failRound();
        }
    }
    
    showInputError(message) {
        const errorEl = document.getElementById('inputError');
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }
    
    hideInputError() {
        const errorEl = document.getElementById('inputError');
        errorEl.classList.add('hidden');
    }
    
    shakeInput() {
        const input = document.getElementById('numberInput');
        input.classList.add('error');
        setTimeout(() => input.classList.remove('error'), 300);
    }
    
    updateAnswerList() {
        const container = document.getElementById('answerList');
        container.innerHTML = '';
        
        this.gameState.userAnswers.forEach(num => {
            const chip = document.createElement('div');
            chip.className = 'answer-chip';
            chip.innerHTML = `
                <span>${num}</span>
                <button class="chip-remove" onclick="game.removeAnswer(${num})">×</button>
            `;
            container.appendChild(chip);
        });
        
        // Update progress
        const targetCount = this.config.mode === 'missing' 
            ? this.config.missingCount 
            : this.config.extraCount;
        document.getElementById('answerProgress').textContent = 
            `Entered ${this.gameState.userAnswers.length} / ${targetCount} numbers`;
    }
    
    removeAnswer(number) {
        this.gameState.userAnswers = this.gameState.userAnswers.filter(n => n !== number);
        this.updateAnswerList();
        
        // Disable submit if not enough
        const targetCount = this.config.mode === 'missing' 
            ? this.config.missingCount 
            : this.config.extraCount;
        
        if (this.gameState.userAnswers.length < targetCount) {
            document.getElementById('submitBtn').disabled = true;
        }
    }
    
    submitAnswer() {
        this.stopTimer();
        
        // Disable input
        document.getElementById('numberInput').disabled = true;
        document.getElementById('addNumberBtn').disabled = true;
        document.getElementById('submitBtn').disabled = true;
        
        // Check if correct
        const correctAnswers = this.gameState.currentRoundData.correctAnswers;
        const userAnswers = [...this.gameState.userAnswers].sort((a, b) => a - b);
        const correctSorted = [...correctAnswers].sort((a, b) => a - b);
        
        const isCorrect = JSON.stringify(userAnswers) === JSON.stringify(correctSorted);
        
        // Calculate score
        const timeSpent = Math.floor((Date.now() - this.gameState.roundStartTime) / 1000);
        const score = this.calculateScore(isCorrect, timeSpent, this.gameState.wrongAttempts);
        
        // Update total score
        if (isCorrect) {
            this.gameState.totalScore += score.total;
        }
        
        // Save result
        this.gameState.roundResults.push({
            round: this.gameState.currentRound,
            isCorrect,
            userAnswers: [...this.gameState.userAnswers],
            correctAnswers: [...correctAnswers],
            timeSpent,
            wrongAttempts: this.gameState.wrongAttempts,
            score: score
        });
        
        // Show result
        this.showRoundResult(isCorrect, score, timeSpent);
    }
    
    calculateScore(isCorrect, timeSpent, wrongAttempts) {
        if (!isCorrect) {
            return {
                base: 0,
                timeBonus: 0,
                penalty: 0,
                total: 0
            };
        }
        
        const base = this.config.baseScore;
        
        // Calculate time bonus
        let timeBonus = 0;
        if (timeSpent <= this.config.timeTarget) {
            timeBonus = this.config.timeBonusMax;
        } else {
            // Gradual decrease
            const ratio = this.config.timeTarget / timeSpent;
            timeBonus = Math.floor(this.config.timeBonusMax * ratio);
            timeBonus = Math.max(0, timeBonus);
        }
        
        // Calculate penalty
        const penalty = wrongAttempts * this.config.wrongPenalty;
        
        // Total
        let total = base + timeBonus - penalty;
        total = Math.max(this.config.minRoundScore, total);
        
        return {
            base,
            timeBonus,
            penalty,
            total
        };
    }
    
    showRoundResult(isCorrect, score, timeSpent) {
        const resultPanel = document.getElementById('roundResult');
        const resultTitle = document.getElementById('resultTitle');
        
        // Update title
        resultTitle.textContent = isCorrect ? '✅ Correct!' : '❌ Wrong!';
        resultTitle.className = `result-title ${isCorrect ? 'correct' : 'wrong'}`;
        
        // Update score breakdown
        document.getElementById('breakdownBase').textContent = `+${score.base}`;
        document.getElementById('breakdownTime').textContent = `+${score.timeBonus}`;
        document.getElementById('breakdownTime').className = 'breakdown-value positive';
        document.getElementById('breakdownPenalty').textContent = `-${score.penalty}`;
        document.getElementById('breakdownPenalty').className = 'breakdown-value negative';
        document.getElementById('breakdownTotal').textContent = isCorrect ? `+${score.total}` : '0';
        document.getElementById('breakdownTotal').className = `breakdown-value ${isCorrect ? 'positive' : ''}`;
        
        // Update stats
        document.getElementById('roundTimeSpent').textContent = `${timeSpent}s`;
        document.getElementById('roundWrongAttempts').textContent = 
            `${this.gameState.wrongAttempts} / ${this.config.maxWrongAttempts}`;
        
        // Show correct answers
        const correctContainer = document.getElementById('correctAnswers');
        correctContainer.innerHTML = '';
        this.gameState.currentRoundData.correctAnswers.forEach(num => {
            const chip = document.createElement('div');
            const wasUserAnswer = this.gameState.userAnswers.includes(num);
            chip.className = `answer-chip ${wasUserAnswer ? 'correct' : ''}`;
            chip.textContent = num;
            correctContainer.appendChild(chip);
        });
        
        // Highlight on board
        this.highlightBoardAnswers();
        
        // Update score display
        document.getElementById('currentScore').textContent = this.gameState.totalScore;
        
        // Show panel
        resultPanel.classList.remove('hidden');
    }
    
    highlightBoardAnswers() {
        const correctAnswers = this.gameState.currentRoundData.correctAnswers;
        const userAnswers = this.gameState.userAnswers;
        
        // This is for extra mode - highlight correct answers on board
        if (this.config.mode === 'extra') {
            const chips = document.querySelectorAll('.number-chip');
            chips.forEach(chip => {
                const num = parseInt(chip.dataset.number);
                if (correctAnswers.includes(num)) {
                    chip.classList.add('correct-highlight');
                }
            });
        }
    }
    
    failRound() {
        this.stopTimer();
        
        // Disable input
        document.getElementById('numberInput').disabled = true;
        document.getElementById('addNumberBtn').disabled = true;
        document.getElementById('submitBtn').disabled = true;
        
        const timeSpent = Math.floor((Date.now() - this.gameState.roundStartTime) / 1000);
        const score = { base: 0, timeBonus: 0, penalty: 0, total: 0 };
        
        // Save result
        this.gameState.roundResults.push({
            round: this.gameState.currentRound,
            isCorrect: false,
            userAnswers: [...this.gameState.userAnswers],
            correctAnswers: [...this.gameState.currentRoundData.correctAnswers],
            timeSpent,
            wrongAttempts: this.gameState.wrongAttempts,
            score: score,
            failed: true
        });
        
        // Show result
        this.showRoundResult(false, score, timeSpent);
    }
    
    nextRound() {
        if (this.gameState.currentRound >= this.config.totalRounds) {
            this.showFinalResults();
        } else {
            this.startRound();
        }
    }
    
    showFinalResults() {
        this.stopTimer();
        this.showScreen('result');
        
        // Calculate stats
        const totalRounds = this.gameState.roundResults.length;
        const correctRounds = this.gameState.roundResults.filter(r => r.isCorrect).length;
        const failedRounds = totalRounds - correctRounds;
        const accuracy = totalRounds > 0 ? Math.round((correctRounds / totalRounds) * 100) : 0;
        
        const totalTime = this.gameState.roundResults.reduce((sum, r) => sum + r.timeSpent, 0);
        const avgTime = totalRounds > 0 ? Math.round(totalTime / totalRounds) : 0;
        
        // Update UI
        document.getElementById('finalScore').textContent = this.gameState.totalScore;
        document.getElementById('roundsCompleted').textContent = totalRounds;
        document.getElementById('correctRounds').textContent = correctRounds;
        document.getElementById('failedRounds').textContent = failedRounds;
        document.getElementById('accuracy').textContent = `${accuracy}%`;
        document.getElementById('totalTime').textContent = this.formatTime(totalTime);
        document.getElementById('avgTime').textContent = `${avgTime}s`;
        
        // Render round summary
        this.renderRoundSummary();
    }
    
    renderRoundSummary() {
        const container = document.getElementById('roundSummary');
        container.innerHTML = '';
        
        this.gameState.roundResults.forEach(result => {
            const item = document.createElement('div');
            item.className = `summary-item ${result.isCorrect ? 'correct' : 'failed'}`;
            
            const status = result.failed ? 'FAILED (Too many wrong attempts)' : 
                          result.isCorrect ? 'CORRECT' : 'WRONG';
            
            item.innerHTML = `
                <div class="summary-header">
                    <span>Round ${result.round}</span>
                    <span>${status}</span>
                </div>
                <div class="summary-details">
                    Score: ${result.score.total} | 
                    Time: ${result.timeSpent}s | 
                    Wrong: ${result.wrongAttempts}/${this.config.maxWrongAttempts} |
                    Your answer: [${result.userAnswers.join(', ')}] |
                    Correct: [${result.correctAnswers.join(', ')}]
                </div>
            `;
            
            container.appendChild(item);
        });
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${String(secs).padStart(2, '0')}`;
    }
    
    resetGame() {
        this.stopTimer();
        this.showScreen('config');
        this.loadSavedSettings();
    }
    
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        this.screens[screenName].classList.add('active');
    }
}

// Initialize game
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new NumberHuntGame();
});
