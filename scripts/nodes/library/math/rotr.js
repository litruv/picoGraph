import { createNodeModule } from "../../nodeTypes.js";

/**
 * Performs a right bit rotation using rotr.
 */
export const mathRotrNode = createNodeModule(
  {
    id: "math_rotr",
    title: "Rotate Right",
    category: "Math",
    description: "Rotate bits right by a given amount.",
    searchTags: ["rotr", "rotate", "bitwise", "math"],
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
      return `rotr(${value}, ${amount})`;
    },
  }
);
