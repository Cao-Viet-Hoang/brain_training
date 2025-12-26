/**
 * Settings Manager
 * Core logic for managing game settings with validation, migration, and persistence
 * Decoupled from specific storage implementation and game logic
 */

/**
 * Create a settings manager instance
 * @param {Object} config - Configuration object
 * @param {Object} config.schema - Settings schema with version, defaults, validators, migrations
 * @param {Object} config.storage - Storage adapter implementing read/write/remove interface
 * @param {Function} config.keyBuilder - Function to build storage keys from gameId
 * @returns {Object} Settings manager instance
 */
export function createSettingsManager({ schema, storage, keyBuilder }) {
  if (!schema || !storage || !keyBuilder) {
    throw new Error('[SettingsManager] Missing required dependencies: schema, storage, or keyBuilder');
  }

  validateSchema(schema);

  return {
    /**
     * Load settings for a game
     * @param {string} gameId - Game identifier
     * @returns {Object} Settings object (either loaded or defaults)
     */
    load(gameId) {
      const key = keyBuilder(gameId);
      const rawData = storage.read(key);

      // No stored data, return defaults
      if (!rawData) {
        return getDefaults(schema);
      }

      // Parse stored data
      let storedPayload;
      try {
        storedPayload = JSON.parse(rawData);
      } catch (error) {
        console.error('[SettingsManager] Failed to parse stored settings, using defaults:', error);
        // Remove corrupted data
        storage.remove(key);
        return getDefaults(schema);
      }

      // Validate payload structure
      if (!isValidPayload(storedPayload)) {
        console.warn('[SettingsManager] Invalid payload structure, using defaults');
        storage.remove(key);
        return getDefaults(schema);
      }

      let settings = storedPayload.settings;

      // Handle version mismatch
      const storedVersion = storedPayload.version;
      const currentVersion = schema.version;

      if (storedVersion > currentVersion) {
        console.warn('[SettingsManager] Stored version is newer than schema version, using defaults');
        return getDefaults(schema);
      }

      // Migrate if needed
      if (storedVersion < currentVersion) {
        settings = migrateSettings(settings, storedVersion, currentVersion, schema.migrations);
      }

      // Validate and sanitize
      settings = validateSettings(settings, schema);
      settings = sanitizeSettings(settings, schema);
      settings = mergeWithDefaults(settings, schema);

      return settings;
    },

    /**
     * Save complete settings for a game
     * @param {string} gameId - Game identifier
     * @param {Object} settings - Complete settings object
     * @returns {boolean} True if successful
     */
    save(gameId, settings) {
      // Validate and sanitize
      const validatedSettings = validateSettings(settings, schema);
      const sanitizedSettings = sanitizeSettings(validatedSettings, schema);

      // Create payload
      const payload = {
        version: schema.version,
        updatedAt: Date.now(),
        settings: sanitizedSettings
      };

      const key = keyBuilder(gameId);
      const success = storage.write(key, JSON.stringify(payload));

      if (!success) {
        console.error('[SettingsManager] Failed to save settings');
      }

      return success;
    },

    /**
     * Update partial settings for a game
     * @param {string} gameId - Game identifier
     * @param {Object} patch - Partial settings to update
     * @returns {Object} Updated complete settings object
     */
    update(gameId, patch) {
      // Load current settings
      const currentSettings = this.load(gameId);

      // Merge patch
      const updatedSettings = { ...currentSettings, ...patch };

      // Save
      this.save(gameId, updatedSettings);

      return updatedSettings;
    },

    /**
     * Reset settings to defaults
     * @param {string} gameId - Game identifier
     * @returns {Object} Default settings
     */
    reset(gameId) {
      const key = keyBuilder(gameId);
      storage.remove(key);
      return getDefaults(schema);
    },

    /**
     * Get current defaults from schema
     * @returns {Object} Default settings
     */
    getDefaults() {
      return getDefaults(schema);
    }
  };
}

