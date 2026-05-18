import API from 'src/util/api';

/**
 * @typedef {object} RocLike
 * @property {(defaultPrefs?: Record<string, unknown>) => Promise<Record<string, unknown>>} getUserPrefs
 * @property {(prefs: Record<string, unknown>) => Promise<void>} setUserPrefs
 */

/**
 * @typedef {object} UserPreferencesOptions
 * @property {string} [varName='userPreferences'] - Visualizer API variable name
 * @property {Record<string, unknown>} [defaults={}] - Extra defaults merged on top of the built-in ones
 * @property {string[]} [variables] - Preference keys to expose as individual API variables. Defaults to all keys in the merged defaults
 */

/**
 * Built-in preference defaults. All keys are automatically exposed as
 * individual API variables. Add new properties here as the schema grows.
 */
const DEFAULT_PREFERENCES = {
  groupsToAppend: [],
};

/**
 * Creates and loads a UserPreferences instance.
 *
 * Loads preferences from `/db/{database}/user/_me`, exposes them as a
 * visualizer API variable, binds each preference key as a separate API
 * variable, and auto-saves back to CouchDB whenever the variable changes.
 *
 * @param {RocLike} roc - Roc instance connected to the CouchDB database
 * @param {UserPreferencesOptions} [options]
 * @returns {Promise<UserPreferences>}
 *
 * @example
 * import { createUserPreferences } from '../rest-on-couch/UserPreferences';
 * const prefs = await createUserPreferences(roc);
 */
export async function createUserPreferences(roc, options = {}) {
  const instance = new UserPreferences(roc, options);
  await instance._load();
  return instance;
}

class UserPreferences {
  /**
   * @param {RocLike} roc
   * @param {UserPreferencesOptions} [options]
   */
  constructor(roc, options = {}) {
    this.roc = roc;
    this.varName = options.varName ?? 'userPreferences';
    this.defaults = { ...DEFAULT_PREFERENCES, ...options.defaults };
    this.variables = options.variables ?? Object.keys(this.defaults);
  }

  async _load() {
    const stored = (await this.roc.getUserPrefs()) || {};

    for (const [key, value] of Object.entries(this.defaults)) {
      if (stored[key] === undefined) {
        stored[key] = JSON.parse(JSON.stringify(value));
      }
    }

    await API.createData(this.varName, stored);
    const prefsVar = API.getVar(this.varName);

    for (const key of this.variables) {
      API.setVariable(key, prefsVar, [key]);
    }
  }

  /**
   * Returns the current value of a preference key from the live API data.
   * @param {string} key
   * @returns {unknown}
   */
  get(key) {
    const data = API.getData(this.varName);
    return data ? data[key] : undefined;
  }

  /**
   * Returns the current list of groups to append for the logged-in user.
   * @returns {string[]}
   */
  getGroupsToAppend() {
    return /** @type {string[]} */ (this.get('groupsToAppend') ?? []);
  }

  /**
   * Saves current preferences to CouchDB.
   * @returns {Promise<void>}
   */
  async save() {
    const data = API.getData(this.varName);
    if (data) {
      await this.roc.setUserPrefs(JSON.parse(JSON.stringify(data)));
    }
  }
}
