// ============================================================================
// WORD RECALL GAME - Complete Implementation
// ============================================================================

// ============================================================================
// MODULE 1: WORD BANK SERVICE
// Loads and provides access to the word bank
// ============================================================================
class WordBankService {
    constructor() {
        this.wordBank = [];
        this.loaded = false;
    }

    /**
     * Load word bank from JSON file
     */
    async load() {
        try {
            const response = await fetch('../data/wordbank.json');
            if (!response.ok) {
                throw new Error('Failed to load word bank');
            }
            this.wordBank = await response.json();
            this.loaded = true;
            console.log(`Loaded ${this.wordBank.length} words from word bank`);
            return true;
        } catch (error) {
            console.error('Error loading word bank:', error);
            return false;
        }
    }

    /**
     * Filter words by criteria
     */
    filter({ difficulties = [], minLength = 0, maxLength = 20, exclude = [] }) {
        return this.wordBank.filter(word => {
            if (exclude.includes(word.word)) return false;
            if (difficulties.length > 0 && !difficulties.includes(word.difficulty)) return false;
            if (word.length < minLength || word.length > maxLength) return false;
            return true;
        });
    }

    /**
     * Get all words
     */
    getAll() {
        return [...this.wordBank];
    }
}

// ============================================================================
// MODULE 2: WORD SELECTOR
// Selects words for each round based on difficulty and anti-repeat rules
// ============================================================================
class WordSelector {
    constructor(wordBankService, config) {
        this.wordBankService = wordBankService;
        this.config = config;
        this.recentWords = []; // FIFO queue
    }

    /**
     * Select K words for a round
     */
    selectWords(K, roundIndex) {
        const difficultyRange = this.getDifficultyRange(roundIndex);
        const lengthRange = this.getLengthRange(roundIndex);
        
        // Filter available words
        let availableWords = this.wordBankService.filter({
            difficulties: difficultyRange,
            minLength: lengthRange.min,
            maxLength: lengthRange.max,
            exclude: this.recentWords
        });

        // If pool is too small, allow reuse of oldest words
        if (availableWords.length < K) {
            console.warn('Word pool too small, allowing reuse of older words');
            availableWords = this.wordBankService.filter({
                difficulties: difficultyRange,
                minLength: lengthRange.min,
                maxLength: lengthRange.max,
                exclude: [] // No exclusions
            });
        }

        // Shuffle and select
        const shuffled = this.shuffle(availableWords, this.config.seed);
        const selected = shuffled.slice(0, K).map(w => w.word);

        // Update recent words
        this.updateRecentWords(selected);

        return selected;
    }

    /**
     * Get difficulty range for round
     */
    getDifficultyRange(roundIndex) {
        if (roundIndex < 3) return ['A1'];                // Round 0-2: Beginner
        if (roundIndex < 6) return ['A1', 'A2'];          // Round 3-5: Easy
        if (roundIndex < 9) return ['A2'];                // Round 6-8: Elementary
        if (roundIndex < 12) return ['A2', 'B1'];         // Round 9-11: Pre-Intermediate
        if (roundIndex < 15) return ['B1'];               // Round 12-14: Intermediate
        if (roundIndex < 18) return ['B1', 'B2'];         // Round 15-17: Upper-Intermediate
        if (roundIndex < 21) return ['B2'];               // Round 18-20: Advanced
        return ['B2', 'C1'];                              // Round 21+: Expert
    }

    /**
     * Get length range for round
     */
    getLengthRange(roundIndex) {
        if (roundIndex < 5) return { min: 3, max: 7 };    // Short words
        if (roundIndex < 10) return { min: 4, max: 9 };   // Medium words
        if (roundIndex < 15) return { min: 5, max: 11 };  // Long words
        return { min: 5, max: 14 };                       // Very long words
    }

    /**
     * Update recent words list (FIFO)
     */
    updateRecentWords(newWords) {
        this.recentWords.push(...newWords);
        
        // Keep only the last antiRepeatWindow words
        const maxSize = this.config.antiRepeatWindow;
        if (this.recentWords.length > maxSize) {
            this.recentWords = this.recentWords.slice(-maxSize);
        }
    }

    /**
     * Shuffle array (with optional seed for reproducibility)
     */
    shuffle(array, seed = null) {
        const arr = [...array];
        
        if (seed !== null) {
            // Seeded random (simple LCG)
            let random = this.seededRandom(seed);
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        } else {
            // Standard Fisher-Yates shuffle
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        }
        
        return arr;
    }

