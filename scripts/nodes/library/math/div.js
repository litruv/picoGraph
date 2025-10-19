import { createNodeModule } from "../../nodeTypes.js";

/**
 * Performs integer division using the floor operation.
 */
export const mathDivNode = createNodeModule(
  {
    id: "math_div",
    title: "Integer Divide",
    category: "Math",
    description: "Return the floored quotient of two numbers (A \\ B).",
    searchTags: ["div", "integer", "divide", "math"],
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
      const b = resolveValueInput("b", "1");
      return `(${a}) \\ (${b})`;
    },
  }
);
