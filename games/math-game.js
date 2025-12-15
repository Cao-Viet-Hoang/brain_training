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
            timeRemaining: 0
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
            timeRemaining: this.config.timePerQuestion
        };
        
        // Generate questions
        this.generateQuestions();
        
        // Show game screen
        this.showScreen('game');
        
        // Display first question
        this.displayQuestion();
        
        // Start timer
        this.startTimer();
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
        document.getElementById('correctCount').textContent = this.gameState.correctCount;
        document.getElementById('wrongCount').textContent = this.gameState.wrongCount;
        
        // Clear and focus answer input
        const answerInput = document.getElementById('answerInput');
        answerInput.value = '';
        answerInput.focus();
    }
    
    startTimer() {
        this.gameState.timeRemaining = this.config.timePerQuestion;
        this.updateTimerDisplay();
        
        this.gameState.timer = setInterval(() => {
            this.gameState.timeRemaining--;
            this.updateTimerDisplay();
            
            if (this.gameState.timeRemaining <= 0) {
                this.submitAnswer(true); // Auto-submit when time runs out
            }
        }, 1000);
    }
    
    updateTimerDisplay() {
        const timerElement = document.getElementById('timer');
        timerElement.textContent = this.gameState.timeRemaining;
        
        // Change color when time is running out
        if (this.gameState.timeRemaining <= 3) {
            timerElement.style.color = 'var(--accent-color)';
        } else {
            timerElement.style.color = '';
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
        
        // Update counts
        if (isCorrect) {
            this.gameState.correctCount++;
        } else {
            this.gameState.wrongCount++;
        }
        
        // Move to next question or show results
        this.gameState.currentQuestionIndex++;
        
        if (this.gameState.currentQuestionIndex < this.config.questionCount) {
            // Next question
            setTimeout(() => {
                this.displayQuestion();
                this.startTimer();
            }, 500);
        } else {
            // Game finished
            setTimeout(() => {
                this.showResults();
            }, 500);
        }
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
