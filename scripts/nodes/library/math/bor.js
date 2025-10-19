import { createNodeModule } from "../../nodeTypes.js";

/**
 * Performs bitwise or using bor.
 */
export const mathBorNode = createNodeModule(
  {
    id: "math_bor",
    title: "Bitwise OR",
    category: "Math",
    description: "Return bits set in either operand using BOR().",
    searchTags: ["bor", "bitwise", "or", "math"],
    inputs: [
      { id: "a", name: "A", direction: "input", kind: "number" },
      { id: "b", name: "B", direction: "input", kind: "number" },
    ],
    outputs: [
      { id: "result", name: "Result", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const a = resolveValueInput("a", "0");
      const b = resolveValueInput("b", "0");
      return `bor(${a}, ${b})`;
    },
  }
);
