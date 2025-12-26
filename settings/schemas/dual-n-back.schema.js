/**
 * Dual N-Back Game Settings Schema
 * Version 1
 */

import {
  createTypeValidator,
  createEnumValidator,
  createRangeValidator,
  createCombinedValidator
} from './base.schema.js';

export const dualNBackSchema = {
  version: 1,

  defaults: {
    // Game parameters
    N: 2, // N-back level (1-5)
    gridSize: 3, // Grid size (3x3 or 4x4)
    totalTrials: 40, // Number of trials per session (20-60)
    
    // Timing settings
    stimulusDurationMs: 900, // How long each stimulus shows (500-1500ms)
    intervalBetweenMs: 600, // Time between stimuli (300-1000ms)
    
    // Match rate settings
    targetMatchRatePosition: 0.25, // ~25% position matches
    targetMatchRateLetter: 0.25 // ~25% letter matches
  },

  validators: {
    N: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(1, 5)
    ),
    gridSize: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(2, 4)
    ),
    totalTrials: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(20, 60)
    ),
    stimulusDurationMs: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(500, 1500)
    ),
    intervalBetweenMs: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(300, 1000)
    ),
    targetMatchRatePosition: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(0.1, 0.5)
    ),
    targetMatchRateLetter: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(0.1, 0.5)
    )
  },

  migrations: {
    // Future migrations can be added here
  }
};
