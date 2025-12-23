// ============================================================================
// MAZE RUNNER GAME - Brain Training
// Navigate through mazes to train spatial thinking
// ============================================================================

// ============================================================================
// MODULE 1: ADVANCED MAZE GENERATOR
// Uses Growing Tree algorithm with random bias for more junctions
// Includes braiding, quality scoring, and multiple exits
// ============================================================================
class MazeGenerator {
    constructor() {
        this.directions = [
            { dx: 0, dy: -2, wallDx: 0, wallDy: -1 }, // Up
            { dx: 0, dy: 2, wallDx: 0, wallDy: 1 },   // Down
            { dx: -2, dy: 0, wallDx: -1, wallDy: 0 }, // Left
            { dx: 2, dy: 0, wallDx: 1, wallDy: 0 }    // Right
        ];

        // Quality thresholds for maze selection
        this.qualityThresholds = {
            minJunctionRatio: 0.15,      // At least 15% of path cells should be junctions
            maxCorridorRatio: 0.5,       // No more than 50% should be corridors
            maxStraightLength: 5,        // Max average straight segment length
            minWrongBranchLength: 3      // Wrong branches should be at least 3 cells
        };
    }

    /**
     * Generate best maze from multiple candidates
     * @param {number} width - Maze width (should be odd)
     * @param {number} height - Maze height (should be odd)
     * @param {Object} options - Generation options
     * @returns {Object} - Best maze data with multiple exits
     */
    generate(width, height, options = {}) {
        const {
            candidates = 50,           // Number of mazes to generate
            braidAmount = 0.15         // Percentage of dead-ends to remove (0-1)
        } = options;

        // Ensure odd dimensions for proper maze structure
        width = width % 2 === 0 ? width + 1 : width;
        height = height % 2 === 0 ? height + 1 : height;

        const totalWidth = width + 2;
        const totalHeight = height + 2;

        let bestMaze = null;
        let bestScore = -Infinity;

        // Generate multiple candidates and pick the best
        for (let i = 0; i < candidates; i++) {
            const grid = this.initializeGrid(totalWidth, totalHeight);

            // Use Growing Tree algorithm with random bias
            this.growingTreeCarve(grid, totalWidth, totalHeight);

            // Add controlled braiding (remove some dead-ends to create loops)
            this.addBraiding(grid, totalWidth, totalHeight, braidAmount);

            // Score this maze
            const score = this.scoreMaze(grid, totalWidth, totalHeight);

            if (score > bestScore) {
                bestScore = score;
                bestMaze = grid;
            }
        }

        // Create entrance and exit openings for the best maze
        const openings = this.createOpenings(bestMaze, width, height, totalWidth, totalHeight);

        // Calculate optimal paths to all exits
        const pathData = this.calculatePathsToExits(bestMaze, openings);

        return {
            grid: bestMaze,
            start: openings.playerStart,
            exit: openings.primaryExit,
            exits: openings.allExits,
            entrance: openings.entranceInside,
            exitOpenings: openings.exitOpenings,
            startEdge: openings.startEdge,
            exitEdges: openings.exitEdges,
            width: totalWidth,
            height: totalHeight,
            optimalPaths: pathData.paths,
            shortestPath: pathData.shortestPath,
            qualityScore: bestScore
        };
    }

    /**
     * Initialize grid with walls and outside border
     */
    initializeGrid(totalWidth, totalHeight) {
        const grid = [];
        for (let y = 0; y < totalHeight; y++) {
            grid[y] = [];
            for (let x = 0; x < totalWidth; x++) {
                if (x === 0 || x === totalWidth - 1 || y === 0 || y === totalHeight - 1) {
                    grid[y][x] = 'outside';
                } else {
                    grid[y][x] = 'wall';
                }
            }
        }
        return grid;
    }

