import { createNodeModule } from "../../nodeTypes.js";

/**
 * Computes the cosine of a value using cos.
 */
export const mathCosNode = createNodeModule(
  {
    id: "math_cos",
    title: "Cos",
    category: "Math",
    description:
      "Return the cosine of an angle where 1.0 represents a full turn.",
    searchTags: ["cos", "cosine", "math", "trig"],
    inputs: [{ id: "value", name: "Value", direction: "input", kind: "number" }],
    outputs: [
      { id: "result", name: "Result", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const value = resolveValueInput("value", "0");
      return `cos(${value})`;
    },
  }
);
