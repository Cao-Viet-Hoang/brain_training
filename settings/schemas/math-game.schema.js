/**
 * Math Game Settings Schema
 * Version 1
 */

import {
  createTypeValidator,
  createEnumValidator,
  createRangeValidator,
  createCombinedValidator
} from './base.schema.js';

export const mathGameSchema = {
  version: 1,

  defaults: {
    // Number range
    minNumber: 1,
    maxNumber: 100,

    // Operations
    operations: ['+'], // Can use '+', '-', '*', '/', 'mixed'
    operandCount: 2, // Number of operands per question

    // Game settings
    questionCount: 10,
    timePerQuestion: 10, // seconds

    // Difficulty
    difficulty: 'medium', // 'easy', 'medium', 'hard'

    // UI preferences
    sound: true,
    showTimer: true,
    showStreak: true
  },

  validators: {
    minNumber: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(1, 1000)
    ),
    maxNumber: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(1, 1000)
    ),
    operations: (value) => {
      if (!Array.isArray(value)) return false;
      if (value.length === 0) return false;
      const validOps = ['+', '-', '*', '/', 'mixed', 'addition', 'subtraction', 'multiplication', 'division'];
      return value.every(op => validOps.includes(op));
    },
    operandCount: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(2, 4)
    ),
    questionCount: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(5, 50)
    ),
    timePerQuestion: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(5, 60)
    ),
    difficulty: createEnumValidator(['easy', 'medium', 'hard']),
    sound: createTypeValidator('boolean'),
    showTimer: createTypeValidator('boolean'),
    showStreak: createTypeValidator('boolean')
  },

  migrations: {
    // Future migrations can be added here
  }
};
