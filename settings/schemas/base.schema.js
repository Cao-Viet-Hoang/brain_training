/**
 * Brain Training Games
 * Author: Cao Viet Hoang
 * Created: 2025
 */

/**
 * Base Schema Template
 * Provides common structure and utilities for all game schemas
 */

/**
 * Create a validator for type checking
 * @param {string} type - Expected type ('boolean', 'number', 'string')
 * @returns {Function} Validator function
 */
export function createTypeValidator(type) {
  return (value) => typeof value === type;
}

/**
 * Create a validator for enum values
 * @param {Array} allowedValues - Array of allowed values
 * @returns {Function} Validator function
 */
export function createEnumValidator(allowedValues) {
  return (value) => allowedValues.includes(value);
}

/**
 * Create a validator for number range
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {Function} Validator function
 */
export function createRangeValidator(min, max) {
  return (value) => {
    return typeof value === 'number' && value >= min && value <= max;
  };
}

/**
 * Create a validator combining multiple validators
 * @param {Array<Function>} validators - Array of validator functions
 * @returns {Function} Combined validator function
 */
export function createCombinedValidator(...validators) {
  return (value) => {
    return validators.every(validator => validator(value));
  };
}
