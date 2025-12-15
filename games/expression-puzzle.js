// Expression Puzzle Game - Senior Engineer Implementation
// Complete AST-based puzzle generation with quality filters and unique solution validation

// ============================================================================
// CORE DATA STRUCTURES & AST
// ============================================================================

/**
 * AST Node Types
 */
class ValueSlot {
    constructor(index) {
        this.type = 'slot';
        this.index = index;
    }
}

class OperatorNode {
    constructor(operator, left, right) {
        this.type = 'operator';
        this.operator = operator;
        this.left = left;
        this.right = right;
    }
}

/**
 * Puzzle Data Structure
 */
class Puzzle {
    constructor(expressionTemplate, target, solutionNumbers, config) {
        this.expressionTemplate = expressionTemplate;
        this.target = target;
        this.solutionNumbers = solutionNumbers;
        this.numSlots = solutionNumbers.length;
        this.config = config;
        this.metadata = {
            difficulty: config.difficulty,
            hasParentheses: expressionTemplate.includes('('),
            operators: this.extractOperators(expressionTemplate)
        };
    }
    
    extractOperators(template) {
        const ops = [];
        for (const char of template) {
            if (['+', '-', '*', '/'].includes(char)) {
                ops.push(char);
            }
        }
        return ops;
    }
}

// ============================================================================
// RANDOM NUMBER GENERATOR (Seedable for reproducibility)
// ============================================================================

class SeededRandom {
    constructor(seed = Date.now()) {
        this.seed = seed;
    }
    
    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
    
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
    
    choice(array) {
        return array[this.nextInt(0, array.length - 1)];
    }
    
    shuffle(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = this.nextInt(0, i);
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }
}

// ============================================================================
// AST GENERATION & EVALUATION
// ============================================================================

class ASTGenerator {
    constructor(config, rng) {
        this.config = config;
        this.rng = rng;
        this.slotCounter = 0;
    }
    
    /**
     * Generate random AST based on difficulty configuration
     */
    generateRandomAST(numSlots) {
        this.slotCounter = 0;
        
        // Determine maximum depth based on difficulty
        const maxDepth = this.getMaxDepth(numSlots);
        
        return this.buildAST(numSlots, maxDepth, 0);
    }
    
    getMaxDepth(numSlots) {
        const { difficulty } = this.config;
        
        if (difficulty === 'easy') {
            return Math.min(2, Math.ceil(Math.log2(numSlots)));
        } else if (difficulty === 'medium') {
            return Math.min(3, Math.ceil(Math.log2(numSlots)) + 1);
        } else { // hard
            return Math.min(4, Math.ceil(Math.log2(numSlots)) + 2);
        }
    }
    
    buildAST(slotsNeeded, maxDepth, currentDepth) {
        // Base case: create a slot
        if (slotsNeeded === 1 || currentDepth >= maxDepth) {
            return new ValueSlot(this.slotCounter++);
        }
        
        // Choose operator with weighted probability
        const operator = this.chooseOperator();
        
        // Split slots between left and right subtrees
        const leftSlots = this.rng.nextInt(1, slotsNeeded - 1);
        const rightSlots = slotsNeeded - leftSlots;
        
        const left = this.buildAST(leftSlots, maxDepth, currentDepth + 1);
        const right = this.buildAST(rightSlots, maxDepth, currentDepth + 1);
        
        return new OperatorNode(operator, left, right);
    }
    
    chooseOperator() {
        const { operatorsAllowed, operatorWeights } = this.config;
        
        // Build weighted array
        const weightedOps = [];
        for (const op of operatorsAllowed) {
            const weight = operatorWeights[op] || 1;
            for (let i = 0; i < weight; i++) {
                weightedOps.push(op);
            }
        }
        
        return this.rng.choice(weightedOps);
    }
}

/**
 * Convert AST to expression template string
 */
function astToTemplate(node, parentOp = null) {
    if (node.type === 'slot') {
        return '{}';
    }
    
    const { operator, left, right } = node;
    
    // Determine if we need parentheses
    const leftStr = astToTemplate(left, operator);
    const rightStr = astToTemplate(right, operator);
    
    let expr = `${leftStr} ${operator} ${rightStr}`;
    
    // Add parentheses based on operator precedence
    const needsParens = shouldAddParentheses(operator, parentOp);
    
    if (needsParens) {
        expr = `(${expr})`;
    }
    
    return expr;
}

