import { createNodeModule } from "../../nodeTypes.js";

/**
 * Returns the maximum of two values using max.
 */
export const mathMaxNode = createNodeModule(
  {
    id: "math_max",
    title: "Max",
    category: "Math",
    description: "Return the greater of two numeric values.",
    searchTags: ["max", "maximum", "math", "compare"],
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
      return `max(${a}, ${b})`;
    },
  }
);
