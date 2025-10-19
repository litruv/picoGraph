import { createNodeModule } from "../nodeTypes.js";

/**
 * Adds two numeric values.
 */
export const addNumberNode = createNodeModule(
  {
    id: "add_number",
    title: "Add",
    category: "Math",
    description: "Add two numbers.",
    searchTags: ["add", "math", "sum", "number"],
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
        defaultValue: 0,
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
      const b = resolveValueInput("b", "0");
      return `(${a}) + (${b})`;
    },
  }
);
