/**
 * Brain Training Games
 * Author: Cao Viet Hoang
 * Created: 2025
 */

/**
 * Memory Matrix Game Settings Schema
 * Version 1
 */

import {
  createTypeValidator,
  createEnumValidator,
  createRangeValidator,
  createCombinedValidator
} from './base.schema.js';

export const memoryMatrixSchema = {
  version: 1,

  defaults: {
    // Grid settings
    startGridSize: 3,
    maxGridSize: 7,

    // Timing settings
    showDurationMsBase: 1200,
    betweenFlashMs: 350,

    // Game mode
    mode: 'classic', // 'classic', 'sequence', 'timed'
    mistakePolicy: 'fail_level', // 'fail_level', 'lose_life'
    lives: 3,

    // UI preferences
    sound: true,
    animations: true,
    colorScheme: 'default' // 'default', 'dark', 'colorblind'
  },

  validators: {
    startGridSize: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(3, 7)
    ),
    maxGridSize: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(3, 10)
    ),
    showDurationMsBase: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(300, 5000)
    ),
    betweenFlashMs: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(100, 1000)
    ),
    mode: createEnumValidator(['classic', 'sequence', 'timed']),
    mistakePolicy: createEnumValidator(['fail_level', 'lose_life']),
    lives: createCombinedValidator(
      createTypeValidator('number'),
      createRangeValidator(1, 10)
    ),
    sound: createTypeValidator('boolean'),
    animations: createTypeValidator('boolean'),
    colorScheme: createEnumValidator(['default', 'dark', 'colorblind'])
  },

  migrations: {
    // Example: Migration from version 1 to version 2
    // 2: (settings) => {
    //   // Add new setting with default value
    //   if (!('newSetting' in settings)) {
    //     settings.newSetting = 'defaultValue';
    //   }
    //   // Rename old setting
    //   if ('oldSetting' in settings) {
    //     settings.newSettingName = settings.oldSetting;
    //     delete settings.oldSetting;
    //   }
    //   return settings;
    // }
  }
};
