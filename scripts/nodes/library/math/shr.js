import { createNodeModule } from "../../nodeTypes.js";

/**
 * Performs an arithmetic right bit shift using shr.
 */
export const mathShrNode = createNodeModule(
  {
    id: "math_shr",
    title: "Shift Right",
    category: "Math",
    description: "Shift bits right while extending the sign bit.",
    searchTags: ["shr", "shift", "bitwise", "math"],
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
      return `shr(${value}, ${amount})`;
    },
  }
);
