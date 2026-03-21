import { createNodeModule } from "../../nodeTypes.js";

/**
 * Multiplies two numeric values.
 */
export const mathMultiplyNode = createNodeModule(
  {
    id: "math_multiply",
    title: "Multiply",
    category: "Math",
    description: "Multiply two numbers.",
    searchTags: ["multiply", "product", "math", "times", "*"],
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
      return `(${a}) * (${b})`;
    },
  }
);
