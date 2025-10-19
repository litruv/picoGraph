import { createNodeModule } from "../../nodeTypes.js";

/**
 * Performs a left bit rotation using rotl.
 */
export const mathRotlNode = createNodeModule(
  {
    id: "math_rotl",
    title: "Rotate Left",
    category: "Math",
    description: "Rotate bits left by a given amount.",
    searchTags: ["rotl", "rotate", "bitwise", "math"],
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
      return `rotl(${value}, ${amount})`;
    },
  }
);
