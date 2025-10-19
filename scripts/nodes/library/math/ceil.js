import { createNodeModule } from "../../nodeTypes.js";

/**
 * Ceils a numeric value using ceil.
 */
export const mathCeilNode = createNodeModule(
  {
    id: "math_ceil",
    title: "Ceil",
    category: "Math",
    description: "Round a value up to the nearest integer.",
    searchTags: ["ceil", "ceiling", "math", "round"],
    inputs: [{ id: "value", name: "Value", direction: "input", kind: "number" }],
    outputs: [
      { id: "result", name: "Result", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const value = resolveValueInput("value", "0");
      return `ceil(${value})`;
    },
  }
);
