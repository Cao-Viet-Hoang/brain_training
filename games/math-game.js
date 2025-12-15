// Math Game Logic
class MathGame {
    constructor() {
        this.config = {
            minNumber: 1,
            maxNumber: 100,
            operations: [],
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
        this.showScreen('config');
    }
    
    setupEventListeners() {
        // Operation buttons
        const operationBtns = document.querySelectorAll('.operation-btn');
        operationBtns.forEach(btn => {
            btn.addEventListener('click', () => this.toggleOperation(btn));
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
        
        // If clicking mixed, deselect all others
        if (operation === 'mixed') {
            document.querySelectorAll('.operation-btn').forEach(b => {
                if (b !== btn) b.classList.remove('active');
            });
        } else {
            // If clicking other operation, deselect mixed
            document.querySelector('.operation-btn[data-operation="mixed"]').classList.remove('active');
        }
        
        btn.classList.toggle('active');
    }
    
    validateConfig() {
        const minNumber = parseInt(document.getElementById('minNumber').value);
        const maxNumber = parseInt(document.getElementById('maxNumber').value);
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
            questionCount,
            timePerQuestion
        };
        
        return true;
    }
    
    startGame() {
        if (!this.validateConfig()) return;
        
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
        const { minNumber, maxNumber, operations, questionCount } = this.config;
        
        for (let i = 0; i < questionCount; i++) {
            const num1 = this.getRandomNumber(minNumber, maxNumber);
            const num2 = this.getRandomNumber(minNumber, maxNumber);
            
            let operation;
            if (operations.includes('mixed')) {
                const allOps = ['+', '-', '*', '/'];
                operation = allOps[Math.floor(Math.random() * allOps.length)];
            } else {
                operation = operations[Math.floor(Math.random() * operations.length)];
            }
            
            // For division, ensure we get whole numbers
            let finalNum1 = num1;
            let finalNum2 = num2;
            
            if (operation === '/') {
                // Make num1 a multiple of num2 to avoid decimals
                finalNum2 = this.getRandomNumber(1, 10);
                finalNum1 = finalNum2 * this.getRandomNumber(minNumber, maxNumber);
            }
            
            const answer = this.calculateAnswer(finalNum1, finalNum2, operation);
            
            this.gameState.questions.push({
                num1: finalNum1,
                num2: finalNum2,
                operation,
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
    
    calculateAnswer(num1, num2, operation) {
        switch (operation) {
            case '+': return num1 + num2;
            case '-': return num1 - num2;
            case '*': return num1 * num2;
            case '/': return Math.round(num1 / num2);
            default: return 0;
        }
    }
    
    displayQuestion() {
        const question = this.gameState.questions[this.gameState.currentQuestionIndex];
        const operationSymbol = {
            '+': '+',
            '-': '−',
            '*': '×',
            '/': '÷'
        };
        
        document.getElementById('question').textContent = 
            `${question.num1} ${operationSymbol[question.operation]} ${question.num2} = ?`;
        
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
            
            // Then update circular timer ring after a tiny delay
            requestAnimationFrame(() => {
                const progress = this.gameState.timeRemaining / this.config.timePerQuestion;
                const offset = circumference * (1 - progress);
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
            });
            
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
        const userAnswer = timeout ? null : parseInt(answerInput.value);
        const question = this.gameState.questions[this.gameState.currentQuestionIndex];
        
        // Calculate time spent
        const timeSpent = this.config.timePerQuestion - this.gameState.timeRemaining;
        
        // Check answer
        const isCorrect = userAnswer === question.correctAnswer;
        
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
        
        const recentItem = {
            text: `${question.num1} ${operationSymbol[question.operation]} ${question.num2}`,
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
            
            reviewItem.innerHTML = `
                <div class="review-question">
                    Question ${index + 1}: ${q.num1} ${operationSymbol[q.operation]} ${q.num2} = ?
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
document.addEventListener('DOMContentLoaded', () => {
    new MathGame();
});
