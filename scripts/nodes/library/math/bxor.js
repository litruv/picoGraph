import { createNodeModule } from "../../nodeTypes.js";

/**
 * Performs bitwise exclusive-or using bxor.
 */
export const mathBxorNode = createNodeModule(
  {
    id: "math_bxor",
    title: "Bitwise XOR",
    category: "Math",
    description: "Return bits set in exactly one operand using BXOR().",
    searchTags: ["bxor", "bitwise", "xor", "math"],
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
      return `bxor(${a}, ${b})`;
    },
  }
);
