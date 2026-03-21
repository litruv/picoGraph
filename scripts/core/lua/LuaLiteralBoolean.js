/**
 * @typedef {import('./LuaLiteralTypes.js').LuaLiteralHandler} LuaLiteralHandler
 */

/** @type {LuaLiteralHandler} */
export const LuaLiteralBoolean = {
  /**
   * @param {unknown} value
   * @returns {string}
   */
  format(value) {
    if (typeof value === "string") {
      return value === "false" ? "false" : "true";
    }
    return value ? "true" : "false";
  },

  /** @returns {string} */
  defaultLiteral() {
    return "false";
  },

  spawnableByDefault: true,

  nodeModule: {
    definition: {
      id: "boolean_literal",
      title: "Boolean",
      category: "Values",
      description: "Constant boolean literal.",
      searchTags: ["boolean", "literal", "true", "false"],
      inputs: [],
      outputs: [{ id: "value", name: "Value", direction: "output", kind: "boolean" }],
      properties: [{ key: "value", label: "Value", type: "boolean", defaultValue: true }],
    },
    behavior: {
      evaluateValue: ({ node, formatLiteral }) =>
        formatLiteral("boolean", node.properties.value ?? true),
    },
  },
};