    /**
     * Seeded random generator
     */
    seededRandom(seed) {
        let state = seed;
        return function() {
            state = (state * 1664525 + 1013904223) % 4294967296;
            return state / 4294967296;
        };
    }
}

// ============================================================================
// MODULE 3: DECOY GENERATOR
// Generates similar but different words to challenge memory
// ============================================================================
class DecoyGenerator {
    constructor(wordBankService, config) {
        this.wordBankService = wordBankService;
        this.config = config;
    }

    /**
     * Generate decoys for a word list
     */
    generateDecoys(wordList, K, roundIndex) {
        const decoyCount = Math.round(K * this.config.decoyCountRatio);
        const decoys = [];
        const wordSet = new Set(wordList);
        const difficulty = this.getDecoyDifficulty(roundIndex);

        // Get all words from word bank
        const allWords = this.wordBankService.getAll();

        // Strategy based on round
        if (roundIndex < 4) {
            // Easy: different POS, different length
            decoys.push(...this.generateEasyDecoys(wordList, allWords, decoyCount, wordSet));
        } else if (roundIndex < 8) {
            // Medium: same POS, similar length
            decoys.push(...this.generateMediumDecoys(wordList, allWords, decoyCount, wordSet));
        } else {
            // Hard: similar words
            decoys.push(...this.generateHardDecoys(wordList, allWords, decoyCount, wordSet));
        }

        // Ensure we have enough decoys
        while (decoys.length < decoyCount) {
            const randomWord = allWords[Math.floor(Math.random() * allWords.length)];
            if (!wordSet.has(randomWord.word) && !decoys.includes(randomWord.word)) {
                decoys.push(randomWord.word);
            }
        }

        return decoys.slice(0, decoyCount);
    }

    /**
     * Easy decoys: very different words
     */
    generateEasyDecoys(wordList, allWords, count, wordSet) {
        const decoys = [];
        const targetWords = wordList.map(w => 
            allWords.find(aw => aw.word === w)
        ).filter(w => w);

        for (const word of allWords) {
            if (decoys.length >= count) break;
            if (wordSet.has(word.word)) continue;

            // Different POS and significantly different length
            const isDifferent = targetWords.every(tw => 
                word.pos !== tw.pos && Math.abs(word.length - tw.length) > 3
            );

            if (isDifferent && !decoys.includes(word.word)) {
                decoys.push(word.word);
            }
        }

        return decoys;
    }

    /**
     * Medium decoys: somewhat similar words
     */
    generateMediumDecoys(wordList, allWords, count, wordSet) {
        const decoys = [];
        const targetWords = wordList.map(w => 
            allWords.find(aw => aw.word === w)
        ).filter(w => w);

        for (const word of allWords) {
            if (decoys.length >= count) break;
            if (wordSet.has(word.word)) continue;

            // Same POS or similar length
            const isSimilar = targetWords.some(tw => 
                word.pos === tw.pos || Math.abs(word.length - tw.length) <= 2
            );

            if (isSimilar && !decoys.includes(word.word)) {
                decoys.push(word.word);
            }
        }

        return decoys;
    }

    /**
     * Hard decoys: very similar words
     */
    generateHardDecoys(wordList, allWords, count, wordSet) {
        const decoys = [];
        const targetWords = wordList.map(w => 
            allWords.find(aw => aw.word === w)
        ).filter(w => w);

        for (const targetWord of targetWords) {
            if (decoys.length >= count) break;

            // Find words with edit distance 1-2
            for (const word of allWords) {
                if (decoys.length >= count) break;
                if (wordSet.has(word.word)) continue;
                if (decoys.includes(word.word)) continue;

                const distance = this.editDistance(targetWord.word, word.word);
                const hasCommonPrefix = this.hasCommonPrefix(targetWord.word, word.word, 3);
                const hasCommonSuffix = this.hasCommonSuffix(targetWord.word, word.word, 3);

                if (distance <= 2 || hasCommonPrefix || hasCommonSuffix) {
                    // Use percentage-based comparison for frequency rank (20% threshold)
                    const avgRank = (word.frequencyRank + targetWord.frequencyRank) / 2;
                    const threshold = avgRank * 0.2;
                    
                    if (word.pos === targetWord.pos && 
                        Math.abs(word.frequencyRank - targetWord.frequencyRank) < threshold) {
                        decoys.push(word.word);
                    }
                }
            }
        }

        return decoys;
    }

