import { createNodeModule } from "../nodeTypes.js";

/**
 * Constant boolean literal.
 */
export const booleanLiteralNode = createNodeModule(
  {
    id: "boolean_literal",
    title: "Boolean",
    category: "Values",
    description: "Constant boolean literal.",
    searchTags: ["boolean", "literal", "true", "false"],
    inputs: [],
    outputs: [
      { id: "value", name: "Value", direction: "output", kind: "boolean" },
    ],
    properties: [
      { key: "value", label: "Value", type: "boolean", defaultValue: true },
    ],
  },
  {
    evaluateValue: ({ node, formatLiteral }) => {
      return formatLiteral("boolean", node.properties.value ?? true);
    },
  }
);