function shouldAddParentheses(currentOp, parentOp) {
    if (!parentOp) return false;
    
    const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };
    
    // Add parentheses if current operator has lower precedence than parent
    return precedence[currentOp] < precedence[parentOp];
}

/**
 * Evaluate AST with given slot values
 */
function evaluateAST(node, slotValues) {
    if (node.type === 'slot') {
        return slotValues[node.index];
    }
    
    const { operator, left, right } = node;
    const leftValue = evaluateAST(left, slotValues);
    const rightValue = evaluateAST(right, slotValues);
    
    switch (operator) {
        case '+':
            return leftValue + rightValue;
        case '-':
            return leftValue - rightValue;
        case '*':
            return leftValue * rightValue;
        case '/':
            if (rightValue === 0) return NaN;
            return leftValue / rightValue;
        default:
            return NaN;
    }
}

/**
 * Check if all intermediate values during evaluation are integers
 */
function checkIntegerEvaluation(node, slotValues) {
    if (node.type === 'slot') {
        return { valid: true, value: slotValues[node.index] };
    }
    
    const { operator, left, right } = node;
    const leftResult = checkIntegerEvaluation(left, slotValues);
    const rightResult = checkIntegerEvaluation(right, slotValues);
    
    if (!leftResult.valid || !rightResult.valid) {
        return { valid: false, value: NaN };
    }
    
    const leftValue = leftResult.value;
    const rightValue = rightResult.value;
    
    let result;
    switch (operator) {
        case '+':
            result = leftValue + rightValue;
            break;
        case '-':
            result = leftValue - rightValue;
            break;
        case '*':
            result = leftValue * rightValue;
            break;
        case '/':
            if (rightValue === 0) return { valid: false, value: NaN };
            result = leftValue / rightValue;
            if (!Number.isInteger(result)) {
                return { valid: false, value: result };
            }
            break;
        default:
            return { valid: false, value: NaN };
    }
    
    // Check if result is within reasonable bounds
    if (Math.abs(result) > 1e6) {
        return { valid: false, value: result };
    }
    
    return { valid: true, value: result };
}

// ============================================================================
// SOLUTION NUMBER GENERATION
// ============================================================================

class SolutionGenerator {
    constructor(config, rng) {
        this.config = config;
        this.rng = rng;
    }
    
    /**
     * Generate solution numbers using forward generation strategy
     */
    generateSolutionNumbers(ast) {
        const { numRange, allowRepeat, integerOnly } = this.config;
        const [minNum, maxNum] = numRange;
        
        // Count total slots needed
        const numSlots = this.countSlots(ast);
        
        let attempts = 0;
        const maxAttempts = 1000;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            // Generate candidate numbers
            const numbers = [];
            const used = new Set();
            
            for (let i = 0; i < numSlots; i++) {
                let num;
                
                if (allowRepeat) {
                    num = this.rng.nextInt(minNum, maxNum);
                } else {
                    // Generate unique number
                    let retries = 0;
                    do {
                        num = this.rng.nextInt(minNum, maxNum);
                        retries++;
                    } while (used.has(num) && retries < 100);
                    
                    if (retries >= 100) {
                        // Can't find unique numbers in range
                        return null;
                    }
                    
                    used.add(num);
                }
                
                numbers.push(num);
            }
            
            // Check if this assignment is valid
            if (integerOnly) {
                const evalResult = checkIntegerEvaluation(ast, numbers);
                if (evalResult.valid) {
                    return numbers;
                }
            } else {
                const result = evaluateAST(ast, numbers);
                if (isFinite(result) && Math.abs(result) < 1e6) {
                    return numbers;
                }
            }
        }
        
        return null;
    }
    
    /**
     * Generate solution for division-heavy AST with integer constraints
     */
    generateDivisionFriendlyNumbers(ast) {
        // Use "backward" approach: pick quotients and construct numerators
        // This is more complex and can be added as enhancement
        return this.generateSolutionNumbers(ast);
    }
    
    countSlots(node) {
        if (node.type === 'slot') return 1;
        return this.countSlots(node.left) + this.countSlots(node.right);
    }
}

// ============================================================================
// QUALITY FILTERS
// ============================================================================

class QualityFilters {
    constructor(config) {
        this.config = config;
    }
    
