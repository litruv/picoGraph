import { createNodeModule } from "../../nodeTypes.js";

/**
 * Returns the median of three values using mid.
 */
export const mathMidNode = createNodeModule(
  {
    id: "math_mid",
    title: "Mid",
    category: "Math",
    description: "Return the middle value from three numeric inputs.",
    searchTags: ["mid", "median", "math", "compare"],
    inputs: [
      { id: "a", name: "A", direction: "input", kind: "number" },
      { id: "b", name: "B", direction: "input", kind: "number" },
      { id: "c", name: "C", direction: "input", kind: "number" },
    ],
    outputs: [
      { id: "value", name: "Result", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const a = resolveValueInput("a", "0");
      const b = resolveValueInput("b", "0");
      const c = resolveValueInput("c", "0");
      return `mid(${a}, ${b}, ${c})`;
    },
  }
);