    /**
     * Growing Tree algorithm with random bias for more junctions
     * Unlike DFS-backtracker, this creates more varied maze structures
     */
    growingTreeCarve(grid, totalWidth, totalHeight) {
        const cells = [];
        const startX = 2;
        const startY = 2;

        grid[startY][startX] = 'path';
        cells.push({ x: startX, y: startY });

        while (cells.length > 0) {
            // Random bias: 70% random selection, 30% newest (like DFS)
            // This creates more junctions than pure DFS
            let index;
            if (Math.random() < 0.7) {
                index = Math.floor(Math.random() * cells.length);
            } else {
                index = cells.length - 1;
            }

            const cell = cells[index];
            const unvisitedNeighbors = this.getUnvisitedNeighbors(grid, cell.x, cell.y, totalWidth, totalHeight);

            if (unvisitedNeighbors.length > 0) {
                // Pick a random unvisited neighbor
                const neighbor = unvisitedNeighbors[Math.floor(Math.random() * unvisitedNeighbors.length)];

                // Carve path to neighbor
                const wallX = cell.x + neighbor.wallDx;
                const wallY = cell.y + neighbor.wallDy;
                grid[wallY][wallX] = 'path';
                grid[neighbor.y][neighbor.x] = 'path';

                cells.push({ x: neighbor.x, y: neighbor.y });
            } else {
                // No unvisited neighbors, remove this cell
                cells.splice(index, 1);
            }
        }
    }

    /**
     * Get unvisited neighboring cells
     */
    getUnvisitedNeighbors(grid, x, y, totalWidth, totalHeight) {
        const neighbors = [];

        for (const dir of this.directions) {
            const newX = x + dir.dx;
            const newY = y + dir.dy;

            if (newX > 1 && newX < totalWidth - 2 &&
                newY > 1 && newY < totalHeight - 2 &&
                grid[newY][newX] === 'wall') {
                neighbors.push({
                    x: newX,
                    y: newY,
                    wallDx: dir.wallDx,
                    wallDy: dir.wallDy
                });
            }
        }

        return neighbors;
    }

    /**
     * Add braiding by removing some dead-ends
     * This creates loops and makes the maze harder to solve by eye
     */
    addBraiding(grid, totalWidth, totalHeight, braidAmount) {
        const deadEnds = this.findDeadEnds(grid, totalWidth, totalHeight);
        const toRemove = Math.floor(deadEnds.length * braidAmount);

        // Shuffle dead ends
        this.shuffleArray(deadEnds);

        for (let i = 0; i < toRemove && i < deadEnds.length; i++) {
            const deadEnd = deadEnds[i];
            this.removeDeadEnd(grid, deadEnd.x, deadEnd.y, totalWidth, totalHeight);
        }
    }

    /**
     * Find all dead-end cells (cells with only one path neighbor)
     */
    findDeadEnds(grid, totalWidth, totalHeight) {
        const deadEnds = [];

        for (let y = 2; y < totalHeight - 2; y++) {
            for (let x = 2; x < totalWidth - 2; x++) {
                if (grid[y][x] === 'path') {
                    const pathNeighbors = this.countPathNeighbors(grid, x, y);
                    if (pathNeighbors === 1) {
                        deadEnds.push({ x, y });
                    }
                }
            }
        }

        return deadEnds;
    }

