/**
 * Brain Training Games
 * Author: Cao Viet Hoang
 * Created: 2025
 */

/**
 * LocalStorage Adapter
 * Provides a standardized interface for localStorage operations
 * Can be replaced with other storage backends (IndexedDB, Database) without changing consumer code
 */

/**
 * Creates a localStorage adapter implementing the storage interface
 * @returns {Object} Storage adapter with read, write, remove methods
 */
export function createLocalStorageAdapter() {
  // Check if localStorage is available
  const isAvailable = checkLocalStorageAvailability();

  return {
    /**
     * Read a value from localStorage
     * @param {string} key - Storage key
     * @returns {string|null} Stored value or null if not found/error
     */
    read(key) {
      if (!isAvailable) {
        console.warn('[LocalStorageAdapter] localStorage is not available');
        return null;
      }

      try {
        const value = localStorage.getItem(key);
        return value;
      } catch (error) {
        console.error('[LocalStorageAdapter] Error reading from localStorage:', error);
        return null;
      }
    },

    /**
     * Write a value to localStorage
     * @param {string} key - Storage key
     * @param {string} value - Value to store (must be string)
     * @returns {boolean} True if successful, false otherwise
     */
    write(key, value) {
      if (!isAvailable) {
        console.warn('[LocalStorageAdapter] localStorage is not available');
        return false;
      }

      try {
        localStorage.setItem(key, value);
        return true;
      } catch (error) {
        // Handle quota exceeded or other errors
        if (error.name === 'QuotaExceededError') {
          console.error('[LocalStorageAdapter] Storage quota exceeded');
        } else {
          console.error('[LocalStorageAdapter] Error writing to localStorage:', error);
        }
        return false;
      }
    },

    /**
     * Remove a value from localStorage
     * @param {string} key - Storage key
     * @returns {boolean} True if successful, false otherwise
     */
    remove(key) {
      if (!isAvailable) {
        console.warn('[LocalStorageAdapter] localStorage is not available');
        return false;
      }

      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error('[LocalStorageAdapter] Error removing from localStorage:', error);
        return false;
      }
    },

    /**
     * Check if storage is available
     * @returns {boolean}
     */
    isAvailable() {
      return isAvailable;
    }
  };
}

/**
 * Check if localStorage is available and working
 * @returns {boolean}
 */
function checkLocalStorageAvailability() {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}
