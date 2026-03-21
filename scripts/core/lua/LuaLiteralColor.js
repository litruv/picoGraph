/**
 * @typedef {import('./LuaLiteralTypes.js').LuaLiteralHandler} LuaLiteralHandler
 */

/** @type {LuaLiteralHandler} */
export const LuaLiteralColor = {
  /**
   * @param {unknown} value
   * @returns {string}
   */
  format(value) {
    const n = Math.max(0, Math.min(15, Math.floor(Number(value) || 0)));
    return String(n);
  },

  /** @returns {string} */
  defaultLiteral() {
    return "7";
  },

  spawnableByDefault: true,

  nodeModule: {
    definition: {
      id: "color_literal",
      title: "Color",
      category: "Values",
      description: "Constant color literal (0-15).",
      searchTags: ["color", "literal", "constant", "value"],
      inputs: [],
      outputs: [{ id: "value", name: "Value", direction: "output", kind: "color" }],
      properties: [{ key: "value", label: "Color", type: "number", defaultValue: 7 }],
    },
    behavior: {
      evaluateValue: ({ node, formatLiteral }) =>
        formatLiteral("color", node.properties.value ?? 7),
    },
  },
};