    /**
     * Count path neighbors (including walls between cells)
     */
    countPathNeighbors(grid, x, y) {
        let count = 0;
        const simpleDirections = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 }
        ];

        for (const dir of simpleDirections) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            if (grid[ny] && (grid[ny][nx] === 'path' || grid[ny][nx] === 'entrance' || grid[ny][nx] === 'exit')) {
                count++;
            }
        }

        return count;
    }

    /**
     * Remove a dead-end by opening a wall to create a loop
     */
    removeDeadEnd(grid, x, y, totalWidth, totalHeight) {
        // Find walls that could be removed to connect to another path
        const wallCandidates = [];

        for (const dir of this.directions) {
            const wallX = x + dir.wallDx;
            const wallY = y + dir.wallDy;
            const beyondX = x + dir.dx;
            const beyondY = y + dir.dy;

            if (wallX > 1 && wallX < totalWidth - 2 &&
                wallY > 1 && wallY < totalHeight - 2 &&
                grid[wallY][wallX] === 'wall' &&
                beyondX > 1 && beyondX < totalWidth - 2 &&
                beyondY > 1 && beyondY < totalHeight - 2 &&
                grid[beyondY][beyondX] === 'path') {
                wallCandidates.push({ wallX, wallY });
            }
        }

        if (wallCandidates.length > 0) {
            const wall = wallCandidates[Math.floor(Math.random() * wallCandidates.length)];
            grid[wall.wallY][wall.wallX] = 'path';
        }
    }

    /**
     * Score a maze based on quality metrics
     */
    scoreMaze(grid, totalWidth, totalHeight) {
        const metrics = this.calculateMazeMetrics(grid, totalWidth, totalHeight);

        let score = 0;

        // Higher junction ratio is better (more decision points)
        score += metrics.junctionRatio * 100;

        // Lower corridor ratio is better (less obvious paths)
        score -= metrics.corridorRatio * 50;

        // Shorter average straight length is better
        score -= metrics.avgStraightLength * 10;

        // More junctions means harder maze
        score += metrics.junctionCount * 2;

        // Penalize very short wrong branches
        if (metrics.avgWrongBranchLength < this.qualityThresholds.minWrongBranchLength) {
            score -= 30;
        }

        return score;
    }

    /**
     * Calculate maze quality metrics
     */
    calculateMazeMetrics(grid, totalWidth, totalHeight) {
        let pathCells = 0;
        let corridorCells = 0;  // Cells with exactly 2 neighbors (straight path)
        let junctionCells = 0;  // Cells with 3+ neighbors
        let deadEndCells = 0;   // Cells with 1 neighbor
        const straightLengths = [];

        // Count cell types
        for (let y = 2; y < totalHeight - 2; y++) {
            for (let x = 2; x < totalWidth - 2; x++) {
                if (grid[y][x] === 'path') {
                    pathCells++;
                    const neighbors = this.countPathNeighbors(grid, x, y);

                    if (neighbors === 1) deadEndCells++;
                    else if (neighbors === 2) corridorCells++;
                    else if (neighbors >= 3) junctionCells++;
                }
            }
        }

        // Calculate straight segment lengths
        const visited = new Set();
        for (let y = 2; y < totalHeight - 2; y++) {
            for (let x = 2; x < totalWidth - 2; x++) {
                if (grid[y][x] === 'path' && !visited.has(`${x},${y}`)) {
                    // Check horizontal straight
                    let hLength = 0;
                    let tx = x;
                    while (tx < totalWidth - 2 && grid[y][tx] === 'path' && this.countPathNeighbors(grid, tx, y) === 2) {
                        visited.add(`${tx},${y}`);
                        hLength++;
                        tx++;
                    }
                    if (hLength > 1) straightLengths.push(hLength);

                    // Check vertical straight
                    let vLength = 0;
                    let ty = y;
                    while (ty < totalHeight - 2 && grid[ty][x] === 'path' && this.countPathNeighbors(grid, x, ty) === 2) {
                        visited.add(`${x},${ty}`);
                        vLength++;
                        ty++;
                    }
                    if (vLength > 1) straightLengths.push(vLength);
                }
            }
        }

        const avgStraightLength = straightLengths.length > 0
            ? straightLengths.reduce((a, b) => a + b, 0) / straightLengths.length
            : 0;

        return {
            pathCells,
            corridorCells,
            junctionCells,
            deadEndCells,
            corridorRatio: pathCells > 0 ? corridorCells / pathCells : 0,
            junctionRatio: pathCells > 0 ? junctionCells / pathCells : 0,
            junctionCount: junctionCells,
            avgStraightLength,
            avgWrongBranchLength: deadEndCells > 0 ? pathCells / deadEndCells : pathCells
        };
    }

    /**
     * Calculate optimal path to exit using BFS
     */
    calculatePathsToExits(grid, openings) {
        const start = openings.entranceInside;
        const paths = [];
        let shortestPath = Infinity;
        let shortestPathData = null;

        for (const exit of openings.exitOpenings) {
            const path = this.findPath(grid, start, exit);
            if (path) {
                paths.push({
                    exit: exit,
                    path: path,
                    length: path.length
                });

                if (path.length < shortestPath) {
                    shortestPath = path.length;
                    shortestPathData = path;
                }
            }
        }

        return { paths, shortestPath: shortestPathData };
    }

    /**
     * BFS pathfinding to find shortest path
     */
    findPath(grid, start, end) {
        const queue = [{ x: start.x, y: start.y, path: [{ x: start.x, y: start.y }] }];
        const visited = new Set();
        visited.add(`${start.x},${start.y}`);

        const directions = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 }
        ];

        while (queue.length > 0) {
            const current = queue.shift();

            if (current.x === end.x && current.y === end.y) {
                return current.path;
            }

            for (const dir of directions) {
                const nx = current.x + dir.dx;
                const ny = current.y + dir.dy;
                const key = `${nx},${ny}`;

                if (!visited.has(key) && grid[ny] &&
                    (grid[ny][nx] === 'path' || grid[ny][nx] === 'entrance' ||
                     grid[ny][nx] === 'exit' || grid[ny][nx]?.startsWith('exit'))) {
                    visited.add(key);
                    queue.push({
                        x: nx,
                        y: ny,
                        path: [...current.path, { x: nx, y: ny }]
                    });
                }
            }
        }

        return null;
    }

    /**
     * Create entrance and exit openings in the maze walls (single exit version)
     */
    createOpenings(grid, mazeWidth, mazeHeight, totalWidth, totalHeight) {
        const edges = ['top', 'bottom', 'left', 'right'];
        // Opposite pairs: top(0) <-> bottom(1), left(2) <-> right(3)
        const oppositeEdge = { 'top': 'bottom', 'bottom': 'top', 'left': 'right', 'right': 'left' };

        // Randomly select entrance edge
        const startEdgeIndex = Math.floor(Math.random() * 4);
        const startEdge = edges[startEdgeIndex];

        // Exit MUST be on the opposite edge (entrance and exit on opposite sides)
        const exitEdge = oppositeEdge[startEdge];

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
            primaryExit: { x: exitPos.outsideX, y: exitPos.outsideY },
            allExits: [{ x: exitPos.outsideX, y: exitPos.outsideY, index: 0 }],
            exitOpenings: [{ x: exitPos.insideX, y: exitPos.insideY }],
            startEdge,
            exitEdges: [exitEdge]
        };
    }

    /**
     * Find a valid position for an opening on a given edge
     */
    findOpeningPosition(grid, edge, totalWidth, totalHeight, usedPositions = new Set()) {
        const candidates = [];

        switch (edge) {
            case 'top':
                for (let x = 2; x < totalWidth - 2; x += 2) {
                    if (grid[2][x] === 'path' && !usedPositions.has(`${x},1`)) {
                        candidates.push({
                            wallX: x, wallY: 1,
                            insideX: x, insideY: 2,
                            outsideX: x, outsideY: 0
                        });
                    }
                }
                break;
            case 'bottom':
                for (let x = 2; x < totalWidth - 2; x += 2) {
                    if (grid[totalHeight - 3][x] === 'path' && !usedPositions.has(`${x},${totalHeight - 2}`)) {
                        candidates.push({
                            wallX: x, wallY: totalHeight - 2,
                            insideX: x, insideY: totalHeight - 3,
                            outsideX: x, outsideY: totalHeight - 1
                        });
                    }
                }
                break;
            case 'left':
                for (let y = 2; y < totalHeight - 2; y += 2) {
                    if (grid[y][2] === 'path' && !usedPositions.has(`1,${y}`)) {
                        candidates.push({
                            wallX: 1, wallY: y,
                            insideX: 2, insideY: y,
                            outsideX: 0, outsideY: y
                        });
                    }
                }
                break;
            case 'right':
                for (let y = 2; y < totalHeight - 2; y += 2) {
                    if (grid[y][totalWidth - 3] === 'path' && !usedPositions.has(`${totalWidth - 2},${y}`)) {
                        candidates.push({
                            wallX: totalWidth - 2, wallY: y,
                            insideX: totalWidth - 3, insideY: y,
                            outsideX: totalWidth - 1, outsideY: y
                        });
                    }
                }
                break;
        }

        if (candidates.length === 0) {
            return this.forceCreateOpening(grid, edge, totalWidth, totalHeight);
        }

        // Add randomness to avoid predictable patterns
        this.shuffleArray(candidates);

        // Pick from shuffled candidates with slight preference for center
        const centerX = Math.floor(totalWidth / 2);
        const centerY = Math.floor(totalHeight / 2);

        candidates.sort((a, b) => {
            const distA = Math.abs(a.wallX - centerX) + Math.abs(a.wallY - centerY);
            const distB = Math.abs(b.wallX - centerX) + Math.abs(b.wallY - centerY);
            return distA - distB + (Math.random() - 0.5) * 4; // Add randomness
        });

        const pickRange = Math.max(1, Math.floor(candidates.length * 0.6));
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
// Supports path efficiency scoring with multiple exits
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
        this.optimalPathLength = 0;
        this.exitUsed = null;
        this.pathEfficiency = 0;

        // Player position
        this.playerPos = { x: 0, y: 0 };

        // Game status
        this.isPlaying = false;
        this.isPaused = false;
    }

    startRound(startPos, timeLimit, optimalPathLength = 0) {
        this.playerPos = { ...startPos };
        this.timeRemaining = timeLimit;
        this.roundSteps = 0;
        this.roundErrors = 0;
        this.roundScore = 0;
        this.optimalPathLength = optimalPathLength;
        this.exitUsed = null;
        this.pathEfficiency = 0;
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

    /**
     * Calculate round score with path efficiency bonus
     * Shorter path = higher score (single exit, multiple paths)
     */
    calculateRoundScore(config, optimalPathLength = null) {
        const baseScore = config.baseScore;
        const timeBonus = Math.floor(this.timeRemaining * config.timeBonus);
        const errorDeduction = this.roundErrors * config.errorPenalty;

        // Calculate path efficiency bonus
        // Player takes one of many possible paths to single exit
        // Efficiency = optimal path length / actual steps taken
        let efficiencyBonus = 0;
        if (optimalPathLength && optimalPathLength > 0 && this.roundSteps > 0) {
            // Efficiency = optimal / actual (capped at 1.0)
            this.pathEfficiency = Math.min(1, optimalPathLength / this.roundSteps);

            // Bonus points for efficiency (max 75 points for perfect efficiency)
            // This rewards finding the shortest of multiple paths
            efficiencyBonus = Math.floor(this.pathEfficiency * 75);
        } else {
            this.pathEfficiency = 1; // Default to 100% if no path data
        }

        this.roundScore = Math.max(0, baseScore + timeBonus + efficiencyBonus - errorDeduction);
        this.totalScore += this.roundScore;
        this.roundsCompleted++;

        return {
            roundScore: this.roundScore,
            baseScore,
            timeBonus,
            efficiencyBonus,
            errorDeduction,
            pathEfficiency: Math.round(this.pathEfficiency * 100)
        };
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
// Supports multiple exits with visual distinction
// ============================================================================
class MazeRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.cells = [];
        this.playerDirection = 'down';
    }

    render(mazeData, playerPos) {
        const { grid, width, height, startEdge, exitEdges } = mazeData;

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
                        // Exit destination (outside maze) - single exit
                        cell.classList.add('outside', 'finish-zone');
                        if (exitEdges && exitEdges[0]) cell.classList.add(`finish-${exitEdges[0]}`);
                        break;
                    case 'entrance':
                        // Opening in wall (entrance)
                        cell.classList.add('path', 'entrance-opening');
                        if (startEdge) cell.classList.add(`opening-${startEdge}`);
                        break;
                    case 'exit':
                        // Exit opening in wall - single exit
                        cell.classList.add('path', 'exit-opening');
                        if (exitEdges && exitEdges[0]) cell.classList.add(`opening-${exitEdges[0]}`);
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
                // Can move to: path, entrance, any exit/finish (but not wall or regular outside)
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

    /**
     * Show optimal path with animation
     * @param {Array} path - Array of {x, y} coordinates
     * @param {number} delay - Delay between each step (ms)
     */
    showOptimalPath(path, delay = 100) {
        if (!path || path.length === 0) return Promise.resolve();

        return new Promise((resolve) => {
            let index = 0;
            const intervalId = setInterval(() => {
                if (index >= path.length) {
                    clearInterval(intervalId);
                    resolve();
                    return;
                }

                const pos = path[index];
                const cell = this.getCell(pos.x, pos.y);
                if (cell) {
                    cell.classList.add('optimal-path');
                }
                index++;
            }, delay);
        });
    }

    /**
     * Clear optimal path highlighting
     */
    clearOptimalPath() {
        this.container.querySelectorAll('.optimal-path').forEach(cell => {
            cell.classList.remove('optimal-path');
        });
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
        // Generate maze for current round with advanced options
        const mazeSize = this.config.getMazeSize(this.state.currentRound);

        // Configure maze generation based on difficulty
        // Braiding creates loops = multiple paths to the SAME exit
        // Higher braid = more alternative routes
        const mazeOptions = {
            candidates: this.config.difficulty === 'easy' ? 30 : 50,
            braidAmount: this.config.difficulty === 'easy' ? 0.15 : 0.25 // More braiding = more paths
        };

        this.currentMaze = this.mazeGenerator.generate(mazeSize, mazeSize, mazeOptions);

        // Get time limit
        const timeLimit = this.config.getTimeLimit(this.state.currentRound);

        // Get optimal path length for scoring
        // shortestPath.length + 3 = total steps (see completeRound for explanation)
        const optimalPathLength = this.currentMaze.shortestPath
            ? this.currentMaze.shortestPath.length + 3
            : 0;

        // Initialize round state with optimal path info
        this.state.startRound(this.currentMaze.start, timeLimit, optimalPathLength);

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

        // Check if reached finish zone (single exit)
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

        // Get the optimal path length for scoring
        // shortestPath contains cells from entranceInside to exitOpening (N cells = N-1 steps)
        // Player walks: start -> entrance -> entranceInside -> ... -> exitOpening -> exit -> finish
        // Extra steps: start->entrance (1) + entrance->entranceInside (1) + exitOpening->exit (1) + exit->finish (1) = 4
        // Total optimal steps = (N - 1) + 4 = N + 3
        let optimalPathLength = null;
        if (success && this.currentMaze.shortestPath) {
            optimalPathLength = this.currentMaze.shortestPath.length + 3;
        }

        // Calculate score with path efficiency
        // Shorter path = higher score (multiple routes possible due to braiding)
        const scoreDetails = this.state.calculateRoundScore(this.config, optimalPathLength);

        // Show optimal path if round was successful
        if (success && this.currentMaze.shortestPath) {
            // Show path with animation, then wait for user to click continue
            const userSteps = this.state.roundSteps;
            const optimalSteps = optimalPathLength;
            this.showOptimalPathOverlay(userSteps, optimalSteps, () => {
                this.hideOptimalPathOverlay();
                this.renderer.clearOptimalPath();
                this.showRoundCompleteModal(success, scoreDetails);
            });
            this.renderer.showOptimalPath(this.currentMaze.shortestPath, 50);
        } else {
            // No path to show, go directly to modal
            this.showRoundCompleteModal(success, scoreDetails);
        }
    }

    showOptimalPathOverlay(userSteps, optimalSteps, onContinue) {
        // Create overlay message with stats and continue button
        const overlay = document.createElement('div');
        overlay.id = 'optimalPathOverlay';
        overlay.className = 'optimal-path-overlay';
        overlay.innerHTML = `
            <div class="optimal-path-message">✨ Optimal Path ✨</div>
            <div class="optimal-path-stats">
                <span>Your steps: ${userSteps}</span>
                <span>Optimal: ${optimalSteps}</span>
            </div>
            <button class="optimal-path-continue-btn">Continue</button>
        `;
        document.body.appendChild(overlay);

        // Add click handler for continue button
        const continueBtn = overlay.querySelector('.optimal-path-continue-btn');
        continueBtn.addEventListener('click', onContinue);
    }

    hideOptimalPathOverlay() {
        const overlay = document.getElementById('optimalPathOverlay');
        if (overlay) {
            overlay.remove();
        }
    }

    showRoundCompleteModal(success, scoreDetails) {
        // Update round complete screen
        if (success) {
            if (scoreDetails.pathEfficiency >= 95) {
                this.elements.roundIcon.textContent = '🌟';
                this.elements.roundTitle.textContent = 'Perfect Path!';
            } else if (scoreDetails.pathEfficiency >= 80) {
                this.elements.roundIcon.textContent = '✅';
                this.elements.roundTitle.textContent = 'Great Job!';
            } else if (scoreDetails.pathEfficiency >= 60) {
                this.elements.roundIcon.textContent = '👍';
                this.elements.roundTitle.textContent = 'Round Complete!';
            } else {
                this.elements.roundIcon.textContent = '🔄';
                this.elements.roundTitle.textContent = 'Try a shorter path!';
            }
        } else {
            this.elements.roundIcon.textContent = '⏰';
            this.elements.roundTitle.textContent = 'Time\'s Up!';
        }

        this.elements.roundTimeRemaining.textContent = `${this.state.timeRemaining}s`;
        this.elements.roundSteps.textContent = this.state.roundSteps;
        this.elements.roundErrors.textContent = this.state.roundErrors;
        this.elements.roundScore.textContent = scoreDetails.roundScore;

        // Update efficiency display if element exists
        const efficiencyDisplay = document.getElementById('roundEfficiency');
        if (efficiencyDisplay) {
            efficiencyDisplay.textContent = `${scoreDetails.pathEfficiency}%`;
        }

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
