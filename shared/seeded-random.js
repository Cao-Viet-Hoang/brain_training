/**
 * Brain Training Games
 * Author: Cao Viet Hoang
 * Created: 2025
 * 
 * Seeded Random Number Generator
 * Sử dụng để tạo ra cùng một chuỗi số ngẫu nhiên từ cùng một seed
 * Đảm bảo tất cả players trong multiplayer mode có cùng sequence
 */

class SeededRandom {
    /**
     * Initialize seeded random number generator
     * @param {number} seed - Seed value (bất kỳ số nguyên nào)
     */
    constructor(seed) {
        this.seed = seed;
        this.state = seed;
    }

    /**
     * Generate next random number between 0 and 1 (exclusive)
     * Uses Mulberry32 algorithm - fast and high quality
     * @returns {number} Random number between 0 and 1
     */
    next() {
        // Mulberry32 algorithm
        let t = this.state += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    /**
     * Generate random integer between min and max (inclusive)
     * @param {number} min - Minimum value (inclusive)
     * @param {number} max - Maximum value (inclusive)
     * @returns {number} Random integer
     */
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /**
     * Generate random number between min and max (exclusive of max)
     * @param {number} min - Minimum value (inclusive)
     * @param {number} max - Maximum value (exclusive)
     * @returns {number} Random number
     */
    nextRange(min, max) {
        return this.next() * (max - min) + min;
    }

    /**
     * Shuffle array using Fisher-Yates algorithm with seeded random
     * @param {Array} array - Array to shuffle (modified in place)
     * @returns {Array} Shuffled array
     */
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.next() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Pick random element from array
     * @param {Array} array - Array to pick from
     * @returns {*} Random element
     */
    choice(array) {
        return array[Math.floor(this.next() * array.length)];
    }

    /**
     * Pick n random elements from array (without replacement)
     * @param {Array} array - Array to pick from
     * @param {number} n - Number of elements to pick
     * @returns {Array} Array of picked elements
     */
    sample(array, n) {
        const result = [];
        const copy = [...array];
        const count = Math.min(n, copy.length);
        
        for (let i = 0; i < count; i++) {
            const index = Math.floor(this.next() * copy.length);
            result.push(copy[index]);
            copy.splice(index, 1);
        }
        
        return result;
    }

    /**
     * Reset generator to initial seed
     */
    reset() {
        this.state = this.seed;
    }

    /**
     * Set new seed
     * @param {number} seed - New seed value
     */
    setSeed(seed) {
        this.seed = seed;
        this.state = seed;
    }
}

/**
 * Generate a random seed from timestamp and random value
 * Useful for creating unique game seeds
 * @returns {number} Random seed
 */
function generateRandomSeed() {
    return Math.floor(Date.now() * Math.random());
}

/**
 * Create seed from string (useful for testing)
 * @param {string} str - String to convert to seed
 * @returns {number} Seed value
 */
function seedFromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}
