import { createNodeModule } from "../../nodeTypes.js";

/**
 * Computes a square root using sqrt.
 */
export const mathSqrtNode = createNodeModule(
  {
    id: "math_sqrt",
    title: "Sqrt",
    category: "Math",
    description: "Return the square root of a numeric value.",
    searchTags: ["sqrt", "square root", "math"],
    inputs: [{ id: "value", name: "Value", direction: "input", kind: "number" }],
    outputs: [
      { id: "result", name: "Result", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const value = resolveValueInput("value", "0");
      return `sqrt(${value})`;
    },
  }
);
