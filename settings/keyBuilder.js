/**
 * Brain Training Games
 * Author: Cao Viet Hoang
 * Created: 2025
 */

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
