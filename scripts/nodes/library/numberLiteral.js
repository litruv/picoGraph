import { createNodeModule } from "../nodeTypes.js";

/**
 * Constant numeric literal.
 */
export const numberLiteralNode = createNodeModule(
  {
    id: "number_literal",
    title: "Number",
    category: "Values",
    description: "Constant numeric literal.",
    searchTags: ["number", "literal", "constant", "value"],
    inputs: [],
    outputs: [
      { id: "value", name: "Value", direction: "output", kind: "number" },
    ],
    properties: [
      { key: "value", label: "Number", type: "number", defaultValue: 0 },
    ],
  },
  {
    evaluateValue: ({ node, formatLiteral }) => {
      return formatLiteral("number", node.properties.value ?? 0);
    },
  }
);