    /**
     * Check if puzzle meets quality standards
     */
    checkQuality(puzzle, ast) {
        const { difficulty, targetRange } = this.config;
        
        // Filter 1: Target must be in range
        if (targetRange) {
            const [minTarget, maxTarget] = targetRange;
            if (puzzle.target < minTarget || puzzle.target > maxTarget) {
                return { valid: false, reason: 'Target out of range' };
            }
        }
        
        // Filter 2: Check for trivial operations
        if (this.hasTrivialOperations(ast, puzzle.solutionNumbers)) {
            if (difficulty !== 'easy') {
                return { valid: false, reason: 'Contains trivial operations' };
            }
        }
        
        // Filter 3: Check for division by 1
        if (this.hasDivisionByOne(ast, puzzle.solutionNumbers)) {
            if (difficulty === 'hard') {
                return { valid: false, reason: 'Division by 1 in hard mode' };
            }
        }
        
        // Filter 4: Check for too many multiplications by 0 or 1
        if (this.hasTooManyTrivialMultiplications(ast, puzzle.solutionNumbers)) {
            return { valid: false, reason: 'Too many trivial multiplications' };
        }
        
        // Filter 5: Check for a - a or a + 0 patterns
        if (this.hasIdentityPattern(ast, puzzle.solutionNumbers)) {
            if (difficulty !== 'easy') {
                return { valid: false, reason: 'Contains identity pattern' };
            }
        }
        
        return { valid: true };
    }
    
    hasTrivialOperations(node, values) {
        if (node.type === 'slot') return false;
        
        const { operator, left, right } = node;
        const leftVal = this.getNodeValue(left, values);
        const rightVal = this.getNodeValue(right, values);
        
        // Check current node
        if ((operator === '+' || operator === '-') && (leftVal === 0 || rightVal === 0)) {
            return true;
        }
        if (operator === '*' && (leftVal === 1 || rightVal === 1)) {
            return true;
        }
        
        // Recurse
        return this.hasTrivialOperations(left, values) || 
               this.hasTrivialOperations(right, values);
    }
    
    hasDivisionByOne(node, values) {
        if (node.type === 'slot') return false;
        
        const { operator, right } = node;
        const rightVal = this.getNodeValue(right, values);
        
        if (operator === '/' && rightVal === 1) {
            return true;
        }
        
        return this.hasDivisionByOne(node.left, values) || 
               this.hasDivisionByOne(node.right, values);
    }
    
    hasTooManyTrivialMultiplications(node, values) {
        const count = this.countTrivialMultiplications(node, values);
        return count > 1; // Allow at most 1
    }
    
    countTrivialMultiplications(node, values) {
        if (node.type === 'slot') return 0;
        
        const { operator, left, right } = node;
        let count = 0;
        
        if (operator === '*') {
            const leftVal = this.getNodeValue(left, values);
            const rightVal = this.getNodeValue(right, values);
            
            if (leftVal === 0 || rightVal === 0 || leftVal === 1 || rightVal === 1) {
                count++;
            }
        }
        
        count += this.countTrivialMultiplications(left, values);
        count += this.countTrivialMultiplications(right, values);
        
        return count;
    }
    
    hasIdentityPattern(node, values) {
        if (node.type === 'slot') return false;
        
        const { operator, left, right } = node;
        
        // Check if both sides are the same slot
        if (left.type === 'slot' && right.type === 'slot') {
            if (left.index === right.index && (operator === '-')) {
                return true;
            }
        }
        
        // Check for 0 patterns
        const leftVal = this.getNodeValue(left, values);
        const rightVal = this.getNodeValue(right, values);
        
        if (operator === '+' && (leftVal === 0 || rightVal === 0)) {
            return true;
        }
        
        return this.hasIdentityPattern(left, values) || 
               this.hasIdentityPattern(right, values);
    }
    
    getNodeValue(node, values) {
        if (node.type === 'slot') {
            return values[node.index];
        }
        return evaluateAST(node, values);
    }
}

// ============================================================================
// UNIQUE SOLUTION SOLVER
// ============================================================================

class UniqueSolutionSolver {
    constructor(config) {
        this.config = config;
    }
    
