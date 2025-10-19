import { createNodeModule } from "../../nodeTypes.js";

/**
 * Generates random numbers using rnd.
 */
export const mathRndNode = createNodeModule(
  {
    id: "math_rnd",
    title: "Random",
    category: "Math",
    description: "Return a random number in the range [0, x).",
    searchTags: ["rnd", "random", "math"],
    inputs: [{ id: "value", name: "Range", direction: "input", kind: "number" }],
    outputs: [
      { id: "result", name: "Result", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const value = resolveValueInput("value", "1");
      return `rnd(${value})`;
    },
  }
);
