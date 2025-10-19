import { createNodeModule } from "../../nodeTypes.js";

/**
 * Computes the sine of a value using sin.
 */
export const mathSinNode = createNodeModule(
  {
    id: "math_sin",
    title: "Sin",
    category: "Math",
    description:
      "Return the sine of an angle where 1.0 represents a full turn.",
    searchTags: ["sin", "sine", "math", "trig"],
    inputs: [{ id: "value", name: "Value", direction: "input", kind: "number" }],
    outputs: [
      { id: "result", name: "Result", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const value = resolveValueInput("value", "0");
      return `sin(${value})`;
    },
  }
);
