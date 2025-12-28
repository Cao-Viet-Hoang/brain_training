/**
 * Brain Training Games
 * Author: Cao Viet Hoang
 * Created: 2025
 */

/**
 * Number Hunt Game Settings Schema
 * Version 1
 */

import {
  createTypeValidator,
  createEnumValidator,
  createRangeValidator,
  createCombinedValidator
} from './base.schema.js';

export const numberHuntSchema = {
  version: 1,

  defaults: {
    // Game mode
    mode: 'missing', // 'missing' or 'extra'

    // Number ranges (array of {min, max} objects)
    ranges: [{min: 1, max: 100}], // Default to one range

    // Round settings
    roundSize: 20, // Total numbers displayed per round
    missingCount: 3, // How many missing numbers to find
    extraCount: 3, // How many extra/duplicate numbers to find
    totalRounds: 5,

    // Wrong attempts
    maxWrongAttempts: 3,

    // Scoring system
    baseScore: 100,
    timeBonusMax: 50,
    wrongPenalty: 10,
    timeTarget: 20, // seconds
    minRoundScore: 0
  },

  validators: {
    mode: createEnumValidator(['missing', 'extra']),
    
    ranges: (value) => {
      if (!Array.isArray(value)) return false;
      if (value.length === 0) return false;
      return value.every(range => 
        typeof range === 'object' &&
        typeof range.min === 'number' &&
        typeof range.max === 'number' &&
        range.min >= 0 &&
        range.max <= 1000 &&
        range.min < range.max
      );
    },
    
    roundSize: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(10, 100)
    ),
    
    missingCount: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(1, 10)
    ),
    
    extraCount: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(1, 10)
    ),
    
    totalRounds: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(1, 20)
    ),
    
    maxWrongAttempts: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(1, 10)
    ),
    
    baseScore: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(0, 1000)
    ),
    
    timeBonusMax: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(0, 500)
    ),
    
    wrongPenalty: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(0, 100)
    ),
    
    timeTarget: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(5, 120)
    ),
    
    minRoundScore: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(0, 100)
    )
  },

  migrations: {
    // Future migrations can be added here
  }
};
