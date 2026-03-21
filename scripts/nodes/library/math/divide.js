import { createNodeModule } from "../../nodeTypes.js";

/**
 * Divides one numeric value by another.
 */
export const mathDivideNode = createNodeModule(
  {
    id: "math_divide",
    title: "Divide",
    category: "Math",
    description: "Divide one number by another (floating point division).",
    searchTags: ["divide", "division", "math", "slash", "number", "/"],
    inputs: [
      {
        id: "a",
        name: "A",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      {
        id: "b",
        name: "B",
        direction: "input",
        kind: "number",
        defaultValue: 1,
      },
    ],
    outputs: [
      { id: "res", name: "Result", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const a = resolveValueInput("a", "0");
      const b = resolveValueInput("b", "1");
      return `(${a}) / (${b})`;
    },
  }
);