    /**
     * Calculate edit distance (Levenshtein)
     */
    editDistance(a, b) {
        const matrix = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    /**
     * Check common prefix
     */
    hasCommonPrefix(a, b, minLength) {
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
            if (a[i] !== b[i]) {
                return i >= minLength;
            }
        }
        return Math.min(a.length, b.length) >= minLength;
    }

    /**
     * Check common suffix
     */
    hasCommonSuffix(a, b, minLength) {
        const reversedA = a.split('').reverse().join('');
        const reversedB = b.split('').reverse().join('');
        return this.hasCommonPrefix(reversedA, reversedB, minLength);
    }

    /**
     * Get decoy difficulty strategy
     */
    getDecoyDifficulty(roundIndex) {
        if (roundIndex < 4) return 'easy';      // Round 0-3: Very different words
        if (roundIndex < 8) return 'medium';    // Round 4-7: Somewhat similar
        if (roundIndex < 12) return 'hard';     // Round 8-11: Very similar
        if (roundIndex < 16) return 'hard';     // Round 12-15: Very similar
        return 'hard';                          // Round 16+: Maximum difficulty
    }
}

// ============================================================================
// MODULE 4: SCORE CALCULATOR
// Calculates scores based on performance
// ============================================================================
class ScoreCalculator {
    constructor(config) {
        this.config = config;
    }

    /**
     * Calculate round score
     */
    calculate(roundIndex, hits, falseAlarms, misses, timeRemaining, timeLimit) {
        const baseScore = 50 + roundIndex * 10;
        const hitScore = hits * 12;
        const penalty = falseAlarms * 10 + misses * 6;
        const speedBonus = Math.floor((timeRemaining / timeLimit) * 40);

        const totalAdd = baseScore + hitScore + speedBonus - penalty;

        return {
            baseScore,
            hitScore,
            penalty,
            speedBonus,
            totalAdd: Math.max(0, totalAdd)
        };
    }

    /**
     * Check if round passed
     */
    checkPass(falseAlarms, misses, roundIndex) {
        const allowMistakes = this.config.allowMistakes;
        
        if (allowMistakes === 0) {
            // Strict mode
            return falseAlarms === 0 && misses === 0;
        } else {
            // Relaxed mode
            return (falseAlarms + misses) <= allowMistakes;
        }
    }
}

// ============================================================================
// MODULE 5: GAME ENGINE
// Main game state machine and orchestration
// ============================================================================
class GameEngine {
    constructor(config, wordBankService) {
        this.config = config;
        this.wordBankService = wordBankService;
        this.wordSelector = new WordSelector(wordBankService, config);
        this.decoyGenerator = new DecoyGenerator(wordBankService, config);
        this.scoreCalculator = new ScoreCalculator(config);
        
        this.reset();
    }

    /**
     * Reset game state
     */
    reset() {
        this.state = 'IDLE';
        this.currentRound = 0;
        this.totalScore = 0;
        this.roundData = [];
        this.currentWordList = [];
        this.currentDecoys = [];
        this.currentOptions = [];
        this.selectedWords = new Set();
        this.roundStartTime = 0;
        this.phaseStartTime = 0;
        this.timers = [];
        this.stats = {
            totalHits: 0,
            totalFalse: 0,
            totalMiss: 0,
            totalTime: 0
        };
    }

    /**
     * Start new game
     */
    startGame() {
        this.reset();
        this.currentRound = 0;
        this.nextRound();
    }

    /**
     * Start next round
     */
    nextRound() {
        this.currentRound++;
        
        if (this.currentRound > this.config.sessionRounds) {
            this.endGame();
            return;
        }

        // Calculate K for this round
        const K = this.calculateK(this.currentRound - 1);

        // Select words
        this.currentWordList = this.wordSelector.selectWords(K, this.currentRound - 1);
        
        // Generate decoys
        this.currentDecoys = this.decoyGenerator.generateDecoys(
            this.currentWordList, 
            K, 
            this.currentRound - 1
        );

        // Create test options
        this.currentOptions = this.shuffleArray([
            ...this.currentWordList,
            ...this.currentDecoys
        ]);

        // Reset selections
        this.selectedWords.clear();
        this.roundStartTime = Date.now();

        // Start memorize phase
        this.setState('MEMORIZE');
    }

