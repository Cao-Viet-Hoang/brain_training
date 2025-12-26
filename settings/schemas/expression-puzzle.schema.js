/**
 * Brain Training Games
 * Author: Cao Viet Hoang
 * Created: 2025
 */

/**
 * Expression Puzzle Game Settings Schema
 * Version 1
 */

import {
  createTypeValidator,
  createEnumValidator,
  createRangeValidator,
  createCombinedValidator
} from './base.schema.js';

export const expressionPuzzleSchema = {
  version: 1,

  defaults: {
    // Game settings
    difficulty: 'medium', // 'easy', 'medium', 'hard'
    puzzleCount: 10, // Number of puzzles (1-50)
    timePerPuzzle: 60, // Time per puzzle in seconds (10-300)
    minTarget: 10, // Min target number
    maxTarget: 200, // Max target number
    requireUnique: false // Require unique solution
  },

  validators: {
    difficulty: createEnumValidator(['easy', 'medium', 'hard']),
    puzzleCount: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(1, 50)
    ),
    timePerPuzzle: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(10, 300)
    ),
    minTarget: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(1, 1000)
    ),
    maxTarget: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(1, 10000)
    ),
    requireUnique: createTypeValidator('boolean')
  },

  migrations: {
    // Future migrations can be added here
  }
};
