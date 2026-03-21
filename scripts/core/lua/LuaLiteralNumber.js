/**
 * @typedef {import('./LuaLiteralTypes.js').LuaLiteralHandler} LuaLiteralHandler
 */

/** @type {LuaLiteralHandler} */
export const LuaLiteralNumber = {
  /**
   * @param {unknown} value
   * @returns {string}
   */
  format(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? String(numeric) : "0";
  },

  /** @returns {string} */
  defaultLiteral() {
    return "0";
  },

  spawnableByDefault: true,

  nodeModule: {
    definition: {
      id: "number_literal",
      title: "Number",
      category: "Values",
      description: "Constant numeric literal.",
      searchTags: ["number", "literal", "constant", "value"],
      inputs: [],
      outputs: [{ id: "value", name: "Value", direction: "output", kind: "number" }],
      properties: [{ key: "value", label: "Number", type: "number", defaultValue: 0 }],
    },
    behavior: {
      evaluateValue: ({ node, formatLiteral }) =>
        formatLiteral("number", node.properties.value ?? 0),
    },
  },
};
