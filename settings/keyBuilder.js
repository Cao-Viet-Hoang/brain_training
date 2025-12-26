/**
 * Key Builder
 * Centralized key generation for storage
 * Prevents key conflicts and provides consistent naming
 */

const APP_PREFIX = 'brain-games';
const SETTINGS_SUFFIX = 'settings';

/**
 * Build a storage key for game settings
 * @param {string} gameId - Unique game identifier
 * @returns {string} Formatted storage key
 */
export function buildSettingsKey(gameId) {
  if (!gameId || typeof gameId !== 'string') {
    throw new Error('[KeyBuilder] Invalid gameId: must be a non-empty string');
  }

  return `${APP_PREFIX}:${gameId}:${SETTINGS_SUFFIX}`;
}

/**
 * Parse a settings key back to gameId
 * @param {string} key - Storage key
 * @returns {string|null} Game ID or null if invalid format
 */
export function parseSettingsKey(key) {
  if (!key || typeof key !== 'string') {
    return null;
  }

  const pattern = new RegExp(`^${APP_PREFIX}:(.+):${SETTINGS_SUFFIX}$`);
  const match = key.match(pattern);

  return match ? match[1] : null;
}

/**
 * Get all settings keys for the application
 * Useful for bulk operations like clearing all settings
 * @returns {string[]} Array of all settings keys
 */
export function getAllSettingsKeys() {
  const keys = [];
  const prefix = `${APP_PREFIX}:`;
  const suffix = `:${SETTINGS_SUFFIX}`;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix) && key.endsWith(suffix)) {
        keys.push(key);
      }
    }
  } catch (error) {
    console.error('[KeyBuilder] Error reading localStorage keys:', error);
  }

  return keys;
}