/**
 * Validate schema structure
 * @param {Object} schema
 * @throws {Error} If schema is invalid
 */
function validateSchema(schema) {
  if (!schema.version || typeof schema.version !== 'number') {
    throw new Error('[SettingsManager] Schema must have a numeric version');
  }

  if (!schema.defaults || typeof schema.defaults !== 'object') {
    throw new Error('[SettingsManager] Schema must have a defaults object');
  }

  if (schema.validators && typeof schema.validators !== 'object') {
    throw new Error('[SettingsManager] Schema validators must be an object');
  }

  if (schema.migrations && typeof schema.migrations !== 'object') {
    throw new Error('[SettingsManager] Schema migrations must be an object');
  }
}

/**
 * Get default settings from schema
 * @param {Object} schema
 * @returns {Object} Deep copy of defaults
 */
function getDefaults(schema) {
  return JSON.parse(JSON.stringify(schema.defaults));
}

/**
 * Validate stored payload structure
 * @param {Object} payload
 * @returns {boolean}
 */
function isValidPayload(payload) {
  return (
    payload &&
    typeof payload === 'object' &&
    typeof payload.version === 'number' &&
    payload.settings &&
    typeof payload.settings === 'object'
  );
}

/**
 * Migrate settings from old version to new version
 * @param {Object} settings - Current settings
 * @param {number} fromVersion - Source version
 * @param {number} toVersion - Target version
 * @param {Object} migrations - Migration functions
 * @returns {Object} Migrated settings
 */
function migrateSettings(settings, fromVersion, toVersion, migrations) {
  if (!migrations || Object.keys(migrations).length === 0) {
    return settings;
  }

  let migratedSettings = { ...settings };

  // Apply migrations sequentially
  for (let version = fromVersion + 1; version <= toVersion; version++) {
    const migrationFn = migrations[version];
    if (typeof migrationFn === 'function') {
      try {
        migratedSettings = migrationFn(migratedSettings);
        console.log(`[SettingsManager] Migrated settings to version ${version}`);
      } catch (error) {
        console.error(`[SettingsManager] Migration to version ${version} failed:`, error);
        // Continue with current state
      }
    }
  }

  return migratedSettings;
}

/**
 * Validate settings against schema validators
 * @param {Object} settings
 * @param {Object} schema
 * @returns {Object} Validated settings
 */
function validateSettings(settings, schema) {
  if (!schema.validators) {
    return settings;
  }

  const validatedSettings = { ...settings };
  const defaults = schema.defaults;

  for (const [key, validator] of Object.entries(schema.validators)) {
    if (key in validatedSettings) {
      const value = validatedSettings[key];
      const isValid = validator(value);

      if (!isValid) {
        console.warn(`[SettingsManager] Validation failed for "${key}", using default value`);
        validatedSettings[key] = defaults[key];
      }
    }
  }

  return validatedSettings;
}

/**
 * Sanitize settings by removing unknown keys
 * @param {Object} settings
 * @param {Object} schema
 * @returns {Object} Sanitized settings
 */
function sanitizeSettings(settings, schema) {
  const sanitized = {};
  const allowedKeys = Object.keys(schema.defaults);

  for (const key of allowedKeys) {
    if (key in settings) {
      sanitized[key] = settings[key];
    }
  }

  // Log removed keys
  const removedKeys = Object.keys(settings).filter(key => !allowedKeys.includes(key));
  if (removedKeys.length > 0) {
    console.warn('[SettingsManager] Removed unknown keys:', removedKeys);
  }

  return sanitized;
}

/**
 * Merge settings with defaults to ensure all keys exist
 * @param {Object} settings
 * @param {Object} schema
 * @returns {Object} Complete settings
 */
function mergeWithDefaults(settings, schema) {
  const defaults = getDefaults(schema);
  return { ...defaults, ...settings };
}
