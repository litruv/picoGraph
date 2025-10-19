import { createNodeModule } from "../../nodeTypes.js";

/**
 * Performs a logical right bit shift using lshr.
 */
export const mathLshrNode = createNodeModule(
  {
    id: "math_lshr",
    title: "Logical Shift Right",
    category: "Math",
    description: "Shift bits right with zeros entering from the left.",
    searchTags: ["lshr", "shift", "bitwise", "math"],
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
      return `lshr(${value}, ${amount})`;
    },
  }
);
