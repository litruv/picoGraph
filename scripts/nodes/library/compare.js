import { createNodeModule } from "../nodeTypes.js";

/**
 * Compares two values using a selected operator.
 */
export const compareNode = createNodeModule(
  {
    id: "compare",
    title: "Compare",
    category: "Logic",
    description: "Compare two values with a selected operator.",
    searchTags: ["compare", "logic", "condition", "branch"],
    inputs: [
      { id: "a", name: "A", direction: "input", kind: "any" },
      { id: "b", name: "B", direction: "input", kind: "any" },
    ],
    outputs: [
      { id: "res", name: "Result", direction: "output", kind: "boolean" },
    ],
    properties: [
      {
        key: "operator",
        label: "Operator",
        type: "enum",
        defaultValue: "==",
        options: [
          { label: "Equal", value: "==" },
          { label: "Not Equal", value: "!=" },
          { label: "Greater", value: ">" },
          { label: "Less", value: "<" },
          { label: "Greater Or Equal", value: ">=" },
          { label: "Less Or Equal", value: "<=" },
        ],
      },
    ],
  },
  {
    evaluateValue: ({ node, resolveValueInput, sanitizeOperator }) => {
      const a = resolveValueInput("a", "0");
      const b = resolveValueInput("b", "0");
      const operator = sanitizeOperator(
        String(node.properties.operator ?? "==")
      );
      return `(${a}) ${operator} (${b})`;
    },
  }
);
