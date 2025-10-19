import { createNodeModule } from "../../nodeTypes.js";

/**
 * Performs bitwise and using band.
 */
export const mathBandNode = createNodeModule(
  {
    id: "math_band",
    title: "Bitwise AND",
    category: "Math",
    description: "Return bits set in both operands using BAND().",
    searchTags: ["band", "bitwise", "and", "math"],
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
      return `band(${a}, ${b})`;
    },
  }
);