    /**
     * Count number of solutions for a puzzle
     */
    countSolutions(puzzle, ast) {
        const { numRange, allowRepeat } = this.config;
        const [minNum, maxNum] = numRange;
        const numSlots = puzzle.numSlots;
        
        // Optimization: only check for unique solutions if slots <= 6
        if (numSlots > 6) {
            return -1; // Skip check
        }
        
        const solutions = [];
        
        // Generate all possible number combinations
        this.generateCombinations(
            numSlots,
            minNum,
            maxNum,
            allowRepeat,
            [],
            (combination) => {
                const result = evaluateAST(ast, combination);
                if (Math.abs(result - puzzle.target) < 1e-9) {
                    solutions.push([...combination]);
                }
            }
        );
        
        return solutions.length;
    }
    
    generateCombinations(slotsRemaining, minNum, maxNum, allowRepeat, current, callback) {
        if (slotsRemaining === 0) {
            callback(current);
            return;
        }
        
        for (let num = minNum; num <= maxNum; num++) {
            if (!allowRepeat && current.includes(num)) {
                continue;
            }
            
            current.push(num);
            this.generateCombinations(slotsRemaining - 1, minNum, maxNum, allowRepeat, current, callback);
            current.pop();
        }
    }
}

// ============================================================================
// MAIN PUZZLE GENERATOR
// ============================================================================

class PuzzleGenerator {
    constructor(config) {
        this.config = this.normalizeConfig(config);
        this.rng = new SeededRandom(config.seed || Date.now());
        this.astGenerator = new ASTGenerator(this.config, this.rng);
        this.solutionGenerator = new SolutionGenerator(this.config, this.rng);
        this.qualityFilters = new QualityFilters(this.config);
        this.uniqueSolver = new UniqueSolutionSolver(this.config);
    }
    
    normalizeConfig(config) {
        const defaults = {
            difficulty: 'medium',
            minSlots: 2,
            maxSlots: 4,
            numRange: [1, 10],
            targetRange: [1, 100],
            allowRepeat: true,
            integerOnly: true,
            operatorsAllowed: ['+', '-', '*', '/'],
            operatorWeights: { '+': 3, '-': 3, '*': 2, '/': 1 },
            maxAttempts: 100,
            requireUniqueSolution: false,
            seed: null
        };
        
        return { ...defaults, ...config };
    }
    
    /**
     * Generate a valid puzzle
     */
    generatePuzzle() {
        let attempts = 0;
        const { maxAttempts } = this.config;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            const puzzle = this.tryGeneratePuzzle();
            
            if (puzzle) {
                return puzzle;
            }
            
            // Fallback strategy after many failed attempts
            if (attempts > maxAttempts / 2) {
                this.applyFallbackStrategy();
            }
        }
        
        // Last resort: generate simplest possible puzzle
        return this.generateFallbackPuzzle();
    }
    
    tryGeneratePuzzle() {
        const { minSlots, maxSlots, requireUniqueSolution } = this.config;
        
        // Random number of slots
        const numSlots = this.rng.nextInt(minSlots, maxSlots);
        
        // Generate AST
        const ast = this.astGenerator.generateRandomAST(numSlots);
        
        // Generate solution numbers
        const solutionNumbers = this.solutionGenerator.generateSolutionNumbers(ast);
        
        if (!solutionNumbers) {
            return null;
        }
        
        // Calculate target
        const target = evaluateAST(ast, solutionNumbers);
        
        if (!isFinite(target)) {
            return null;
        }
        
        // Convert AST to template
        const expressionTemplate = astToTemplate(ast);
        
        // Create puzzle
        const puzzle = new Puzzle(expressionTemplate, target, solutionNumbers, this.config);
        
        // Quality check
        const qualityResult = this.qualityFilters.checkQuality(puzzle, ast);
        if (!qualityResult.valid) {
            return null;
        }
        
        // Check for unique solution if required
        if (requireUniqueSolution && numSlots <= 6) {
            const solutionCount = this.uniqueSolver.countSolutions(puzzle, ast);
            if (solutionCount !== 1) {
                return null;
            }
        }
        
        return puzzle;
    }
    
    applyFallbackStrategy() {
        // Reduce difficulty
        if (this.config.maxSlots > 2) {
            this.config.maxSlots--;
        }
        
        // Reduce division weight
        if (this.config.operatorWeights['/'] > 0) {
            this.config.operatorWeights['/'] = Math.max(0, this.config.operatorWeights['/'] - 1);
        }
    }
    
    generateFallbackPuzzle() {
        // Generate simplest: a + b = target
        const [minNum, maxNum] = this.config.numRange;
        const a = this.rng.nextInt(minNum, maxNum);
        const b = this.rng.nextInt(minNum, maxNum);
        const target = a + b;
        
        return new Puzzle('{} + {}', target, [a, b], this.config);
    }
}