    /**
     * Calculate K (number of words) for round
     */
    calculateK(roundIndex) {
        return Math.min(
            this.config.maxK,
            this.config.startK + Math.floor(roundIndex / 2)
        );
    }

    /**
     * Calculate memorize time for round
     */
    calculateMemorizeTime(roundIndex) {
        // Giảm chậm hơn: chỉ 60ms mỗi round thay vì 120ms
        return Math.max(
            this.config.memorizeMsMin,
            this.config.memorizeMsBase - roundIndex * 60
        );
    }

    /**
     * Set game state
     */
    setState(newState) {
        this.state = newState;
        this.phaseStartTime = Date.now();
        console.log(`State: ${newState}`);
    }

    /**
     * Toggle word selection in test phase
     */
    toggleWordSelection(word) {
        if (this.selectedWords.has(word)) {
            this.selectedWords.delete(word);
        } else {
            const K = this.currentWordList.length;
            if (this.selectedWords.size < K) {
                this.selectedWords.add(word);
            }
        }
    }

    /**
     * Submit test results
     */
    submitTest(timeRemaining) {
        const selected = Array.from(this.selectedWords);
        const correct = this.currentWordList;

        // Calculate metrics
        const hits = selected.filter(w => correct.includes(w)).length;
        const falseAlarms = selected.filter(w => !correct.includes(w)).length;
        const misses = correct.filter(w => !selected.includes(w)).length;

        // Calculate score
        const scoreData = this.scoreCalculator.calculate(
            this.currentRound - 1,
            hits,
            falseAlarms,
            misses,
            timeRemaining,
            this.config.testTimeLimitMs
        );

        // Check pass
        const passed = this.scoreCalculator.checkPass(
            falseAlarms,
            misses,
            this.currentRound - 1
        );

        // Update total score
        this.totalScore += scoreData.totalAdd;

        // Update stats
        this.stats.totalHits += hits;
        this.stats.totalFalse += falseAlarms;
        this.stats.totalMiss += misses;
        this.stats.totalTime += (this.config.testTimeLimitMs - timeRemaining);

        // Store round data
        const roundResult = {
            round: this.currentRound,
            K: this.currentWordList.length,
            wordList: this.currentWordList,
            decoys: this.currentDecoys,
            selected,
            hits,
            falseAlarms,
            misses,
            passed,
            scoreData,
            timeRemaining
        };

        this.roundData.push(roundResult);

        return roundResult;
    }

    /**
     * End game
     */
    endGame() {
        this.setState('END');
    }

    /**
     * Shuffle array utility
     */
    shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    /**
     * Clear all timers
     */
    clearTimers() {
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers = [];
    }
}

