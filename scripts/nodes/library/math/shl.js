import { createNodeModule } from "../../nodeTypes.js";

/**
 * Performs a left bit shift using shl.
 */
export const mathShlNode = createNodeModule(
  {
    id: "math_shl",
    title: "Shift Left",
    category: "Math",
    description: "Shift bits left with zeros entering from the right.",
    searchTags: ["shl", "shift", "bitwise", "math"],
    inputs: [
      { id: "value", name: "Value", direction: "input", kind: "number" },
      { id: "amount", name: "Amount", direction: "input", kind: "number" },
    ],
    outputs: [
      { id: "result", name: "Result", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const value = resolveValueInput("value", "0");
      const amount = resolveValueInput("amount", "0");
      return `shl(${value}, ${amount})`;
    },
  }
);
