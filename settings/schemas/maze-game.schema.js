/**
 * Brain Training Games
 * Author: Cao Viet Hoang
 * Created: 2025
 */

/**
 * Maze Game Settings Schema
 * Version 1
 */

import {
  createTypeValidator,
  createEnumValidator,
  createRangeValidator,
  createCombinedValidator
} from './base.schema.js';

export const mazeGameSchema = {
  version: 1,

  defaults: {
    // Game settings
    totalRounds: 5, // Number of rounds (1-20)
    customMazeSize: 15, // Maze size (10-35)
    mode: 'classic', // 'classic', 'fog_light', 'fog_heavy'
    difficulty: 'medium' // 'easy', 'medium', 'hard'
  },

  validators: {
    totalRounds: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(1, 20)
    ),
    customMazeSize: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(10, 35)
    ),
    mode: createEnumValidator(['classic', 'fog_light', 'fog_heavy']),
    difficulty: createEnumValidator(['easy', 'medium', 'hard'])
  },

  migrations: {
    // Future migrations can be added here
  }
};