// ============================================================================
// MODULE 6: UI CONTROLLER
// Manages all UI interactions and rendering
// ============================================================================
class UIController {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.elements = {};
        this.timers = [];
        this.testStartTime = 0; // Track test phase start time
        this.initElements();
        this.attachEventListeners();
    }

    /**
     * Initialize DOM element references
     */
    initElements() {
        // Screens
        this.elements.configScreen = document.getElementById('configScreen');
        this.elements.gameScreen = document.getElementById('gameScreen');
        this.elements.finalScreen = document.getElementById('finalScreen');

        // Config
        this.elements.startGameBtn = document.getElementById('startGameBtn');
        this.elements.sessionRounds = document.getElementById('sessionRounds');
        this.elements.startK = document.getElementById('startK');
        this.elements.maxK = document.getElementById('maxK');
        this.elements.memorizeMsBase = document.getElementById('memorizeMsBase');
        this.elements.testTimeLimitMs = document.getElementById('testTimeLimitMs');
        this.elements.distractorEnabled = document.getElementById('distractorEnabled');

        // Game info
        this.elements.currentRound = document.getElementById('currentRound');
        this.elements.currentScore = document.getElementById('currentScore');
        this.elements.phaseIndicator = document.getElementById('phaseIndicator');

        // Phases
        this.elements.memorizePhase = document.getElementById('memorizePhase');
        this.elements.distractorPhase = document.getElementById('distractorPhase');
        this.elements.testPhase = document.getElementById('testPhase');
        this.elements.resultPhase = document.getElementById('resultPhase');

        // Phase content
        this.elements.wordGrid = document.getElementById('wordGrid');
        this.elements.memorizeTimer = document.getElementById('memorizeTimer');
        this.elements.distractorTimer = document.getElementById('distractorTimer');
        this.elements.distractorQuestion = document.getElementById('distractorQuestion');
        this.elements.distractorOptions = document.getElementById('distractorOptions');
        this.elements.testTimer = document.getElementById('testTimer');
        this.elements.selectionCount = document.getElementById('selectionCount');
        this.elements.wordOptions = document.getElementById('wordOptions');
        this.elements.submitTestBtn = document.getElementById('submitTestBtn');

        // Result
        this.elements.resultTitle = document.getElementById('resultTitle');
        this.elements.resultStatus = document.getElementById('resultStatus');
        this.elements.statHits = document.getElementById('statHits');
        this.elements.statFalse = document.getElementById('statFalse');
        this.elements.statMiss = document.getElementById('statMiss');
        this.elements.scoreBase = document.getElementById('scoreBase');
        this.elements.scoreHit = document.getElementById('scoreHit');
        this.elements.scoreSpeed = document.getElementById('scoreSpeed');
        this.elements.scorePenalty = document.getElementById('scorePenalty');
        this.elements.scoreTotal = document.getElementById('scoreTotal');
        this.elements.yourSelections = document.getElementById('yourSelections');
        this.elements.correctWords = document.getElementById('correctWords');
        this.elements.nextRoundBtn = document.getElementById('nextRoundBtn');

        // Final
        this.elements.finalScore = document.getElementById('finalScore');
        this.elements.finalRounds = document.getElementById('finalRounds');
        this.elements.finalHits = document.getElementById('finalHits');
        this.elements.finalAccuracy = document.getElementById('finalAccuracy');
        this.elements.finalAvgTime = document.getElementById('finalAvgTime');
        this.elements.finalMessage = document.getElementById('finalMessage');
        this.elements.playAgainBtn = document.getElementById('playAgainBtn');
        this.elements.backToMenuBtn = document.getElementById('backToMenuBtn');

        // Modal
        this.elements.helpBtn = document.getElementById('helpBtn');
        this.elements.helpModal = document.getElementById('helpModal');
        this.elements.closeHelpModal = document.getElementById('closeHelpModal');
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Config
        this.elements.startGameBtn.addEventListener('click', () => this.handleStartGame());

        // Test
        this.elements.submitTestBtn.addEventListener('click', () => this.handleSubmitTest());

        // Result
        this.elements.nextRoundBtn.addEventListener('click', () => this.handleNextRound());

        // Final
        this.elements.playAgainBtn.addEventListener('click', () => this.handlePlayAgain());
        this.elements.backToMenuBtn.addEventListener('click', () => this.handleBackToMenu());

        // Modal
        this.elements.helpBtn.addEventListener('click', () => this.showHelp());
        this.elements.closeHelpModal.addEventListener('click', () => this.hideHelp());
        window.addEventListener('click', (e) => {
            if (e.target === this.elements.helpModal) {
                this.hideHelp();
            }
        });
    }

    /**
     * Show help modal
     */
    showHelp() {
        this.elements.helpModal.classList.add('active');
    }

    /**
     * Hide help modal
     */
    hideHelp() {
        this.elements.helpModal.classList.remove('active');
    }

    /**
     * Handle start game
     */
    handleStartGame() {
        // Update config
        this.gameEngine.config.sessionRounds = parseInt(this.elements.sessionRounds.value);
        this.gameEngine.config.startK = parseInt(this.elements.startK.value);
        this.gameEngine.config.maxK = parseInt(this.elements.maxK.value);
        this.gameEngine.config.memorizeMsBase = parseInt(this.elements.memorizeMsBase.value);
        this.gameEngine.config.testTimeLimitMs = parseInt(this.elements.testTimeLimitMs.value);
        this.gameEngine.config.distractorEnabled = this.elements.distractorEnabled.checked;

        // Start game
        this.gameEngine.startGame();
        this.showScreen('game');
        this.renderMemorizePhase();
    }

    /**
     * Render memorize phase
     */
    renderMemorizePhase() {
        this.hideAllPhases();
        this.elements.memorizePhase.classList.remove('hidden');
        this.updateRoundInfo();
        this.elements.phaseIndicator.textContent = 'MEMORIZE';
        this.elements.phaseIndicator.style.background = '#B8B8FF';

        // Render words
        this.elements.wordGrid.innerHTML = '';
        this.gameEngine.currentWordList.forEach(word => {
            const wordItem = document.createElement('div');
            wordItem.className = 'word-item';
            wordItem.textContent = word;
            this.elements.wordGrid.appendChild(wordItem);
        });

        // Start timer
        const memorizeTime = this.gameEngine.calculateMemorizeTime(this.gameEngine.currentRound - 1);
        this.startCountdownTimer(
            this.elements.memorizeTimer,
            memorizeTime,
            () => {
                if (this.gameEngine.config.distractorEnabled) {
                    this.gameEngine.setState('DISTRACTOR');
                    this.renderDistractorPhase();
                } else {
                    this.gameEngine.setState('TEST');
                    this.renderTestPhase();
                }
            }
        );
    }

    /**
     * Render distractor phase
     */
    renderDistractorPhase() {
        this.hideAllPhases();
        this.elements.distractorPhase.classList.remove('hidden');
        this.elements.phaseIndicator.textContent = 'DISTRACTOR';
        this.elements.phaseIndicator.style.background = '#FFB4A2';

        // Generate simple math problem
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        const answer = num1 + num2;
        const options = [answer];

        // Generate wrong answers
        while (options.length < 4) {
            const wrong = answer + Math.floor(Math.random() * 10) - 5;
            if (wrong > 0 && !options.includes(wrong)) {
                options.push(wrong);
            }
        }

        // Shuffle options
        options.sort(() => Math.random() - 0.5);

        // Render
        this.elements.distractorQuestion.textContent = `What is ${num1} + ${num2}?`;
        this.elements.distractorOptions.innerHTML = '';
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'distractor-option';
            btn.textContent = opt;
            btn.addEventListener('click', () => {
                this.gameEngine.setState('TEST');
                this.renderTestPhase();
            });
            this.elements.distractorOptions.appendChild(btn);
        });

        // Auto-advance timer
        this.startCountdownTimer(
            this.elements.distractorTimer,
            this.gameEngine.config.distractorMs,
            () => {
                this.gameEngine.setState('TEST');
                this.renderTestPhase();
            }
        );
    }

    /**
     * Render test phase
     */
    renderTestPhase() {
        this.hideAllPhases();
        this.elements.testPhase.classList.remove('hidden');
        this.elements.phaseIndicator.textContent = 'TEST';
        this.elements.phaseIndicator.style.background = '#4A90A4';

        // Render options
        this.elements.wordOptions.innerHTML = '';
        this.gameEngine.currentOptions.forEach(word => {
            const wordOption = document.createElement('button');
            wordOption.className = 'word-option';
            wordOption.textContent = word;
            wordOption.addEventListener('click', () => this.handleWordSelection(word, wordOption));
            this.elements.wordOptions.appendChild(wordOption);
        });

        this.updateSelectionCount();
        this.elements.submitTestBtn.disabled = true;

        // Start timer
        this.testStartTime = Date.now(); // Record start time
        let timeRemaining = this.gameEngine.config.testTimeLimitMs;
        this.startCountdownTimer(
            this.elements.testTimer,
            timeRemaining,
            () => {
                this.handleSubmitTest();
            }
        );
    }

    /**
     * Handle word selection in test
     */
    handleWordSelection(word, element) {
        const K = this.gameEngine.currentWordList.length;
        
        if (this.gameEngine.selectedWords.has(word)) {
            this.gameEngine.selectedWords.delete(word);
            element.classList.remove('selected');
        } else if (this.gameEngine.selectedWords.size < K) {
            this.gameEngine.selectedWords.add(word);
            element.classList.add('selected');
        }

        this.updateSelectionCount();

        // Enable submit if selection is complete
        this.elements.submitTestBtn.disabled = 
            this.gameEngine.selectedWords.size !== K;
    }

    /**
     * Update selection count
     */
    updateSelectionCount() {
        const K = this.gameEngine.currentWordList.length;
        const selected = this.gameEngine.selectedWords.size;
        this.elements.selectionCount.textContent = `Selected: ${selected} / ${K}`;
    }

    /**
     * Handle submit test
     */
    handleSubmitTest() {
        this.clearTimers();
        
        // Calculate time remaining accurately from actual timestamps
        const elapsed = Date.now() - this.testStartTime;
        const timeRemaining = Math.max(0, this.gameEngine.config.testTimeLimitMs - elapsed);

        const result = this.gameEngine.submitTest(timeRemaining);
        this.gameEngine.setState('RESULT');
        this.renderResultPhase(result);
    }

    /**
     * Render result phase
     */
    renderResultPhase(result) {
        this.hideAllPhases();
        this.elements.resultPhase.classList.remove('hidden');
        this.elements.phaseIndicator.textContent = 'RESULT';
        this.elements.phaseIndicator.style.background = '#90D5A8';

        // Update stats
        this.elements.statHits.textContent = result.hits;
        this.elements.statFalse.textContent = result.falseAlarms;
        this.elements.statMiss.textContent = result.misses;

        // Update score breakdown
        this.elements.scoreBase.textContent = `+${result.scoreData.baseScore}`;
        this.elements.scoreHit.textContent = `+${result.scoreData.hitScore}`;
        this.elements.scoreSpeed.textContent = `+${result.scoreData.speedBonus}`;
        this.elements.scorePenalty.textContent = `-${result.scoreData.penalty}`;
        this.elements.scoreTotal.textContent = `+${result.scoreData.totalAdd}`;

        // Update status
        if (result.passed) {
            this.elements.resultStatus.textContent = 'PASS';
            this.elements.resultStatus.className = 'result-status pass';
        } else {
            this.elements.resultStatus.textContent = 'FAIL';
            this.elements.resultStatus.className = 'result-status fail';
        }

        // Update word review
        this.renderWordReview(result);

        // Update score
        this.updateRoundInfo();
    }

    /**
     * Render word review
     */
    renderWordReview(result) {
        // Your selections
        this.elements.yourSelections.innerHTML = '';
        result.selected.forEach(word => {
            const div = document.createElement('div');
            div.className = 'review-word';
            div.textContent = word;
            
            if (result.wordList.includes(word)) {
                div.classList.add('correct');
            } else {
                div.classList.add('incorrect');
            }
            
            this.elements.yourSelections.appendChild(div);
        });

        // Correct words
        this.elements.correctWords.innerHTML = '';
        result.wordList.forEach(word => {
            const div = document.createElement('div');
            div.className = 'review-word';
            div.textContent = word;
            
            if (result.selected.includes(word)) {
                div.classList.add('correct');
            } else {
                div.classList.add('missed');
            }
            
            this.elements.correctWords.appendChild(div);
        });
    }

    /**
     * Handle next round
     */
    handleNextRound() {
        this.gameEngine.nextRound();
        
        if (this.gameEngine.state === 'END') {
            this.renderFinalScreen();
        } else {
            this.renderMemorizePhase();
        }
    }

    /**
     * Render final screen
     */
    renderFinalScreen() {
        this.showScreen('final');

        const stats = this.gameEngine.stats;
        const totalWords = this.gameEngine.roundData.reduce((sum, r) => sum + r.K, 0);
        const accuracy = totalWords > 0 ? 
            Math.round((stats.totalHits / totalWords) * 100) : 0;
        const avgTime = stats.totalTime / this.gameEngine.config.sessionRounds / 1000;

        this.elements.finalScore.textContent = this.gameEngine.totalScore;
        this.elements.finalRounds.textContent = this.gameEngine.config.sessionRounds;
        this.elements.finalHits.textContent = stats.totalHits;
        this.elements.finalAccuracy.textContent = `${accuracy}%`;
        this.elements.finalAvgTime.textContent = `${avgTime.toFixed(1)}s`;

        // Message based on performance
        let message = '';
        if (accuracy >= 90) {
            message = '🌟 Outstanding! Your verbal memory is exceptional!';
        } else if (accuracy >= 75) {
            message = '🎉 Great job! Your memory skills are strong!';
        } else if (accuracy >= 60) {
            message = '👍 Good work! Keep practicing to improve!';
        } else {
            message = '💪 Keep practicing! Your memory will improve with time!';
        }
        this.elements.finalMessage.innerHTML = `<p>${message}</p>`;
    }

    /**
     * Handle play again
     */
    handlePlayAgain() {
        this.showScreen('config');
        this.gameEngine.reset();
    }

    /**
     * Handle back to menu
     */
    handleBackToMenu() {
        window.location.href = '../index.html';
    }

    /**
     * Show screen
     */
    showScreen(screen) {
        this.elements.configScreen.classList.remove('active');
        this.elements.gameScreen.classList.remove('active');
        this.elements.finalScreen.classList.remove('active');

        if (screen === 'config') {
            this.elements.configScreen.classList.add('active');
        } else if (screen === 'game') {
            this.elements.gameScreen.classList.add('active');
        } else if (screen === 'final') {
            this.elements.finalScreen.classList.add('active');
        }
    }

    /**
     * Hide all phases
     */
    hideAllPhases() {
        this.elements.memorizePhase.classList.add('hidden');
        this.elements.distractorPhase.classList.add('hidden');
        this.elements.testPhase.classList.add('hidden');
        this.elements.resultPhase.classList.add('hidden');
    }

    /**
     * Update round info
     */
    updateRoundInfo() {
        this.elements.currentRound.textContent = 
            `${this.gameEngine.currentRound} / ${this.gameEngine.config.sessionRounds}`;
        this.elements.currentScore.textContent = this.gameEngine.totalScore;
    }

    /**
     * Start countdown timer
     */
    startCountdownTimer(element, durationMs, onComplete) {
        const startTime = Date.now();
        const endTime = startTime + durationMs;

        const update = () => {
            const now = Date.now();
            const remaining = Math.max(0, endTime - now);
            const seconds = (remaining / 1000).toFixed(1);
            element.textContent = `${seconds}s`;

            if (remaining <= 0) {
                onComplete();
            } else {
                const timer = setTimeout(update, 100);
                this.timers.push(timer);
            }
        };

        update();
    }

    /**
     * Clear all timers
     */
    clearTimers() {
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers = [];
    }
}

