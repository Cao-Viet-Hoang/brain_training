/**
 * Brain Training Games
 * Author: Cao Viet Hoang
 * Created: 2025
 */

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
  version: 2,

  defaults: {
    // Number range
    minNumber: 1,
    maxNumber: 100,

    // Game mode
    gameMode: 'classic', // 'classic' or 'memory'

    // Operations
    operations: ['+'], // Can use '+', '-', '*', '/', 'mixed'
    operandCount: 2, // Number of operands per question

    // Game settings
    questionCount: 10,
    timePerQuestion: 10, // seconds

    // Memory mode settings
    displayTimePerOperand: 2, // seconds - how long each number/operator is shown

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
    gameMode: createEnumValidator(['classic', 'memory']),
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
    displayTimePerOperand: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(0, 10)
    ),
    difficulty: createEnumValidator(['easy', 'medium', 'hard']),
    sound: createTypeValidator('boolean'),
    showTimer: createTypeValidator('boolean'),
    showStreak: createTypeValidator('boolean')
  },

  migrations: {
    // Migration from version 1 to version 2: add gameMode and displayTimePerOperand
    1: (settings) => {
      return {
        ...settings,
        gameMode: 'classic',
        displayTimePerOperand: 2
      };
    }
  }
};
