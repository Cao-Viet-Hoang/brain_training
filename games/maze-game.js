// ============================================================================
// MAZE RUNNER GAME - Brain Training
// Navigate through mazes to train spatial thinking
// ============================================================================

// ============================================================================
// MODULE 1: ADVANCED MAZE GENERATOR
// Uses Hybrid algorithm: Growing Tree + Recursive Division + Noise Generation
// Creates challenging mazes with many dead-ends, fake paths, and confusing junctions
// ============================================================================
class MazeGenerator {
    constructor() {
        this.directions = [
            { dx: 0, dy: -2, wallDx: 0, wallDy: -1 }, // Up
            { dx: 0, dy: 2, wallDx: 0, wallDy: 1 },   // Down
            { dx: -2, dy: 0, wallDx: -1, wallDy: 0 }, // Left
            { dx: 2, dy: 0, wallDx: 1, wallDy: 0 }    // Right
        ];

        this.simpleDirections = [
            { dx: 0, dy: -1 }, // Up
            { dx: 0, dy: 1 },  // Down
            { dx: -1, dy: 0 }, // Left
            { dx: 1, dy: 0 }   // Right
        ];

        // Quality thresholds for maze selection - stricter for harder mazes
        this.qualityThresholds = {
            minJunctionRatio: 0.20,      // At least 20% of path cells should be junctions
            maxCorridorRatio: 0.35,      // No more than 35% should be corridors
            maxStraightLength: 3,        // Max average straight segment length
            minWrongBranchLength: 4,     // Wrong branches should be at least 4 cells
            minDeadEndRatio: 0.15        // At least 15% dead ends to confuse
        };
    }