// ============================================================================
// MODULE 7: INITIALIZATION
// Application entry point
// ============================================================================
class WordRecallApp {
    constructor() {
        this.config = {
            mode: 'recognition',
            language: 'en',
            sessionRounds: 10,
            startK: 5,
            maxK: 12,
            memorizeMsBase: 5000,  // Tăng từ 3500ms lên 5000ms (5 giây)
            memorizeMsMin: 2500,   // Tăng từ 1200ms lên 2500ms (2.5 giây)
            testTimeLimitMs: 9000,
            decoyCountRatio: 1.0,
            allowMistakes: 0,
            antiRepeatWindow: 40,
            distractorEnabled: true,
            distractorMs: 1500,
            seed: null
        };

        this.wordBankService = new WordBankService();
        this.gameEngine = null;
        this.uiController = null;
    }

    async initialize() {
        console.log('Initializing Word Recall...');

        // Load word bank
        const loaded = await this.wordBankService.load();
        if (!loaded) {
            alert('Failed to load word bank. Please refresh the page.');
            return;
        }

        // Create game engine
        this.gameEngine = new GameEngine(this.config, this.wordBankService);

        // Create UI controller
        this.uiController = new UIController(this.gameEngine);

        console.log('Word Recall initialized successfully!');
    }
}

