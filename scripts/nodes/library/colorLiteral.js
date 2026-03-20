import { createNodeModule } from "../nodeTypes.js";

/**
 * Constant color literal.
 */
export const colorLiteralNode = createNodeModule(
  {
    id: "color_literal",
    title: "Color",
    category: "Values",
    description: "Constant color literal (0-15).",
    searchTags: ["color", "literal", "constant", "value"],
    inputs: [],
    outputs: [
      { id: "value", name: "Value", direction: "output", kind: "color" },
    ],
    properties: [
      { key: "value", label: "Color", type: "number", defaultValue: 7 },
    ],
  },
  {
    evaluateValue: ({ node, formatLiteral }) => {
      return formatLiteral("number", node.properties.value ?? 7);
    },
  }
);