    /**
     * Generate best maze from multiple candidates with advanced algorithms
     * @param {number} width - Maze width (should be odd)
     * @param {number} height - Maze height (should be odd)
     * @param {Object} options - Generation options
     * @returns {Object} - Best maze data with multiple exits
     */
    generate(width, height, options = {}) {
        const {
            candidates = 80,           // More candidates for better selection
            braidAmount = 0.20,        // Higher braiding for more loops/confusion
            algorithm = 'hybrid',      // 'hybrid', 'recursive_division', 'growing_tree', 'eller'
            noiseLevel = 0.3           // Amount of noise/fake paths to add
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

            // Use different algorithms based on configuration
            switch (algorithm) {
                case 'recursive_division':
                    this.recursiveDivisionCarve(grid, totalWidth, totalHeight);
                    break;
                case 'eller':
                    this.ellerAlgorithmCarve(grid, totalWidth, totalHeight);
                    break;
                case 'hybrid':
                    this.hybridCarve(grid, totalWidth, totalHeight);
                    break;
                default:
                    this.growingTreeCarve(grid, totalWidth, totalHeight);
            }

            // Add controlled braiding (remove some dead-ends to create loops)
            this.addBraiding(grid, totalWidth, totalHeight, braidAmount);

            // Add noise and fake paths to increase difficulty
            this.addNoisePaths(grid, totalWidth, totalHeight, noiseLevel);

            // Add extra dead-end extensions to confuse players
            this.extendDeadEnds(grid, totalWidth, totalHeight);

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
     * Hybrid algorithm combining multiple techniques for maximum difficulty
     * Uses Growing Tree with aggressive random bias + Recursive Division features
     */
    hybridCarve(grid, totalWidth, totalHeight) {
        // First pass: Growing Tree with very high random bias for many junctions
        this.growingTreeCarve(grid, totalWidth, totalHeight, 0.85);

        // Second pass: Add recursive division walls to create more complexity
        this.addRecursiveWalls(grid, totalWidth, totalHeight);
    }

    /**
     * Growing Tree algorithm with configurable random bias
     * Higher randomBias = more junctions and complex structures
     */
    growingTreeCarve(grid, totalWidth, totalHeight, randomBias = 0.7) {
        const cells = [];
        const startX = 2;
        const startY = 2;

        grid[startY][startX] = 'path';
        cells.push({ x: startX, y: startY });

        while (cells.length > 0) {
            // Configurable random bias for cell selection
            let index;
            if (Math.random() < randomBias) {
                // Random selection creates more branches
                index = Math.floor(Math.random() * cells.length);
            } else {
                // Newest selection creates longer corridors
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
     * Recursive Division algorithm - creates maze with long walls
     * Good for creating confusing large open areas with strategic walls
     */
    recursiveDivisionCarve(grid, totalWidth, totalHeight) {
        // First, create all paths
        for (let y = 2; y < totalHeight - 2; y++) {
            for (let x = 2; x < totalWidth - 2; x++) {
                grid[y][x] = 'path';
            }
        }

        // Then divide recursively
        this.divide(grid, 2, 2, totalWidth - 4, totalHeight - 4);
    }

    /**
     * Recursive division helper - divides a chamber with a wall
     */
    divide(grid, x, y, width, height) {
        if (width < 4 || height < 4) return;

        // Choose orientation based on aspect ratio with some randomness
        const horizontal = width < height ? true : (width > height ? false : Math.random() < 0.5);

        if (horizontal) {
            // Build horizontal wall
            const wallY = y + 2 + Math.floor(Math.random() * Math.floor((height - 3) / 2)) * 2;
            const passageX = x + Math.floor(Math.random() * Math.floor(width / 2)) * 2;

            for (let wx = x; wx < x + width; wx++) {
                if (wx !== passageX && wx !== passageX + 1) {
                    grid[wallY][wx] = 'wall';
                }
            }

            // Recurse on both sides
            this.divide(grid, x, y, width, wallY - y);
            this.divide(grid, x, wallY + 1, width, height - (wallY - y) - 1);
        } else {
            // Build vertical wall
            const wallX = x + 2 + Math.floor(Math.random() * Math.floor((width - 3) / 2)) * 2;
            const passageY = y + Math.floor(Math.random() * Math.floor(height / 2)) * 2;

            for (let wy = y; wy < y + height; wy++) {
                if (wy !== passageY && wy !== passageY + 1) {
                    grid[wy][wallX] = 'wall';
                }
            }

            // Recurse on both sides
            this.divide(grid, x, y, wallX - x, height);
            this.divide(grid, wallX + 1, y, width - (wallX - x) - 1, height);
        }
    }

    /**
     * Add recursive division-style walls to existing maze for extra complexity
     */
    addRecursiveWalls(grid, totalWidth, totalHeight) {
        const iterations = Math.floor((totalWidth + totalHeight) / 8);

        for (let i = 0; i < iterations; i++) {
            // Find a 3x3 or larger open area and add a wall segment
            const x = 2 + Math.floor(Math.random() * (totalWidth - 6));
            const y = 2 + Math.floor(Math.random() * (totalHeight - 6));

            // Check if area is mostly paths
            let pathCount = 0;
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    if (grid[y + dy] && grid[y + dy][x + dx] === 'path') {
                        pathCount++;
                    }
                }
            }

            // If area is mostly paths, add a wall with passage
            if (pathCount >= 7) {
                const horizontal = Math.random() < 0.5;
                if (horizontal && y + 1 < totalHeight - 2) {
                    // Add horizontal wall with one passage
                    const passageOffset = Math.floor(Math.random() * 3);
                    for (let dx = 0; dx < 3; dx++) {
                        if (dx !== passageOffset && grid[y + 1][x + dx] === 'path') {
                            // Only add wall if it doesn't block the only path
                            const neighbors = this.countPathNeighbors(grid, x + dx, y + 1);
                            if (neighbors > 2) {
                                grid[y + 1][x + dx] = 'wall';
                            }
                        }
                    }
                } else if (x + 1 < totalWidth - 2) {
                    // Add vertical wall with one passage
                    const passageOffset = Math.floor(Math.random() * 3);
                    for (let dy = 0; dy < 3; dy++) {
                        if (dy !== passageOffset && grid[y + dy][x + 1] === 'path') {
                            const neighbors = this.countPathNeighbors(grid, x + 1, y + dy);
                            if (neighbors > 2) {
                                grid[y + dy][x + 1] = 'wall';
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Eller's Algorithm - creates mazes row by row
     * Known for creating challenging, unbiased mazes
     */
    ellerAlgorithmCarve(grid, totalWidth, totalHeight) {
        const mazeWidth = Math.floor((totalWidth - 3) / 2) + 1;
        const mazeHeight = Math.floor((totalHeight - 3) / 2) + 1;

        // Initialize sets for first row
        let sets = [];
        let nextSetId = 0;
        for (let x = 0; x < mazeWidth; x++) {
            sets[x] = nextSetId++;
        }

        for (let row = 0; row < mazeHeight; row++) {
            const y = 2 + row * 2;

            // Create cells for this row
            for (let x = 0; x < mazeWidth; x++) {
                const cellX = 2 + x * 2;
                grid[y][cellX] = 'path';
            }

            // Randomly merge adjacent cells in the same row
            for (let x = 0; x < mazeWidth - 1; x++) {
                const cellX = 2 + x * 2;
                if (sets[x] !== sets[x + 1] && (row === mazeHeight - 1 || Math.random() < 0.5)) {
                    // Merge by removing wall
                    grid[y][cellX + 1] = 'path';
                    const oldSet = sets[x + 1];
                    const newSet = sets[x];
                    for (let i = 0; i < mazeWidth; i++) {
                        if (sets[i] === oldSet) sets[i] = newSet;
                    }
                }
            }

            // Create vertical connections to next row (except for last row)
            if (row < mazeHeight - 1) {
                const nextY = y + 2;
                const setConnections = {};

                // Group cells by set
                for (let x = 0; x < mazeWidth; x++) {
                    if (!setConnections[sets[x]]) {
                        setConnections[sets[x]] = [];
                    }
                    setConnections[sets[x]].push(x);
                }

                // Each set must have at least one vertical connection
                const newSets = [];
                for (let x = 0; x < mazeWidth; x++) {
                    newSets[x] = nextSetId++;
                }

                for (const setId in setConnections) {
                    const cells = setConnections[setId];
                    this.shuffleArray(cells);

                    // Ensure at least one connection per set
                    const connectionCount = 1 + Math.floor(Math.random() * cells.length);
                    for (let i = 0; i < connectionCount; i++) {
                        const x = cells[i];
                        const cellX = 2 + x * 2;
                        grid[y + 1][cellX] = 'path'; // Remove wall
                        grid[nextY][cellX] = 'path'; // Next row cell
                        newSets[x] = parseInt(setId);
                    }
                }

                sets = newSets;
            }
        }
    }

    /**
     * Add noise paths - create fake paths that lead nowhere
     * This makes the maze much harder to solve visually
     */
    addNoisePaths(grid, totalWidth, totalHeight, noiseLevel) {
        const totalCells = (totalWidth - 4) * (totalHeight - 4);
        const noiseCount = Math.floor(totalCells * noiseLevel * 0.1);

        for (let i = 0; i < noiseCount; i++) {
            // Find a wall cell adjacent to a path
            const x = 2 + Math.floor(Math.random() * (totalWidth - 4));
            const y = 2 + Math.floor(Math.random() * (totalHeight - 4));

            if (grid[y][x] === 'wall') {
                // Check if adjacent to exactly one path (to create dead-end)
                const pathNeighbors = [];
                for (const dir of this.simpleDirections) {
                    const nx = x + dir.dx;
                    const ny = y + dir.dy;
                    if (grid[ny] && grid[ny][nx] === 'path') {
                        pathNeighbors.push({ x: nx, y: ny });
                    }
                }

                if (pathNeighbors.length === 1) {
                    // Create a small dead-end branch
                    grid[y][x] = 'path';

                    // Extend the dead-end randomly
                    let currentX = x;
                    let currentY = y;
                    const branchLength = 1 + Math.floor(Math.random() * 3);

                    for (let j = 0; j < branchLength; j++) {
                        const availableDirs = [];
                        for (const dir of this.simpleDirections) {
                            const nx = currentX + dir.dx;
                            const ny = currentY + dir.dy;
                            if (nx > 1 && nx < totalWidth - 2 &&
                                ny > 1 && ny < totalHeight - 2 &&
                                grid[ny][nx] === 'wall') {
                                // Check this won't create a loop
                                const wallNeighbors = this.countPathNeighbors(grid, nx, ny);
                                if (wallNeighbors <= 1) {
                                    availableDirs.push({ x: nx, y: ny });
                                }
                            }
                        }

                        if (availableDirs.length > 0) {
                            const next = availableDirs[Math.floor(Math.random() * availableDirs.length)];
                            grid[next.y][next.x] = 'path';
                            currentX = next.x;
                            currentY = next.y;
                        } else {
                            break;
                        }
                    }
                }
            }
        }
    }

    /**
     * Extend existing dead-ends to make them longer and more confusing
     */
    extendDeadEnds(grid, totalWidth, totalHeight) {
        const deadEnds = this.findDeadEnds(grid, totalWidth, totalHeight);
        this.shuffleArray(deadEnds);

        // Extend about 30% of dead ends
        const toExtend = Math.floor(deadEnds.length * 0.3);

        for (let i = 0; i < toExtend; i++) {
            const deadEnd = deadEnds[i];
            let currentX = deadEnd.x;
            let currentY = deadEnd.y;

            // Find the direction away from the path
            const pathDir = this.findPathDirection(grid, currentX, currentY);
            if (!pathDir) continue;

            // Try to extend in the opposite direction
            const extendDir = { dx: -pathDir.dx, dy: -pathDir.dy };
            const extensionLength = 2 + Math.floor(Math.random() * 4);

            for (let j = 0; j < extensionLength; j++) {
                const nx = currentX + extendDir.dx;
                const ny = currentY + extendDir.dy;

                if (nx > 1 && nx < totalWidth - 2 &&
                    ny > 1 && ny < totalHeight - 2 &&
                    grid[ny][nx] === 'wall') {
                    // Check this won't connect to another path
                    const neighbors = this.countPathNeighbors(grid, nx, ny);
                    if (neighbors === 1) {
                        grid[ny][nx] = 'path';
                        currentX = nx;
                        currentY = ny;
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }
        }
    }

    /**
     * Find the direction where the path neighbor is
     */
    findPathDirection(grid, x, y) {
        for (const dir of this.simpleDirections) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            if (grid[ny] && grid[ny][nx] === 'path') {
                return dir;
            }
        }
        return null;
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
// Enhanced with custom maze size and difficulty-based noise levels
// ============================================================================
class MazeGameConfig {
    constructor(options = {}) {
        // Game mode
        this.mode = options.mode || 'classic'; // 'classic', 'fog_light', 'fog_heavy'

        // Difficulty settings
        this.difficulty = options.difficulty || 'medium'; // 'easy', 'medium', 'hard'

        // Number of rounds
        this.totalRounds = options.totalRounds || 5;

        // Custom maze size (user-defined, minimum 10)
        this.customMazeSize = Math.max(10, options.customMazeSize || 15);

        // Time limits (in seconds) based on maze size
        // Larger mazes need more time
        this.baseTimePerCell = 0.1; // seconds per cell approximately (reduced by 87.5%)
        this.minTime = 30;
        this.maxTime = 300;

        // Scoring Configuration
        // New scoring formula based on: optimal path, errors, and completion time
        this.scoring = {
            // Base score for completing a round
            baseScore: 100,

            // Path efficiency scoring (comparing actual steps vs optimal path)
            // Score = maxPathBonus * (optimalSteps / actualSteps)
            // Perfect efficiency (optimalSteps == actualSteps) = maxPathBonus points
            maxPathBonus: 150,

            // Error penalty (hitting walls)
            // Each wall hit deducts points
            errorPenalty: 10,

            // Time bonus scoring
            // Bonus = timeRemaining * timeBonusPerSecond
            // Rewards faster completion
            timeBonusPerSecond: 3,

            // Time efficiency bonus (percentage of time remaining)
            // Additional bonus for completing quickly relative to time limit
            // Score = maxTimeEfficiencyBonus * (timeRemaining / totalTime)
            maxTimeEfficiencyBonus: 50
        };

        // Difficulty-based noise and complexity settings (base values)
        // These increase each round to make later rounds harder
        this.difficultySettings = {
            easy: {
                noiseLevel: 0.10,      // Less fake paths (base)
                braidAmount: 0.10,     // Fewer loops (base)
                candidates: 50,        // Less candidates = slightly less optimal mazes
                algorithm: 'growing_tree',
                // Per-round increases
                noiseIncreasePerRound: 0.03,
                braidIncreasePerRound: 0.02
            },
            medium: {
                noiseLevel: 0.20,      // Moderate fake paths (base)
                braidAmount: 0.15,     // More loops to confuse (base)
                candidates: 80,        // More candidates for better maze selection
                algorithm: 'hybrid',
                // Per-round increases
                noiseIncreasePerRound: 0.04,
                braidIncreasePerRound: 0.03
            },
            hard: {
                noiseLevel: 0.30,      // High fake paths (base)
                braidAmount: 0.20,     // Many loops (base)
                candidates: 100,       // Maximum candidates for most challenging mazes
                algorithm: 'hybrid',
                // Per-round increases
                noiseIncreasePerRound: 0.05,
                braidIncreasePerRound: 0.04
            }
        };
    }

    /**
     * Get maze size for a specific round
     * Size remains constant across all rounds (user-defined)
     */
    getMazeSize(round) {
        return this.customMazeSize;
    }

    /**
     * Get time limit for a specific round
     * Calculated based on maze size
     */
    getTimeLimit(round) {
        const mazeSize = this.getMazeSize(round);
        const totalCells = mazeSize * mazeSize;

        // Base time calculation: more cells = more time
        // But harder difficulties get slightly less time
        const difficultyMultiplier = {
            easy: 1.2,
            medium: 1.0,
            hard: 0.85
        };

        let baseTime = Math.floor(totalCells * this.baseTimePerCell * difficultyMultiplier[this.difficulty]);

        // Round reduction (less time each round)
        const reduction = (round - 1) * 5;
        baseTime = baseTime - reduction;

        // Fog mode time bonus: more time due to limited visibility
        if (this.mode === 'fog_light') {
            baseTime = Math.floor(baseTime * 1.25); // +25% for light fog
        } else if (this.mode === 'fog_heavy') {
            baseTime = Math.floor(baseTime * 1.75); // +75% for heavy fog
        }

        return Math.max(this.minTime, Math.min(baseTime, this.maxTime));
    }

    /**
     * Get maze generation options based on difficulty and round
     * Later rounds have more noise, braiding, and complexity
     */
    getMazeOptions(round) {
        const settings = this.difficultySettings[this.difficulty];

        // Calculate round-based increases (round 1 = base values)
        const roundMultiplier = round - 1;
        const noiseIncrease = roundMultiplier * settings.noiseIncreasePerRound;
        const braidIncrease = roundMultiplier * settings.braidIncreasePerRound;

        // Cap maximum values to prevent over-complexity
        const maxNoise = 0.55;
        const maxBraid = 0.50;

        return {
            candidates: settings.candidates,
            braidAmount: Math.min(maxBraid, settings.braidAmount + braidIncrease),
            algorithm: settings.algorithm,
            noiseLevel: Math.min(maxNoise, settings.noiseLevel + noiseIncrease)
        };
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
     * Calculate round score based on optimal path, errors, and completion time
     *
     * Scoring Formula:
     * 1. Base Score: Fixed points for completing the round
     * 2. Path Efficiency Bonus: maxPathBonus * (optimalSteps / actualSteps)
     *    - Perfect path = full bonus, extra steps reduce bonus
     * 3. Error Penalty: errorPenalty * numberOfErrors
     *    - Each wall hit deducts points
     * 4. Time Bonus: timeBonusPerSecond * timeRemaining
     *    - Faster completion = more points
     * 5. Time Efficiency Bonus: maxTimeEfficiencyBonus * (timeRemaining / totalTime)
     *    - Additional bonus based on percentage of time saved
     *
     * Final Score = Base + PathBonus + TimeBonus + TimeEfficiencyBonus - ErrorPenalty
     */
    calculateRoundScore(config, optimalPathLength = null, totalTime = null) {
        const scoring = config.scoring;

        // 1. Base score for completing the round
        const baseScore = scoring.baseScore;

        // 2. Path efficiency bonus
        // Compare actual steps taken vs optimal path length
        let pathEfficiencyBonus = 0;
        if (optimalPathLength && optimalPathLength > 0 && this.roundSteps > 0) {
            // Efficiency ratio: optimal / actual (capped at 1.0 for perfect or better)
            this.pathEfficiency = Math.min(1, optimalPathLength / this.roundSteps);
            // Bonus = maxPathBonus * efficiency
            pathEfficiencyBonus = Math.floor(scoring.maxPathBonus * this.pathEfficiency);
        } else {
            this.pathEfficiency = 1; // Default to 100% if no path data
            pathEfficiencyBonus = scoring.maxPathBonus;
        }

        // 3. Error penalty (wall hits)
        const errorPenalty = this.roundErrors * scoring.errorPenalty;

        // 4. Time bonus (points per second remaining)
        const timeBonus = Math.floor(this.timeRemaining * scoring.timeBonusPerSecond);

        // 5. Time efficiency bonus (percentage of time remaining)
        let timeEfficiencyBonus = 0;
        if (totalTime && totalTime > 0) {
            const timeEfficiency = this.timeRemaining / totalTime;
            timeEfficiencyBonus = Math.floor(scoring.maxTimeEfficiencyBonus * timeEfficiency);
        }

        // Calculate final round score (minimum 0)
        this.roundScore = Math.max(0,
            baseScore +
            pathEfficiencyBonus +
            timeBonus +
            timeEfficiencyBonus -
            errorPenalty
        );

        // Update totals
        this.totalScore += this.roundScore;
        this.roundsCompleted++;

        // Return detailed breakdown for display
        return {
            roundScore: this.roundScore,
            baseScore,
            pathEfficiencyBonus,
            pathEfficiency: Math.round(this.pathEfficiency * 100),
            optimalSteps: optimalPathLength || 0,
            actualSteps: this.roundSteps,
            errorPenalty,
            errorCount: this.roundErrors,
            timeBonus,
            timeEfficiencyBonus,
            timeRemaining: this.timeRemaining,
            totalTime: totalTime || 0
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
// Supports multiple exits with visual distinction and fog of war modes
// ============================================================================
class MazeRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.cells = [];
        this.playerDirection = 'down';

        // Fog of war settings
        this.fogMode = 'classic'; // 'classic', 'fog_light', 'fog_heavy'
        this.visibilityRadius = 3; // Cells visible around player in light fog
        this.visitedCells = new Set(); // Track visited cells for fog memory
    }

    /**
     * Set fog mode for the renderer
     * @param {string} mode - 'classic', 'fog_light', or 'fog_heavy'
     */
    setFogMode(mode) {
        this.fogMode = mode;
        // Adjust visibility radius based on mode
        if (mode === 'fog_light') {
            this.visibilityRadius = 3;
        } else if (mode === 'fog_heavy') {
            this.visibilityRadius = 1;
        }
    }

    /**
     * Reset fog state for new round
     */
    resetFogState() {
        this.visitedCells.clear();
    }

    /**
     * Calculate distance between two cells (Manhattan distance)
     */
    getDistance(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }

    /**
     * Check if a cell is visible based on fog mode
     * @param {number} cellX - Cell X position
     * @param {number} cellY - Cell Y position
     * @param {number} playerX - Player X position
     * @param {number} playerY - Player Y position
     * @param {string} cellType - Type of cell (for special visibility rules)
     * @returns {string} - 'visible', 'remembered', or 'hidden'
     */
    getCellVisibility(cellX, cellY, playerX, playerY, cellType = null) {
        if (this.fogMode === 'classic') {
            return 'visible';
        }

        // Exit and finish zones are always visible (so player knows the goal)
        if (cellType === 'exit' || cellType === 'finish') {
            return 'visible';
        }

        const distance = this.getDistance(cellX, cellY, playerX, playerY);
        const cellKey = `${cellX},${cellY}`;

        // Cell is within visibility radius
        if (distance <= this.visibilityRadius) {
            return 'visible';
        }

        // For light fog: show visited cells as remembered (dimmed)
        if (this.fogMode === 'fog_light' && this.visitedCells.has(cellKey)) {
            return 'remembered';
        }

        // Heavy fog: no memory, everything outside radius is hidden
        return 'hidden';
    }

    /**
     * Mark a cell as visited (for fog memory)
     */
    markCellVisited(x, y) {
        // Mark the cell and its visible neighbors as visited
        for (let dy = -this.visibilityRadius; dy <= this.visibilityRadius; dy++) {
            for (let dx = -this.visibilityRadius; dx <= this.visibilityRadius; dx++) {
                if (this.getDistance(0, 0, dx, dy) <= this.visibilityRadius) {
                    this.visitedCells.add(`${x + dx},${y + dy}`);
                }
            }
        }
    }

    render(mazeData, playerPos) {
        const { grid, width, height, startEdge, exitEdges } = mazeData;

        // Clear container
        this.container.innerHTML = '';
        this.cells = [];

        // Set grid size class with fog mode
        this.container.className = `maze-grid size-${width}`;
        if (this.fogMode !== 'classic') {
            this.container.classList.add('fog-mode', `fog-${this.fogMode.replace('fog_', '')}`);
        }

        // Mark initial player position as visited for fog
        if (this.fogMode !== 'classic') {
            this.markCellVisited(playerPos.x, playerPos.y);
        }

        // Create cells
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const cell = document.createElement('div');
                cell.className = 'maze-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;

                const cellType = grid[y][x];
                cell.dataset.cellType = cellType; // Store for fog updates

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

                // Apply fog visibility
                if (this.fogMode !== 'classic') {
                    const visibility = this.getCellVisibility(x, y, playerPos.x, playerPos.y, cellType);
                    cell.classList.add(`fog-${visibility}`);
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

        // Update fog visibility if fog mode is active
        if (this.fogMode !== 'classic') {
            this.updateFogVisibility(newPos);
        }
    }

    /**
     * Update fog visibility around player's new position
     * @param {Object} playerPos - Current player position {x, y}
     */
    updateFogVisibility(playerPos) {
        // Mark current area as visited
        this.markCellVisited(playerPos.x, playerPos.y);

        // Update all cells' fog state
        for (let y = 0; y < this.cells.length; y++) {
            if (!this.cells[y]) continue;
            for (let x = 0; x < this.cells[y].length; x++) {
                const cell = this.cells[y][x];
                if (!cell) continue;

                // Remove old fog classes
                cell.classList.remove('fog-visible', 'fog-remembered', 'fog-hidden');

                // Add new fog class (use stored cellType for exit visibility)
                const cellType = cell.dataset.cellType;
                const visibility = this.getCellVisibility(x, y, playerPos.x, playerPos.y, cellType);
                cell.classList.add(`fog-${visibility}`);
            }
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

    /**
     * Reveal all cells (remove fog) - used at end of round in fog modes
     * Shows the entire maze so player can see the full layout
     */
    revealAllCells() {
        if (this.fogMode === 'classic') return;

        // Remove fog mode classes from container for cleaner reveal
        this.container.classList.remove('fog-mode', 'fog-light', 'fog-heavy');

        // Reveal all cells with animation (wave effect from center outward)
        const centerY = Math.floor(this.cells.length / 2);
        const centerX = this.cells[0] ? Math.floor(this.cells[0].length / 2) : 0;

        for (let y = 0; y < this.cells.length; y++) {
            if (!this.cells[y]) continue;
            for (let x = 0; x < this.cells[y].length; x++) {
                const cell = this.cells[y][x];
                if (!cell) continue;

                // Remove all fog visibility classes
                cell.classList.remove('fog-visible', 'fog-remembered', 'fog-hidden');

                // Calculate distance from center for stagger effect
                const distance = Math.abs(x - centerX) + Math.abs(y - centerY);
                cell.style.setProperty('--cell-index', distance);

                // Add reveal animation class
                cell.classList.add('fog-revealed');
            }
        }
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

        // Rounds input
        const roundsInput = document.getElementById('roundsInput');
        if (roundsInput) {
            roundsInput.addEventListener('input', () => {
                let value = parseInt(roundsInput.value) || 1;
                value = Math.max(1, Math.min(20, value));
                this.config.totalRounds = value;
            });

            roundsInput.addEventListener('blur', () => {
                let value = parseInt(roundsInput.value) || 1;
                value = Math.max(1, Math.min(20, value));
                roundsInput.value = value;
                this.config.totalRounds = value;
            });

            // Initialize with default value
            this.config.totalRounds = parseInt(roundsInput.value) || 5;
        }

        // Maze size input
        const mazeSizeInput = document.getElementById('mazeSizeInput');
        const mazeSizeDisplay = document.getElementById('mazeSizeDisplay');

        if (mazeSizeInput && mazeSizeDisplay) {
            // Sync display with input value
            mazeSizeInput.addEventListener('input', () => {
                let value = parseInt(mazeSizeInput.value) || 10;
                // Clamp value between 10 and 35
                value = Math.max(10, Math.min(35, value));
                mazeSizeDisplay.textContent = value;
                this.config.customMazeSize = value;
            });

            // Validate on blur
            mazeSizeInput.addEventListener('blur', () => {
                let value = parseInt(mazeSizeInput.value) || 10;
                value = Math.max(10, Math.min(35, value));
                mazeSizeInput.value = value;
                mazeSizeDisplay.textContent = value;
                this.config.customMazeSize = value;
            });

            // Initialize with default value
            this.config.customMazeSize = parseInt(mazeSizeInput.value) || 15;
        }

        // Start button
        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.startGame();
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

        // Set fog mode for renderer
        this.renderer.setFogMode(this.config.mode);

        this.startRound();
    }

    startRound() {
        // Reset fog state for new round
        this.renderer.resetFogState();

        // Generate maze for current round with advanced options
        const mazeSize = this.config.getMazeSize(this.state.currentRound);

        // Get maze generation options based on difficulty and round
        // Higher difficulty = more noise, more loops, more challenging algorithms
        const mazeOptions = this.config.getMazeOptions(this.state.currentRound);

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

        // Reveal all cells if in fog mode (so player can see the full maze)
        if (this.config.mode !== 'classic') {
            this.renderer.revealAllCells();
        }

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

        // Get total time for this round
        const totalTime = this.timer.totalTime;

        // Calculate score with new formula (optimal path, errors, time)
        const scoreDetails = this.state.calculateRoundScore(this.config, optimalPathLength, totalTime);

        // Show optimal path if round was successful
        if (success && this.currentMaze.shortestPath) {
            // Show path with animation, then wait for user to click continue
            this.showOptimalPathOverlay(scoreDetails, () => {
                this.hideOptimalPathOverlay();
                this.renderer.clearOptimalPath();
                // Go directly to next round or results
                this.proceedToNextRoundOrResults();
            });
            this.renderer.showOptimalPath(this.currentMaze.shortestPath, 50);
        } else {
            // Time's up - show time up overlay then proceed
            this.showTimeUpOverlay(scoreDetails, () => {
                this.hideTimeUpOverlay();
                this.proceedToNextRoundOrResults();
            });
        }
    }

    /**
     * Show time up overlay when player fails to complete in time
     * @param {Object} scoreDetails - Detailed scoring breakdown
     * @param {Function} onContinue - Callback when continue button is clicked
     */
    showTimeUpOverlay(scoreDetails, onContinue) {
        const currentRound = this.state.currentRound;
        const totalRounds = this.config.totalRounds;
        const isLastRound = currentRound >= totalRounds;
        const buttonText = isLastRound ? 'View Results' : 'Next Round';

        const overlay = document.createElement('div');
        overlay.id = 'timeUpOverlay';
        overlay.className = 'optimal-path-overlay';
        overlay.innerHTML = `
            <div class="optimal-path-message timeout-message-text">Time's Up!</div>
            <div class="round-summary">
                <div class="round-summary-row">
                    <span class="summary-item"><strong>Steps:</strong> ${scoreDetails.actualSteps}</span>
                    <span class="summary-item"><strong>Errors:</strong> ${scoreDetails.errorCount}</span>
                </div>
                <div class="score-breakdown">
                    <div class="score-breakdown-title">Score Breakdown</div>
                    <div class="score-breakdown-item">
                        <span>Base Score:</span>
                        <span class="score-value positive">+${scoreDetails.baseScore}</span>
                    </div>
                    <div class="score-breakdown-item">
                        <span>Error Penalty (${scoreDetails.errorCount} hits):</span>
                        <span class="score-value negative">-${scoreDetails.errorPenalty}</span>
                    </div>
                    <div class="score-breakdown-divider"></div>
                    <div class="score-breakdown-item total">
                        <span>Round Score:</span>
                        <span class="score-value">${scoreDetails.roundScore}</span>
                    </div>
                </div>
            </div>
            <button class="optimal-path-continue-btn">${buttonText}</button>
        `;
        document.body.appendChild(overlay);

        const continueBtn = overlay.querySelector('.optimal-path-continue-btn');
        continueBtn.addEventListener('click', onContinue);
    }

    hideTimeUpOverlay() {
        const overlay = document.getElementById('timeUpOverlay');
        if (overlay) {
            overlay.remove();
        }
    }

    /**
     * Proceed to next round or show final results
     */
    proceedToNextRoundOrResults() {
        this.state.nextRound();

        if (this.state.isGameOver(this.config.totalRounds)) {
            this.showResults();
        } else {
            this.startRound();
        }
    }

    /**
     * Show round complete overlay with detailed scoring breakdown
     * @param {Object} scoreDetails - Detailed scoring breakdown from calculateRoundScore
     * @param {Function} onContinue - Callback when continue button is clicked
     */
    showOptimalPathOverlay(scoreDetails, onContinue) {
        const currentRound = this.state.currentRound;
        const totalRounds = this.config.totalRounds;

        // Determine if this is the last round
        const isLastRound = currentRound >= totalRounds;
        const buttonText = isLastRound ? 'View Results' : 'Next Round';

        // Calculate total time bonus (time bonus + time efficiency bonus)
        const totalTimeBonus = scoreDetails.timeBonus + scoreDetails.timeEfficiencyBonus;

        // Create overlay message with detailed scoring breakdown
        const overlay = document.createElement('div');
        overlay.id = 'optimalPathOverlay';
        overlay.className = 'optimal-path-overlay';
        overlay.innerHTML = `
            <div class="optimal-path-message">Round ${currentRound} Complete!</div>
            <div class="round-summary">
                <div class="round-summary-row path-comparison">
                    <span class="summary-item"><strong>Your Steps:</strong> ${scoreDetails.actualSteps}</span>
                    <span class="summary-item"><strong>Optimal:</strong> ${scoreDetails.optimalSteps}</span>
                    <span class="summary-item efficiency-badge ${scoreDetails.pathEfficiency >= 90 ? 'excellent' : scoreDetails.pathEfficiency >= 70 ? 'good' : 'average'}">
                        <strong>Efficiency:</strong> ${scoreDetails.pathEfficiency}%
                    </span>
                </div>
                <div class="round-summary-row stats-row">
                    <span class="summary-item"><strong>Time Left:</strong> ${scoreDetails.timeRemaining}s / ${scoreDetails.totalTime}s</span>
                    <span class="summary-item"><strong>Errors:</strong> ${scoreDetails.errorCount}</span>
                </div>
                <div class="score-breakdown">
                    <div class="score-breakdown-title">Score Breakdown</div>
                    <div class="score-breakdown-item">
                        <span>Base Score:</span>
                        <span class="score-value positive">+${scoreDetails.baseScore}</span>
                    </div>
                    <div class="score-breakdown-item">
                        <span>Path Efficiency (${scoreDetails.pathEfficiency}%):</span>
                        <span class="score-value positive">+${scoreDetails.pathEfficiencyBonus}</span>
                    </div>
                    <div class="score-breakdown-item">
                        <span>Time Bonus (${scoreDetails.timeRemaining}s left):</span>
                        <span class="score-value positive">+${totalTimeBonus}</span>
                    </div>
                    <div class="score-breakdown-item">
                        <span>Error Penalty (${scoreDetails.errorCount} hits):</span>
                        <span class="score-value negative">-${scoreDetails.errorPenalty}</span>
                    </div>
                    <div class="score-breakdown-divider"></div>
                    <div class="score-breakdown-item total">
                        <span>Round Score:</span>
                        <span class="score-value">${scoreDetails.roundScore}</span>
                    </div>
                </div>
            </div>
            <button class="optimal-path-continue-btn">${buttonText}</button>
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
        this.renderer.resetFogState();
        this.renderer.setFogMode('classic'); // Reset to default
        this.showScreen('config');
    }
}

// ============================================================================
// INITIALIZE GAME
// ============================================================================
let gameInstance = null; // Global reference for multiplayer adapter

document.addEventListener('DOMContentLoaded', async () => {
    gameInstance = new MazeGame();
    window.mazeGame = gameInstance; // Expose globally for debugging and multiplayer

    // Check if this is multiplayer mode
    const roomId = sessionStorage.getItem('multiplayerRoomId');
    const role = sessionStorage.getItem('multiplayerRole');

    if (roomId && typeof MazeGameMultiplayerAdapter !== 'undefined') {
        console.log('[MazeGame] Checking multiplayer room validity:', { roomId, role });

        // Validate room exists and is still active
        try {
            const roomRef = database.ref(`rooms/${roomId}`);
            const snapshot = await roomRef.once('value');
            const roomData = snapshot.val();

            // Check if room exists and is in valid state
            if (!roomData || roomData.meta.status === 'closed' || roomData.meta.status === 'finished') {
                console.log('[MazeGame] Room no longer valid, clearing multiplayer state');
                sessionStorage.removeItem('multiplayerRoomId');
                sessionStorage.removeItem('multiplayerRole');
                console.log('[MazeGame] Single player mode');
                return; // Exit and let game run in single player mode
            }

            console.log('[MazeGame] Room valid, initializing multiplayer mode');
            const adapter = new MazeGameMultiplayerAdapter(gameInstance);

            if (role === 'host') {
                // Initialize as host (will intercept game start)
                adapter.initAsHost(roomId).catch(err => {
                    console.error('[MazeGame] Failed to initialize multiplayer as host:', err);
                    alert('Failed to initialize multiplayer: ' + err.message);
                });
            } else if (role === 'player') {
                // Initialize as player (will wait for maze data and auto-start)
                adapter.initAsPlayer(roomId).catch(err => {
                    console.error('[MazeGame] Failed to initialize multiplayer as player:', err);
                    alert('Failed to initialize multiplayer: ' + err.message);
                });
            }

            // Expose adapter globally
            window.mazeGameAdapter = adapter;
        } catch (error) {
            console.error('[MazeGame] Error checking room validity:', error);
            sessionStorage.removeItem('multiplayerRoomId');
            sessionStorage.removeItem('multiplayerRole');
            console.log('[MazeGame] Single player mode');
        }
    } else {
        console.log('[MazeGame] Single player mode');
    }
});