// ============================================================================
// VALIDATION & UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate user's answer against puzzle
 */
function validateAnswer(puzzle, userNumbers) {
    if (userNumbers.length !== puzzle.numSlots) {
        return false;
    }
    
    // Replace placeholders with user numbers
    let expression = puzzle.expressionTemplate;
    for (const num of userNumbers) {
        expression = expression.replace('{}', num);
    }
    
    try {
        // Safe evaluation
        const result = Function('"use strict"; return (' + expression + ')')();
        return Math.abs(result - puzzle.target) < 1e-9;
    } catch (e) {
        return false;
    }
}

/**
 * Pretty print puzzle
 */
function prettyPrint(puzzle) {
    return {
        expression: puzzle.expressionTemplate,
        target: puzzle.target,
        slots: puzzle.numSlots,
        difficulty: puzzle.config.difficulty
    };
}

// ============================================================================
// GAME UI LOGIC
// ============================================================================

class ExpressionPuzzleGame {
    constructor() {
        this.currentPuzzle = null;
        this.puzzleCount = 10;
        this.currentPuzzleIndex = 0;
        this.score = 0;
        this.puzzles = [];
        this.userAnswers = [];
        this.startTime = null;
        this.timePerPuzzle = 60;
        this.puzzleTimer = null;
        this.puzzleStartTime = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.showScreen('config');
    }
    
