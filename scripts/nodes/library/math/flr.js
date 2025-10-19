import { createNodeModule } from "../../nodeTypes.js";

/**
 * Floors a numeric value using flr.
 */
export const mathFlrNode = createNodeModule(
  {
    id: "math_flr",
    title: "Floor",
    category: "Math",
    description: "Round a value down to the nearest integer.",
    searchTags: ["flr", "floor", "math", "round"],
    inputs: [{ id: "value", name: "Value", direction: "input", kind: "number" }],
    outputs: [
      { id: "result", name: "Result", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const value = resolveValueInput("value", "0");
      return `flr(${value})`;
    },
  }
);
