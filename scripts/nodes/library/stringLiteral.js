import { createNodeModule } from "../nodeTypes.js";

/**
 * Constant string literal.
 */
export const stringLiteralNode = createNodeModule(
  {
    id: "string_literal",
    title: "String",
    category: "Values",
    description: "Constant string literal.",
    searchTags: ["string", "literal", "text", "value"],
    inputs: [],
    outputs: [
      { id: "value", name: "Value", direction: "output", kind: "string" },
    ],
    properties: [
      { key: "value", label: "Text", type: "string", defaultValue: "hello" },
    ],
  },
  {
    evaluateValue: ({ node, formatLiteral }) => {
      return formatLiteral("string", node.properties.value ?? "");
    },
  }
);
