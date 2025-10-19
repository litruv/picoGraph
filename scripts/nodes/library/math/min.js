import { createNodeModule } from "../../nodeTypes.js";

/**
 * Returns the minimum of two values using min.
 */
export const mathMinNode = createNodeModule(
  {
    id: "math_min",
    title: "Min",
    category: "Math",
    description: "Return the lesser of two numeric values.",
    searchTags: ["min", "minimum", "math", "compare"],
    inputs: [
      { id: "a", name: "A", direction: "input", kind: "number" },
      { id: "b", name: "B", direction: "input", kind: "number" },
    ],
    outputs: [
      { id: "value", name: "Result", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const a = resolveValueInput("a", "0");
      const b = resolveValueInput("b", "0");
      return `min(${a}, ${b})`;
    },
  }
);
