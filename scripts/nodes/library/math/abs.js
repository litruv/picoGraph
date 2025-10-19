import { createNodeModule } from "../../nodeTypes.js";

/**
 * Computes the absolute value using abs.
 */
export const mathAbsNode = createNodeModule(
  {
    id: "math_abs",
    title: "Abs",
    category: "Math",
    description: "Return the absolute value of a number.",
    searchTags: ["abs", "absolute", "math"],
    inputs: [{ id: "value", name: "Value", direction: "input", kind: "number" }],
    outputs: [
      { id: "result", name: "Result", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const value = resolveValueInput("value", "0");
      return `abs(${value})`;
    },
  }
);