    setupEventListeners() {
        // Start game
        document.getElementById('startGameBtn').addEventListener('click', () => this.startGame());
        
        // Difficulty buttons
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectDifficulty(btn));
        });
        
        // Check answer
        document.getElementById('checkAnswerBtn').addEventListener('click', () => this.checkAnswer());
        
        // Next puzzle
        document.getElementById('nextPuzzleBtn').addEventListener('click', () => this.nextPuzzle());
        
        // Hint
        document.getElementById('hintBtn').addEventListener('click', () => this.showHint());
        
        // Play again
        document.getElementById('playAgainBtn').addEventListener('click', () => this.resetGame());
    }
    
    selectDifficulty(btn) {
        document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update target range and time based on difficulty
        const difficulty = btn.dataset.difficulty;
        const config = this.getConfigForDifficulty(difficulty);
        
        document.getElementById('minTarget').value = config.targetRange[0];
        document.getElementById('maxTarget').value = config.targetRange[1];
        document.getElementById('timePerPuzzle').value = config.timePerPuzzle;
    }
    
    startGame() {
        // Get configuration
        const difficulty = document.querySelector('.difficulty-btn.active')?.dataset.difficulty || 'medium';
        const puzzleCount = parseInt(document.getElementById('puzzleCount').value) || 10;
        const requireUnique = document.getElementById('requireUnique').checked;
        const minTarget = parseInt(document.getElementById('minTarget').value) || 1;
        const maxTarget = parseInt(document.getElementById('maxTarget').value) || 100;
        const timePerPuzzle = parseInt(document.getElementById('timePerPuzzle').value) || 60;
        
        // Validate target range
        if (minTarget >= maxTarget) {
            alert('Max target must be greater than min target!');
            return;
        }
        
        this.puzzleCount = puzzleCount;
        this.currentPuzzleIndex = 0;
        this.score = 0;
        this.puzzles = [];
        this.userAnswers = [];
        this.startTime = Date.now();
        this.timePerPuzzle = timePerPuzzle;
        
        // Configure generator based on difficulty
        const config = this.getConfigForDifficulty(difficulty);
        config.requireUniqueSolution = requireUnique;
        config.targetRange = [minTarget, maxTarget];
        
        // Generate all puzzles
        const generator = new PuzzleGenerator(config);
        for (let i = 0; i < puzzleCount; i++) {
            this.puzzles.push(generator.generatePuzzle());
        }
        
        // Start first puzzle
        this.currentPuzzle = this.puzzles[0];
        this.displayPuzzle();
        this.showScreen('game');
    }
    
    getConfigForDifficulty(difficulty) {
        const configs = {
            easy: {
                difficulty: 'easy',
                minSlots: 3,
                maxSlots: 4,
                numRange: [1, 15],
                targetRange: [10, 100],
                allowRepeat: true,
                integerOnly: true,
                operatorsAllowed: ['+', '-', '*', '/'],
                operatorWeights: { '+': 3, '-': 2, '*': 2, '/': 1 },
                maxAttempts: 100,
                timePerPuzzle: 90
            },
            medium: {
                difficulty: 'medium',
                minSlots: 4,
                maxSlots: 5,
                numRange: [1, 20],
                targetRange: [10, 200],
                allowRepeat: true,
                integerOnly: true,
                operatorsAllowed: ['+', '-', '*', '/'],
                operatorWeights: { '+': 2, '-': 2, '*': 3, '/': 2 },
                maxAttempts: 150,
                timePerPuzzle: 60
            },
            hard: {
                difficulty: 'hard',
                minSlots: 5,
                maxSlots: 7,
                numRange: [1, 25],
                targetRange: [10, 500],
                allowRepeat: false,
                integerOnly: true,
                operatorsAllowed: ['+', '-', '*', '/'],
                operatorWeights: { '+': 1, '-': 1, '*': 4, '/': 3 },
                maxAttempts: 200,
                timePerPuzzle: 45
            }
        };
        
        return configs[difficulty] || configs.medium;
    }
    
    displayPuzzle() {
        const puzzle = this.currentPuzzle;
        
        // Update progress
        document.getElementById('currentPuzzle').textContent = this.currentPuzzleIndex + 1;
        document.getElementById('totalPuzzles').textContent = this.puzzleCount;
        
        const progress = ((this.currentPuzzleIndex + 1) / this.puzzleCount) * 100;
        document.getElementById('progressFill').style.width = progress + '%';
        
        // Display expression with inline input fields
        const expressionContainer = document.getElementById('expressionDisplay');
        expressionContainer.innerHTML = '';
        
        const parts = puzzle.expressionTemplate.split('{}');
        
        for (let i = 0; i < parts.length; i++) {
            // Add text part (operators and parentheses)
            if (parts[i]) {
                const span = document.createElement('span');
                span.className = 'expression-text';
                span.textContent = parts[i];
                expressionContainer.appendChild(span);
            }
            
            // Add input field inline
            if (i < parts.length - 1) {
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'inline-input';
                input.dataset.index = i;
                input.placeholder = '_';
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.checkAnswer();
                    }
                });
                expressionContainer.appendChild(input);
            }
        }
        
        // Add equals sign and target
        const equalsSpan = document.createElement('span');
        equalsSpan.className = 'expression-text';
        equalsSpan.textContent = ' = ';
        expressionContainer.appendChild(equalsSpan);
        
        const targetSpan = document.createElement('span');
        targetSpan.className = 'expression-text target-number';
        targetSpan.textContent = puzzle.target;
        expressionContainer.appendChild(targetSpan);
        
        // Update stats
        document.getElementById('scoreValue').textContent = this.score;
        
        // Start timer for this puzzle
        this.startPuzzleTimer();
        
        // Clear feedback
        document.getElementById('feedbackArea').innerHTML = '';
        document.getElementById('nextPuzzleBtn').style.display = 'none';
        
        // Focus first input
        const firstInput = expressionContainer.querySelector('.inline-input');
        if (firstInput) {
            firstInput.focus();
        }
    }
    
    startPuzzleTimer() {
        // Clear existing timer
        if (this.puzzleTimer) {
            clearInterval(this.puzzleTimer);
        }
        
        this.puzzleStartTime = Date.now();
        let remainingTime = this.timePerPuzzle;
        
        // Update timer display
        document.getElementById('timerValue').textContent = remainingTime;
        
        // Start countdown
        this.puzzleTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.puzzleStartTime) / 1000);
            remainingTime = this.timePerPuzzle - elapsed;
            
            if (remainingTime <= 0) {
                clearInterval(this.puzzleTimer);
                this.handleTimeout();
            } else {
                document.getElementById('timerValue').textContent = remainingTime;
                
                // Add warning style when time is running out
                const timerElement = document.getElementById('timerValue');
                if (remainingTime <= 10) {
                    timerElement.style.color = '#e74c3c';
                } else if (remainingTime <= 20) {
                    timerElement.style.color = '#f39c12';
                } else {
                    timerElement.style.color = '';
                }
            }
        }, 1000);
    }
    
    handleTimeout() {
        // Record as incorrect answer
        this.userAnswers.push({
            puzzle: this.currentPuzzle,
            userNumbers: [],
            correct: false,
            timeSpent: this.timePerPuzzle * 1000,
            timeout: true
        });
        
        // Disable inputs
        const inputs = document.querySelectorAll('.inline-input');
        inputs.forEach(input => input.disabled = true);
        
        this.showFeedback('⏰ Time\'s up! Moving to next puzzle...', 'error');
        
        // Move to next puzzle or show results
        if (this.currentPuzzleIndex < this.puzzles.length - 1) {
            setTimeout(() => this.nextPuzzle(), 2000);
        } else {
            setTimeout(() => this.showResults(), 2000);
        }
    }
    
    checkAnswer() {
        const inputs = document.querySelectorAll('.inline-input');
        const userNumbers = [];
        
        // Collect user input
        for (const input of inputs) {
            const value = parseFloat(input.value);
            if (isNaN(value)) {
                this.showFeedback('Please fill all slots!', 'error');
                return;
            }
            userNumbers.push(value);
        }
        
        // Stop timer
        if (this.puzzleTimer) {
            clearInterval(this.puzzleTimer);
        }
        
        const timeSpent = Date.now() - this.puzzleStartTime;
        
        // Validate
        const isCorrect = validateAnswer(this.currentPuzzle, userNumbers);
        
        // Store answer
        this.userAnswers.push({
            puzzle: this.currentPuzzle,
            userNumbers: userNumbers,
            correct: isCorrect,
            timeSpent: timeSpent
        });
        
        if (isCorrect) {
            this.score++;
            document.getElementById('scoreValue').textContent = this.score;
            this.showFeedback('🎉 Correct! Well done!', 'success');
            
            // Disable inputs
            inputs.forEach(input => input.disabled = true);
            
            // Show next button
            if (this.currentPuzzleIndex < this.puzzles.length - 1) {
                document.getElementById('nextPuzzleBtn').style.display = 'block';
            } else {
                // Game finished
                setTimeout(() => this.showResults(), 1500);
            }
        } else {
            this.showFeedback('❌ Incorrect. Try again!', 'error');
        }
    }
    
    showHint() {
        const solution = this.currentPuzzle.solutionNumbers;
        const hintIndex = Math.floor(Math.random() * solution.length);
        const hintValue = solution[hintIndex];
        
        this.showFeedback(`💡 Hint: One of the numbers is ${hintValue}`, 'info');
    }
    
    showFeedback(message, type) {
        const feedbackArea = document.getElementById('feedbackArea');
        feedbackArea.innerHTML = `<div class="feedback ${type}">${message}</div>`;
    }
    
    nextPuzzle() {
        this.currentPuzzleIndex++;
        if (this.currentPuzzleIndex < this.puzzles.length) {
            this.currentPuzzle = this.puzzles[this.currentPuzzleIndex];
            this.displayPuzzle();
        }
    }
    
    showResults() {
        const totalTime = Math.floor((Date.now() - this.startTime) / 1000);
        const accuracy = Math.round((this.score / this.puzzleCount) * 100);
        
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('totalQuestions').textContent = this.puzzleCount;
        document.getElementById('accuracyRate').textContent = accuracy + '%';
        document.getElementById('totalTime').textContent = totalTime + 's';
        
        // Show performance message
        let message = '';
        if (accuracy >= 90) {
            message = '🏆 Outstanding! You\'re a puzzle master!';
        } else if (accuracy >= 70) {
            message = '👏 Great job! Keep practicing!';
        } else if (accuracy >= 50) {
            message = '👍 Good effort! Try again to improve!';
        } else {
            message = '💪 Keep practicing! You\'ll get better!';
        }
        document.getElementById('performanceMessage').textContent = message;
        
        this.showScreen('result');
    }
    
    resetGame() {
        if (this.puzzleTimer) {
            clearInterval(this.puzzleTimer);
        }
        this.currentPuzzle = null;
        this.currentPuzzleIndex = 0;
        this.score = 0;
        this.puzzles = [];
        this.userAnswers = [];
        this.showScreen('config');
    }
    
    showScreen(screenName) {
        document.querySelectorAll('.game-screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenName + 'Screen').classList.add('active');
    }
}

// ============================================================================
// INITIALIZE GAME
// ============================================================================

let game;

document.addEventListener('DOMContentLoaded', () => {
    game = new ExpressionPuzzleGame();
});
