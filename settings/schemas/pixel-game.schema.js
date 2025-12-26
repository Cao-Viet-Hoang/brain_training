/**
 * Brain Training Games
 * Author: Cao Viet Hoang
 * Created: 2025
 */

/**
 * Pixel Game Settings Schema
 * Version 1
 */

import {
  createTypeValidator,
  createEnumValidator,
  createRangeValidator,
  createCombinedValidator
} from './base.schema.js';

export const pixelGameSchema = {
  version: 1,

  defaults: {
    // Game settings
    cardCount: 15, // Number of cards (10-20)
    targetCount: 3, // Number of targets to reconstruct (1-5)
    roundTimeLimit: 300, // Total time to complete all targets (60-600 seconds)
    penaltyMode: 'score' // 'score' (-1 point) or 'turn' (lose turn)
  },

  validators: {
    cardCount: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(10, 20)
    ),
    targetCount: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(1, 5)
    ),
    roundTimeLimit: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(60, 600)
    ),
    penaltyMode: createEnumValidator(['score', 'turn'])
  },

  migrations: {
    // Future migrations can be added here
  }
};
