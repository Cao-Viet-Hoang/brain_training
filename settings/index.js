/**
 * Brain Training Games
 * Author: Cao Viet Hoang
 * Created: 2025
 */

/**
 * Settings System - Main Export
 * Provides a unified interface for game settings persistence
 */

// Core modules
import { createLocalStorageAdapter } from '../storage/localStorageAdapter.js';
import { buildSettingsKey } from './keyBuilder.js';
import { createSettingsManager } from './settingsManager.js';

// Game schemas
import { memoryMatrixSchema } from './schemas/memory-matrix.schema.js';
import { dualNBackSchema } from './schemas/dual-n-back.schema.js';
import { mathGameSchema } from './schemas/math-game.schema.js';
import { wordRecallSchema } from './schemas/word-recall.schema.js';
import { mazeGameSchema } from './schemas/maze-game.schema.js';
import { expressionPuzzleSchema } from './schemas/expression-puzzle.schema.js';
import { pixelGameSchema } from './schemas/pixel-game.schema.js';
import { numberHuntSchema } from './schemas/number-hunt.schema.js';

/**
 * Game ID to Schema mapping
 */
const GAME_SCHEMAS = {
  'memory-matrix': memoryMatrixSchema,
  'dual-n-back': dualNBackSchema,
  'math-game': mathGameSchema,
  'word-recall': wordRecallSchema,
  'maze-game': mazeGameSchema,
  'expression-puzzle': expressionPuzzleSchema,
  'pixel-game': pixelGameSchema,
  'number-hunt': numberHuntSchema
};

/**
 * Create a settings manager for a specific game
 * @param {string} gameId - Game identifier
 * @returns {Object} Settings manager instance
 */
export function createGameSettingsManager(gameId) {
  const schema = GAME_SCHEMAS[gameId];
  
  if (!schema) {
    throw new Error(`[Settings] Unknown game ID: ${gameId}. Available games: ${Object.keys(GAME_SCHEMAS).join(', ')}`);
  }

  const storage = createLocalStorageAdapter();
  
  return createSettingsManager({
    schema,
    storage,
    keyBuilder: buildSettingsKey
  });
}

/**
 * Global settings managers cache (singleton pattern)
 * Prevents creating multiple managers for the same game
 */
const managersCache = {};

/**
 * Get or create a settings manager for a game
 * @param {string} gameId - Game identifier
 * @returns {Object} Settings manager instance
 */
export function getGameSettingsManager(gameId) {
  if (!managersCache[gameId]) {
    managersCache[gameId] = createGameSettingsManager(gameId);
  }
  return managersCache[gameId];
}

/**
 * Quick access functions for common operations
 */

/**
 * Load settings for a game
 * @param {string} gameId - Game identifier
 * @returns {Object} Settings object
 */
export function loadGameSettings(gameId) {
  const manager = getGameSettingsManager(gameId);
  return manager.load(gameId);
}

/**
 * Save settings for a game
 * @param {string} gameId - Game identifier
 * @param {Object} settings - Complete settings object
 * @returns {boolean} Success status
 */
export function saveGameSettings(gameId, settings) {
  const manager = getGameSettingsManager(gameId);
  return manager.save(gameId, settings);
}

/**
 * Update partial settings for a game
 * @param {string} gameId - Game identifier
 * @param {Object} patch - Partial settings to update
 * @returns {Object} Updated complete settings
 */
export function updateGameSettings(gameId, patch) {
  const manager = getGameSettingsManager(gameId);
  return manager.update(gameId, patch);
}

/**
 * Reset settings to defaults for a game
 * @param {string} gameId - Game identifier
 * @returns {Object} Default settings
 */
export function resetGameSettings(gameId) {
  const manager = getGameSettingsManager(gameId);
  return manager.reset(gameId);
}

/**
 * Get default settings for a game
 * @param {string} gameId - Game identifier
 * @returns {Object} Default settings
 */
export function getDefaultGameSettings(gameId) {
  const manager = getGameSettingsManager(gameId);
  return manager.getDefaults();
}

/**
 * Clear all settings for all games (use with caution)
 */
export function clearAllGameSettings() {
  const storage = createLocalStorageAdapter();
  
  for (const gameId of Object.keys(GAME_SCHEMAS)) {
    const key = buildSettingsKey(gameId);
    storage.remove(key);
  }
  
  console.log('[Settings] All game settings cleared');
}

// Export everything for advanced usage
export {
  createLocalStorageAdapter,
  buildSettingsKey,
  createSettingsManager,
  GAME_SCHEMAS
};
