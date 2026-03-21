/**
 * @typedef {import('./LuaLiteralTypes.js').LuaLiteralHandler} LuaLiteralHandler
 */

/** @type {LuaLiteralHandler} */
export const LuaLiteralTable = {
  /**
   * @param {unknown} value
   * @returns {string}
   */
  format(value) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : "{}";
    }
    return "{}";
  },

  /** @returns {string} */
  defaultLiteral() {
    return "{}";
  },

  spawnableByDefault: false,

  nodeModule: null,
};
