/**
 * @typedef {import('./LuaLiteralTypes.js').LuaLiteralHandler} LuaLiteralHandler
 */

/** @type {LuaLiteralHandler} */
export const LuaLiteralString = {
  /**
   * @param {unknown} value
   * @returns {string}
   */
  format(value) {
    return JSON.stringify(String(value ?? ""));
  },

  /** @returns {string} */
  defaultLiteral() {
    return '""';
  },

  spawnableByDefault: true,

  nodeModule: {
    definition: {
      id: "string_literal",
      title: "String",
      category: "Values",
      description: "Constant string literal.",
      searchTags: ["string", "literal", "text", "value"],
      inputs: [],
      outputs: [{ id: "value", name: "Value", direction: "output", kind: "string" }],
      properties: [{ key: "value", label: "Text", type: "string", defaultValue: "hello" }],
    },
    behavior: {
      evaluateValue: ({ node, formatLiteral }) =>
        formatLiteral("string", node.properties.value ?? ""),
    },
  },
};
