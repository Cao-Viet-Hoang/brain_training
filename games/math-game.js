/**
 * Brain Training Games
 * Author: Cao Viet Hoang
 * Created: 2025
 */

// Math Game Logic
class MathGame {
    constructor() {
        this.config = {
            minNumber: 1,
            maxNumber: 100,
            operations: [],
            operandCount: 2,
            questionCount: 10,
            timePerQuestion: 10
        };
        
        this.gameState = {
            currentQuestionIndex: 0,
            correctCount: 0,
            wrongCount: 0,
            questions: [],
            answers: [],
            timer: null,
            timeRemaining: 0,
            streak: 0,
            maxStreak: 0,
            recentAnswers: [],
            achievements: {
                fast: 0,
                perfect: 0,
                master: 0,
                comeback: 0
            },
            wrongStreak: 0
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
        // Load saved settings into UI
        this.loadSavedSettings();
        
        // Operation buttons
        const operationBtns = document.querySelectorAll('.operation-btn');
        operationBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.toggleOperation(btn);
            });
        });
        
        // Config input changes
        const configInputs = ['minNumber', 'maxNumber', 'operandCount', 'questionCount', 'timePerQuestion'];
        configInputs.forEach(id => {
            const input = document.getElementById(id);
        });
        
        // Start game button
        document.getElementById('startGameBtn').addEventListener('click', () => this.startGame());
        
        // Submit answer button
        document.getElementById('submitAnswerBtn').addEventListener('click', () => this.submitAnswer());
        
        // Answer input - submit on Enter
        document.getElementById('answerInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitAnswer();
            }
        });
        
        // Play again button
        document.getElementById('playAgainBtn').addEventListener('click', () => this.resetGame());
    }
    
    toggleOperation(btn) {
        const operation = btn.dataset.operation;
        const isMixed = operation === 'mixed';
        const isCurrentlyActive = btn.classList.contains('active');
        
        if (isMixed) {
            // If clicking on mixed, deselect all other operations
            if (!isCurrentlyActive) {
                document.querySelectorAll('.operation-btn').forEach(b => {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
            } else {
                // If mixed is already active, just deselect it
                btn.classList.remove('active');
            }
        } else {
            // If clicking on a regular operation and mixed is selected, deselect mixed
            const mixedBtn = document.querySelector('.operation-btn[data-operation="mixed"]');
            if (mixedBtn && mixedBtn.classList.contains('active')) {
                mixedBtn.classList.remove('active');
            }
            
            // Toggle the clicked button
            btn.classList.toggle('active');
        }
    }
    
    /**
     * Load saved settings from localStorage into UI
     */
    loadSavedSettings() {
        if (!window.GAME_SETTINGS) return;
        
        const settings = window.GAME_SETTINGS;
        
        // Load number inputs
        if (settings.minNumber !== undefined) {
            document.getElementById('minNumber').value = settings.minNumber;
        }
        if (settings.maxNumber !== undefined) {
            document.getElementById('maxNumber').value = settings.maxNumber;
        }
        if (settings.operandCount !== undefined) {
            document.getElementById('operandCount').value = settings.operandCount;
        }
        if (settings.questionCount !== undefined) {
            document.getElementById('questionCount').value = settings.questionCount;
        }
        if (settings.timePerQuestion !== undefined) {
            document.getElementById('timePerQuestion').value = settings.timePerQuestion;
        }
        
        // Load operations
        if (settings.operations && Array.isArray(settings.operations)) {
            // First, deselect all
            document.querySelectorAll('.operation-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Then select the saved ones
            settings.operations.forEach(op => {
                const btn = document.querySelector(`.operation-btn[data-operation="${op}"]`);
                if (btn) {
                    btn.classList.add('active');
                }
            });
        }
        
        console.log('[MathGame] Settings restored:', settings);
    }
    
    /**
     * Save current settings to localStorage
     */
    saveCurrentSettings() {
        if (typeof window.updateGameSettings !== 'function') return;
        
        try {
            const minNumber = parseInt(document.getElementById('minNumber').value);
            const maxNumber = parseInt(document.getElementById('maxNumber').value);
            const operandCount = parseInt(document.getElementById('operandCount').value);
            const questionCount = parseInt(document.getElementById('questionCount').value);
            const timePerQuestion = parseInt(document.getElementById('timePerQuestion').value);
            const operations = Array.from(document.querySelectorAll('.operation-btn.active'))
                .map(btn => btn.dataset.operation);
            
            // Only save if valid
            if (!isNaN(minNumber) && !isNaN(maxNumber) && operations.length > 0) {
                window.updateGameSettings({
                    minNumber,
                    maxNumber,
                    operations,
                    operandCount: isNaN(operandCount) ? 2 : operandCount,
                    questionCount: isNaN(questionCount) ? 10 : questionCount,
                    timePerQuestion: isNaN(timePerQuestion) ? 10 : timePerQuestion
                });
                console.log('[MathGame] Settings saved');
            }
        } catch (error) {
            console.error('[MathGame] Error saving settings:', error);
        }
    }
    
    validateConfig() {
        const minNumber = parseInt(document.getElementById('minNumber').value);
        const maxNumber = parseInt(document.getElementById('maxNumber').value);
        const operandCount = parseInt(document.getElementById('operandCount').value);
        const questionCount = parseInt(document.getElementById('questionCount').value);
        const timePerQuestion = parseInt(document.getElementById('timePerQuestion').value);
        const selectedOperations = Array.from(document.querySelectorAll('.operation-btn.active'))
            .map(btn => btn.dataset.operation);
        
        if (isNaN(minNumber) || isNaN(maxNumber)) {
            alert('Please enter a valid number range!');
            return false;
        }
        
        if (minNumber >= maxNumber) {
            alert('Minimum must be less than maximum!');
            return false;
        }
        
        if (selectedOperations.length === 0) {
            alert('Please select at least one operation!');
            return false;
        }
        
        if (isNaN(operandCount) || operandCount < 2 || operandCount > 20) {
            alert('Number of operands must be between 2 and 20!');
            return false;
        }
        
        if (isNaN(questionCount) || questionCount < 1 || questionCount > 100) {
            alert('Number of questions must be between 1 and 100!');
            return false;
        }
        
        if (isNaN(timePerQuestion) || timePerQuestion < 5 || timePerQuestion > 60) {
            alert('Time per question must be between 5 and 60 seconds!');
            return false;
        }
        
        this.config = {
            minNumber,
            maxNumber,
            operations: selectedOperations,
            operandCount,
            questionCount,
            timePerQuestion
        };
        
        return true;
    }
    
    startGame() {
        if (!this.validateConfig()) return;
        
        // Save settings when starting game
        this.saveCurrentSettings();
        
        // Reset game state
        this.gameState = {
            currentQuestionIndex: 0,
            correctCount: 0,
            wrongCount: 0,
            questions: [],
            answers: [],
            timer: null,
            timeRemaining: this.config.timePerQuestion,
            streak: 0,
            maxStreak: 0,
            recentAnswers: [],
            achievements: {
                fast: 0,
                perfect: 0,
                master: 0,
                comeback: 0
            },
            wrongStreak: 0
        };
        
        // Generate questions
        this.generateQuestions();
        
        // Show game screen
        this.showScreen('game');
        
        // Display first question
        this.displayQuestion();
        
        // Start timer
        this.startTimer();
        
        // Update progress
        this.updateProgress();
        
        // Show initial tip
        this.updateTip();
    }
    
    generateQuestions() {
        const { minNumber, maxNumber, operations, operandCount, questionCount } = this.config;
        
        for (let i = 0; i < questionCount; i++) {
            const isMixed = operations.includes('mixed');
            const numbers = [];
            const ops = []; // Array of operations for mixed mode
            
            if (isMixed) {
                // Mixed mode: generate different operations for each operand
                const allOps = ['+', '-', '*', '/'];
                
                // First, generate operations
                for (let j = 1; j < operandCount; j++) {
                    const op = allOps[Math.floor(Math.random() * allOps.length)];
                    ops.push(op);
                }
                
                // Then generate numbers based on operations
                for (let j = 0; j < operandCount; j++) {
                    if (j > 0 && ops[j - 1] === '/') {
                        // For division, ensure divisibility
                        // Generate a divisor first
                        const divisor = this.getRandomNumber(2, 10);
                        numbers.push(divisor);
                        
                        // Make the previous number (dividend) divisible by this divisor
                        // Find a reasonable multiplier
                        const maxMultiplier = Math.floor(maxNumber / divisor);
                        const multiplier = this.getRandomNumber(2, Math.min(maxMultiplier, 20));
                        numbers[j - 1] = divisor * multiplier;
                    } else {
                        // For other operations, generate normally
                        // But keep numbers smaller for mixed mode to avoid very large results
                        const adjustedMax = Math.min(maxNumber, 50);
                        numbers.push(this.getRandomNumber(minNumber, adjustedMax));
                    }
                }
            } else {
                // Multiple operations mode - each operation can be different (randomly selected)
                // First, randomly select operations for each position
                for (let j = 1; j < operandCount; j++) {
                    const op = operations[Math.floor(Math.random() * operations.length)];
                    ops.push(op);
                }
                
                // Then generate numbers based on operations
                // Keep numbers smaller when mixing operations to avoid very large results
                const adjustedMax = operations.length > 1 ? Math.min(maxNumber, 50) : maxNumber;
                
                for (let j = 0; j < operandCount; j++) {
                    if (j > 0 && ops[j - 1] === '/') {
                        // For division, ensure divisibility
                        // Generate a divisor first
                        const divisor = this.getRandomNumber(2, Math.min(10, Math.floor(adjustedMax / 2)));
                        numbers.push(divisor);
                        
                        // Make the previous number (dividend) divisible by this divisor
                        // Find a reasonable multiplier
                        const maxMultiplier = Math.floor(adjustedMax / divisor);
                        const multiplier = this.getRandomNumber(2, Math.min(maxMultiplier, 20));
                        numbers[j - 1] = divisor * multiplier;
                    } else {
                        // For other operations, generate normally
                        numbers.push(this.getRandomNumber(minNumber, adjustedMax));
                    }
                }
            }
            
            const answer = this.calculateAnswer(numbers, ops);
            
            this.gameState.questions.push({
                numbers: numbers,
                operations: ops, // Changed from 'operation' to 'operations' (array)
                correctAnswer: answer,
                userAnswer: null,
                isCorrect: null,
                timeSpent: 0
            });
        }
    }
    
    getRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    parseFraction(input) {
        // Try to parse as fraction (e.g., "1/2", "3/4")
        const fractionMatch = input.trim().match(/^(-?\d+)\s*\/\s*(\d+)$/);
        if (fractionMatch) {
            const numerator = parseFloat(fractionMatch[1]);
            const denominator = parseFloat(fractionMatch[2]);
            if (denominator !== 0) {
                return Math.round((numerator / denominator) * 100) / 100;
            }
        }
        // Otherwise parse as regular number (decimal or integer)
        return parseFloat(input);
    }
    
    calculateAnswer(numbers, operations) {
        if (numbers.length === 0) return 0;
        if (numbers.length === 1) return numbers[0];
        
        // Create a copy of numbers and operations arrays to avoid modifying originals
        let nums = [...numbers];
        let ops = [...operations];
        
        // First pass: handle multiplication and division (left to right)
        let i = 0;
        while (i < ops.length) {
            if (ops[i] === '*' || ops[i] === '/') {
                let result;
                if (ops[i] === '*') {
                    result = nums[i] * nums[i + 1];
                } else {
                    result = nums[i] / nums[i + 1];
                }
                // Replace the two numbers with the result
                nums.splice(i, 2, result);
                // Remove the operation
                ops.splice(i, 1);
                // Don't increment i, check the same position again
            } else {
                i++;
            }
        }
        
        // Second pass: handle addition and subtraction (left to right)
        i = 0;
        while (i < ops.length) {
            let result;
            if (ops[i] === '+') {
                result = nums[i] + nums[i + 1];
            } else {
                result = nums[i] - nums[i + 1];
            }
            // Replace the two numbers with the result
            nums.splice(i, 2, result);
            // Remove the operation
            ops.splice(i, 1);
            // Don't increment i, check the same position again
        }
        
        // Round to handle floating point precision issues
        return Math.round(nums[0]);
    }
    
    displayQuestion() {
        const question = this.gameState.questions[this.gameState.currentQuestionIndex];
        const operationSymbol = {
            '+': '+',
            '-': '−',
            '*': '×',
            '/': '÷'
        };
        
        // Build equation string with multiple numbers and operations
        const equationParts = [];
        for (let i = 0; i < question.numbers.length; i++) {
            equationParts.push(question.numbers[i]);
            if (i < question.numbers.length - 1) {
                equationParts.push(operationSymbol[question.operations[i]]);
            }
        }
        
        document.getElementById('question').textContent = 
            `${equationParts.join(' ')} = ?`;
        
        document.getElementById('currentQuestion').textContent = this.gameState.currentQuestionIndex + 1;
        document.getElementById('totalQuestions').textContent = this.config.questionCount;
        
        this.updateStats();
        
        // Clear and focus answer input
        const answerInput = document.getElementById('answerInput');
        answerInput.value = '';
        answerInput.focus();
    }
    
    updateStats() {
        const correctEl = document.getElementById('correctCount');
        const wrongEl = document.getElementById('wrongCount');
        const streakEl = document.getElementById('streakCount');
        const accuracyEl = document.getElementById('accuracyPercent');
        
        // Update values
        const oldCorrect = parseInt(correctEl.textContent) || 0;
        const oldWrong = parseInt(wrongEl.textContent) || 0;
        const oldStreak = parseInt(streakEl.textContent) || 0;
        
        correctEl.textContent = this.gameState.correctCount;
        wrongEl.textContent = this.gameState.wrongCount;
        streakEl.textContent = this.gameState.streak;
        
        // Add pop animation if value changed
        if (this.gameState.correctCount !== oldCorrect) {
            correctEl.classList.add('updated');
            setTimeout(() => correctEl.classList.remove('updated'), 400);
        }
        if (this.gameState.wrongCount !== oldWrong) {
            wrongEl.classList.add('updated');
            setTimeout(() => wrongEl.classList.remove('updated'), 400);
        }
        if (this.gameState.streak !== oldStreak) {
            streakEl.classList.add('updated');
            setTimeout(() => streakEl.classList.remove('updated'), 400);
        }
        
        const total = this.gameState.correctCount + this.gameState.wrongCount;
        const accuracy = total > 0 ? Math.round((this.gameState.correctCount / total) * 100) : 0;
        accuracyEl.textContent = accuracy + '%';
    }
    
    updateProgress() {
        const progress = ((this.gameState.currentQuestionIndex + 1) / this.config.questionCount) * 100;
        document.getElementById('progressFill').style.width = progress + '%';
        document.getElementById('progressPercentage').textContent = Math.round(progress) + '%';
    }
    
    startTimer() {
        this.gameState.timeRemaining = this.config.timePerQuestion;
        
        const timerRing = document.getElementById('timerRing');
        const circumference = 2 * Math.PI * 52; // radius = 52
        
        // Update timer display FIRST
        this.updateTimerDisplay();
        
        // Small delay to ensure number is rendered before ring resets
        setTimeout(() => {
            // Then reset timer ring immediately without transition
            timerRing.classList.add('reset');
            timerRing.classList.remove('warning', 'danger');
            timerRing.style.strokeDashoffset = '0';
            
            // Force reflow to ensure reset is applied
            void timerRing.offsetWidth;
            
            // Re-enable transitions
            requestAnimationFrame(() => {
                timerRing.classList.remove('reset');
            });
        }, 10);
        
        this.gameState.timer = setInterval(() => {
            this.gameState.timeRemaining--;
            
            // Update timer number FIRST
            this.updateTimerDisplay();
            
            // Then update circular timer ring - it will animate smoothly over 1 second
            const nextProgress = (this.gameState.timeRemaining) / this.config.timePerQuestion;
            const offset = circumference * (1 - nextProgress);
            timerRing.style.strokeDashoffset = offset;
            
            // Change color based on time
            if (this.gameState.timeRemaining <= 3) {
                timerRing.classList.add('danger');
                timerRing.classList.remove('warning');
            } else if (this.gameState.timeRemaining <= 5) {
                timerRing.classList.add('warning');
                timerRing.classList.remove('danger');
            } else {
                timerRing.classList.remove('warning', 'danger');
            }
            
            if (this.gameState.timeRemaining <= 0) {
                this.submitAnswer(true); // Auto-submit when time runs out
            }
        }, 1000);
    }
    
    updateTimerDisplay() {
        const timerElement = document.getElementById('timer');
        timerElement.textContent = this.gameState.timeRemaining;
    }
    
    resetTimerRing() {
        const timerRing = document.getElementById('timerRing');
        if (timerRing) {
            timerRing.classList.add('reset');
            timerRing.classList.remove('warning', 'danger');
            timerRing.style.strokeDashoffset = '0';
            
            setTimeout(() => {
                timerRing.classList.remove('reset');
            }, 50);
        }
    }
    
    stopTimer() {
        if (this.gameState.timer) {
            clearInterval(this.gameState.timer);
            this.gameState.timer = null;
        }
    }
    
    submitAnswer(timeout = false) {
        this.stopTimer();
        
        const answerInput = document.getElementById('answerInput');
        let userAnswer = null;
        
        if (!timeout && answerInput.value.trim() !== '') {
            userAnswer = this.parseFraction(answerInput.value);
        }
        
        const question = this.gameState.questions[this.gameState.currentQuestionIndex];
        
        // Calculate time spent
        const timeSpent = this.config.timePerQuestion - this.gameState.timeRemaining;
        
        // Check answer with tolerance for floating point numbers
        let isCorrect = false;
        if (userAnswer !== null && !isNaN(userAnswer)) {
            const tolerance = 0.01; // Allow small difference for decimal comparison
            isCorrect = Math.abs(userAnswer - question.correctAnswer) < tolerance;
        }
        
        // Update question data
        question.userAnswer = userAnswer;
        question.isCorrect = isCorrect;
        question.timeSpent = timeSpent;
        
        // Update counts and streak
        if (isCorrect) {
            this.gameState.correctCount++;
            this.gameState.streak++;
            this.gameState.wrongStreak = 0;
            
            if (this.gameState.streak > this.gameState.maxStreak) {
                this.gameState.maxStreak = this.gameState.streak;
            }
            
            // Check achievements
            this.checkAchievements(timeSpent);
        } else {
            this.gameState.wrongCount++;
            this.gameState.wrongStreak++;
            this.gameState.streak = 0;
        }
        
        // Add to recent answers
        this.addRecentAnswer(question, isCorrect);
        
        // Update stats display
        this.updateStats();
        
        // Move to next question or show results
        this.gameState.currentQuestionIndex++;
        
        if (this.gameState.currentQuestionIndex < this.config.questionCount) {
            // Add transition class
            const questionCard = document.querySelector('.question-card');
            questionCard.classList.add('transitioning');
            
            // Update all elements after a short delay for smooth transition
            setTimeout(() => {
                // Update everything in one batch using requestAnimationFrame
                requestAnimationFrame(() => {
                    this.updateProgress();
                    this.updateTip();
                    this.displayQuestion();
                    
                    // Remove transition class and start timer
                    requestAnimationFrame(() => {
                        questionCard.classList.remove('transitioning');
                        this.startTimer();
                    });
                });
            }, 200);
        } else {
            // Game finished
            setTimeout(() => {
                this.showResults();
            }, 300);
        }
    }
    
    checkAchievements(timeSpent) {
        // Speed Demon - answer within 3 seconds
        if (timeSpent <= 3) {
            this.gameState.achievements.fast++;
            this.unlockBadge('fast');
        }
        
        // Perfect 5 - 5 correct in a row
        if (this.gameState.streak === 5) {
            this.gameState.achievements.perfect++;
            this.unlockBadge('perfect');
        }
        
        // Math Master - 10 correct in a row
        if (this.gameState.streak === 10) {
            this.gameState.achievements.master++;
            this.unlockBadge('master');
        }
        
        // Comeback - correct after 3 wrong
        if (this.gameState.wrongStreak >= 3) {
            this.gameState.achievements.comeback++;
            this.unlockBadge('comeback');
        }
    }
    
    unlockBadge(achievement) {
        const badge = document.querySelector(`.achievement-badge[data-achievement="${achievement}"]`);
        if (badge) {
            badge.classList.add('unlocked');
            const count = badge.querySelector('.badge-count');
            if (count) {
                count.textContent = this.gameState.achievements[achievement];
            }
        }
    }
    
    addRecentAnswer(question, isCorrect) {
        const operationSymbol = {
            '+': '+',
            '-': '−',
            '*': '×',
            '/': '÷'
        };
        
        // Build equation string with multiple numbers and operations
        const equationParts = [];
        for (let i = 0; i < question.numbers.length; i++) {
            equationParts.push(question.numbers[i]);
            if (i < question.numbers.length - 1) {
                equationParts.push(operationSymbol[question.operations[i]]);
            }
        }
        
        const recentItem = {
            text: equationParts.join(' '),
            isCorrect: isCorrect
        };
        
        this.gameState.recentAnswers.unshift(recentItem);
        
        // Keep only last 5
        if (this.gameState.recentAnswers.length > 5) {
            this.gameState.recentAnswers.pop();
        }
        
        // Update display
        const recentList = document.getElementById('recentAnswersList');
        recentList.innerHTML = '';
        
        this.gameState.recentAnswers.forEach(item => {
            const div = document.createElement('div');
            div.className = `recent-item ${item.isCorrect ? 'correct' : 'wrong'}`;
            div.innerHTML = `
                <span class="item-icon">${item.isCorrect ? '✓' : '✗'}</span>
                <span class="item-text">${item.text}</span>
            `;
            recentList.appendChild(div);
        });
    }
    
    updateTip() {
        const tips = [
            'Take your time and double-check your answer!',
            'Break down complex problems into smaller steps.',
            'Practice makes perfect! Keep going!',
            'Focus on accuracy over speed.',
            'Use mental math tricks to solve faster.',
            'Stay calm and think logically.',
            'Every mistake is a learning opportunity!',
            'You\'re doing great! Keep it up!',
            'Consistency beats intensity!',
            'Challenge yourself with harder numbers!'
        ];
        
        // Add dynamic tips based on performance
        const total = this.gameState.correctCount + this.gameState.wrongCount;
        if (total > 0) {
            const accuracy = (this.gameState.correctCount / total) * 100;
            
            if (accuracy === 100) {
                tips.push('Perfect score! You\'re on fire! 🔥');
            } else if (accuracy >= 80) {
                tips.push('Great accuracy! Keep it up!');
            } else if (accuracy < 50) {
                tips.push('Don\'t rush! Take your time to think.');
            }
        }
        
        if (this.gameState.streak >= 5) {
            tips.push(`Amazing ${this.gameState.streak} streak! Don't break it!`);
        }
        
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        document.getElementById('tipText').textContent = randomTip;
    }
    
    showResults() {
        // Update summary
        const total = this.config.questionCount;
        const correct = this.gameState.correctCount;
        const wrong = this.gameState.wrongCount;
        const percentage = Math.round((correct / total) * 100);
        
        document.getElementById('finalCorrect').textContent = correct;
        document.getElementById('finalWrong').textContent = wrong;
        document.getElementById('finalPercentage').textContent = percentage + '%';
        
        // Generate review list
        const reviewList = document.getElementById('reviewList');
        reviewList.innerHTML = '';
        
        this.gameState.questions.forEach((q, index) => {
            const reviewItem = document.createElement('div');
            reviewItem.className = `review-item ${q.isCorrect ? 'correct-answer' : 'wrong-answer'}`;
            
            const operationSymbol = {
                '+': '+',
                '-': '−',
                '*': '×',
                '/': '÷'
            };
            
            // Build equation string with multiple numbers
            const equationParts = [];
            for (let i = 0; i < q.numbers.length; i++) {
                equationParts.push(q.numbers[i]);
                if (i < q.numbers.length - 1) {
                    equationParts.push(operationSymbol[q.operations[i]]);
                }
            }
            
            reviewItem.innerHTML = `
                <div class="review-question">
                    Question ${index + 1}: ${equationParts.join(' ')} = ?
                </div>
                <div class="review-details">
                    <span>Your answer: 
                        <span class="${q.isCorrect ? 'correct-ans' : 'wrong-ans'}">
                            ${q.userAnswer !== null ? q.userAnswer : '(No answer)'}
                        </span>
                    </span>
                    ${!q.isCorrect ? `<span>Correct answer: <span class="correct-ans">${q.correctAnswer}</span></span>` : ''}
                    <span>Time: ${q.timeSpent}s</span>
                </div>
            `;
            
            reviewList.appendChild(reviewItem);
        });
        
        // Show result screen
        this.showScreen('result');
    }
    
    resetGame() {
        this.stopTimer();
        this.showScreen('config');
    }
    
    showScreen(screenName) {
        // Hide all screens
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show selected screen
        this.screens[screenName].classList.add('active');
    }
}

// Initialize game when DOM is loaded
let gameInstance = null; // Global reference for multiplayer adapter

document.addEventListener('DOMContentLoaded', async () => {
    gameInstance = new MathGame();
    window.mathGame = gameInstance; // Expose globally for debugging and multiplayer

    // Check if this is multiplayer mode
    const roomId = sessionStorage.getItem('multiplayerRoomId');
    const role = sessionStorage.getItem('multiplayerRole');

    if (roomId && typeof MathGameMultiplayerAdapter !== 'undefined') {
        console.log('[MathGame] Checking multiplayer room validity:', { roomId, role });

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
                console.log('[MathGame] Room no longer valid, clearing multiplayer state');
                sessionStorage.removeItem('multiplayerRoomId');
                sessionStorage.removeItem('multiplayerRole');
                console.log('[MathGame] Single player mode');
                return; // Exit and let game run in single player mode
            }

            console.log('[MathGame] Room valid, initializing multiplayer mode');
            const adapter = new MathGameMultiplayerAdapter(gameInstance);

            if (role === 'host') {
                // Initialize as host (will intercept game start)
                adapter.initAsHost(roomId).catch(err => {
                    console.error('[MathGame] Failed to initialize multiplayer as host:', err);
                    alert('Failed to initialize multiplayer: ' + err.message);
                });
            } else if (role === 'player') {
                // Initialize as player (will wait for questions and auto-start)
                adapter.initAsPlayer(roomId).catch(err => {
                    console.error('[MathGame] Failed to initialize multiplayer as player:', err);
                    alert('Failed to initialize multiplayer: ' + err.message);
                });
            }

            // Expose adapter globally
            window.mathGameAdapter = adapter;
        } catch (error) {
            console.error('[MathGame] Error checking room validity:', error);
            sessionStorage.removeItem('multiplayerRoomId');
            sessionStorage.removeItem('multiplayerRole');
            console.log('[MathGame] Single player mode');
        }
    } else {
        console.log('[MathGame] Single player mode');
    }
});
