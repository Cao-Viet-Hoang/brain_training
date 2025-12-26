/**
 * Brain Training Games
 * Author: Cao Viet Hoang
 * Created: 2025
 */

/**
 * Word Recall Game Settings Schema
 * Version 1
 */

import {
  createTypeValidator,
  createEnumValidator,
  createRangeValidator,
  createCombinedValidator
} from './base.schema.js';

export const wordRecallSchema = {
  version: 1,

  defaults: {
    // Game parameters
    sessionRounds: 10, // Number of rounds to play (5-20)
    startK: 5, // Starting number of words (3-8)
    maxK: 12, // Maximum words per round (8-15)
    
    // Timing
    memorizeMsBase: 3500, // Base time to study words (2000-5000ms)
    testTimeLimitMs: 9000, // Maximum time to select words (5000-15000ms)
    
    // Options
    distractorEnabled: true // Enable distractor task between memorize and test
  },

  validators: {
    sessionRounds: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(5, 20)
    ),
    startK: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(3, 8)
    ),
    maxK: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(8, 15)
    ),
    memorizeMsBase: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(2000, 5000)
    ),
    testTimeLimitMs: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(5000, 15000)
    ),
    distractorEnabled: createTypeValidator('boolean')
  },

  migrations: {
    // Future migrations can be added here
  }
};
