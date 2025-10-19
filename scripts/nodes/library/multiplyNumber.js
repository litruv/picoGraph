import { createNodeModule } from "../nodeTypes.js";

/**
 * Multiplies two numeric values.
 */
export const multiplyNumberNode = createNodeModule(
  {
    id: "multiply_number",
    title: "Multiply",
    category: "Math",
    description: "Multiply two numbers.",
    searchTags: ["multiply", "product", "math", "number"],
    inputs: [
      {
        id: "a",
        name: "A",
        direction: "input",
        kind: "number",
        defaultValue: 1,
      },
      {
        id: "b",
        name: "B",
        direction: "input",
        kind: "number",
        defaultValue: 1,
      },
    ],
    outputs: [
      { id: "res", name: "Result", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const a = resolveValueInput("a", "1");
      const b = resolveValueInput("b", "1");
      return `(${a}) * (${b})`;
    },
  }
);
