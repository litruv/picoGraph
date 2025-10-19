import { createNodeModule } from "../../nodeTypes.js";

/**
 * Performs bitwise not using bnot.
 */
export const mathBnotNode = createNodeModule(
  {
    id: "math_bnot",
    title: "Bitwise NOT",
    category: "Math",
    description: "Invert every bit in a value using BNOT().",
    searchTags: ["bnot", "bitwise", "not", "math"],
    inputs: [{ id: "value", name: "Value", direction: "input", kind: "number" }],
    outputs: [
      { id: "result", name: "Result", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const value = resolveValueInput("value", "0");
      return `bnot(${value})`;
    },
  }
);