// Start the application
let wordRecallApp;

document.addEventListener('DOMContentLoaded', async () => {
    wordRecallApp = new WordRecallApp();
    await wordRecallApp.initialize();

    // Check if multiplayer mode
    const roomId = sessionStorage.getItem('multiplayerRoomId');
    const role = sessionStorage.getItem('multiplayerRole');

    if (roomId && typeof WordRecallMultiplayerAdapter !== 'undefined') {
        console.log('[WordRecall] Checking multiplayer room validity:', { roomId, role });

        // Validate room exists and is still active
        try {
            const roomRef = database.ref(`rooms/${roomId}`);
            const snapshot = await roomRef.once('value');
            const roomData = snapshot.val();

            // Check if room exists and is in valid state
            if (!roomData || roomData.meta.status === 'closed' || roomData.meta.status === 'finished') {
                console.log('[WordRecall] Room no longer valid, clearing multiplayer state');
                sessionStorage.removeItem('multiplayerRoomId');
                sessionStorage.removeItem('multiplayerRole');
                return; // Exit and let game run in single player mode
            }

            console.log('[WordRecall] Room valid, initializing multiplayer mode');
            const adapter = new WordRecallMultiplayerAdapter(wordRecallApp);

            if (role === 'host') {
                adapter.initAsHost(roomId);
            } else if (role === 'player') {
                adapter.initAsPlayer(roomId);
            }

            // Expose adapter globally for debugging
            window.wordRecallAdapter = adapter;
        } catch (error) {
            console.error('[WordRecall] Error checking room validity:', error);
            sessionStorage.removeItem('multiplayerRoomId');
            sessionStorage.removeItem('multiplayerRole');
        }
    }
});
