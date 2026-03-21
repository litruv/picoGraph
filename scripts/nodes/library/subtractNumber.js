import { createNodeModule } from "../nodeTypes.js";

/**
 * Subtracts one numeric value from another.
 */
export const subtractNumberNode = createNodeModule(
  {
    id: "subtract_number",
    title: "Subtract",
    category: "Math",
    description: "Subtract one number from another.",
    searchTags: ["subtract", "math", "minus", "difference", "number"],
    inputs: [
      {
        id: "a",
        name: "A",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      {
        id: "b",
        name: "B",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
    ],
    outputs: [
      { id: "res", name: "Result", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const a = resolveValueInput("a", "0");
      const b = resolveValueInput("b", "0");
      return `(${a}) - (${b})`;
    },
  }
);
